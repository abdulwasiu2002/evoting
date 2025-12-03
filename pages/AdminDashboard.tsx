
import React, { useEffect, useState } from 'react';
import { User, Candidate, AuditLog, Vote, ElectionSettings, Position, Aspirant } from '../types';
import { db } from '../services/mockDb';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { isSupabaseConfigured } from '../services/supabaseClient';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'aspirants' | 'results' | 'analytics' | 'candidates' | 'positions' | 'departments' | 'audit' | 'settings'>('pending');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [aspirants, setAspirants] = useState<Aspirant[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{name: string, count: number}[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Real-time Activity Feed State
  const [liveActivity, setLiveActivity] = useState<{id: string, message: string, time: string}[]>([]);

  // Candidate Management State
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState<Partial<Candidate>>({});
  const [candidatePhotoPreview, setCandidatePhotoPreview] = useState<string | null>(null);

  // Position Management State
  const [newPosition, setNewPosition] = useState('');

  // Department Management State
  const [newDepartment, setNewDepartment] = useState('');

  // Verification Modal State
  const [verifyingUser, setVerifyingUser] = useState<User | null>(null);
  const [reviewingAspirant, setReviewingAspirant] = useState<Aspirant | null>(null);

  // Settings State
  const [settings, setSettings] = useState<ElectionSettings>({
      startDate: '',
      endDate: '',
      isVotingEnabled: false
  });

  // DB Connection State
  const [dbMode, setDbMode] = useState(isSupabaseConfigured() ? 'remote' : 'local');
  const [apiUrl, setApiUrl] = useState('');

  const fetchPending = async () => {
    const users = await db.getPendingUsers();
    setPendingUsers(users);
  };

  const fetchAspirants = async () => {
    const asps = await db.getAspirants();
    setAspirants(asps.filter(a => a.status === 'pending'));
  };

  const fetchCandidates = async () => {
    const cands = await db.getCandidates();
    setCandidates(cands);
    return cands;
  };

  const fetchPositions = async () => {
    const pos = await db.getPositions();
    setPositions(pos);
  };

  const fetchDepartments = async () => {
    const depts = await db.getDepartments();
    setDepartments(depts);
  };

  const fetchResults = async () => {
    const [res, cands] = await Promise.all([db.getResults(), fetchCandidates()]);
    
    // Merge votes with candidate names for chart
    const chartData = cands.map(c => {
        const votes = res.find(r => r.candidateId === c.id);
        return {
            name: c.name,
            position: c.position,
            votes: votes ? votes.count : 0
        };
    });
    setResults(chartData);
    return chartData;
  };

  const fetchDepartmentStats = async () => {
      const stats = await db.getDepartmentStats();
      setDepartmentStats(stats);
  }

  const fetchAudit = async () => {
      const audit = await db.getAuditLogs('admin-1');
      setLogs(audit);
  }

  const fetchSettings = async () => {
      const s = await db.getElectionSettings();
      setSettings(s);
  }

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPending();
      const unsubscribe = db.subscribe('user_update', () => {
        fetchPending();
      });
      return unsubscribe;
    }

    if (activeTab === 'aspirants') {
        fetchAspirants();
    }
    
    if (activeTab === 'results') {
      fetchResults();
      const unsubscribe = db.connectToLiveUpdates('vote_update', (data: Vote | null) => {
        fetchResults(); 

        const time = new Date().toLocaleTimeString();
        let message = "Vote count updated";
        if (data && data.position) {
            message = `New vote cast for ${data.position}`;
        } else if (data === null) {
            message = "Incoming vote detected (synced)";
        }

        setLiveActivity(prev => [
            { id: Date.now().toString() + Math.random(), message, time }, 
            ...prev
        ].slice(1, 16)); 
      });
      return unsubscribe;
    }

    if (activeTab === 'analytics') {
        fetchResults();
        fetchDepartmentStats();
    }

    if (activeTab === 'candidates') {
      fetchCandidates();
      fetchPositions(); 
      fetchDepartments(); 
    }

    if (activeTab === 'positions') {
      fetchPositions();
    }

    if (activeTab === 'departments') {
      fetchDepartments();
    }
    
    if (activeTab === 'audit') fetchAudit();
    
    if (activeTab === 'settings') fetchSettings();

  }, [activeTab]);

  const handleApproval = async (userId: string, approve: boolean) => {
    const reason = !approve ? prompt("Reason for rejection?") : undefined;
    if (!approve && reason === null) return; 
    if (!approve && !reason) return; 

    await db.processRegistration('admin-1', userId, approve, reason || undefined);
    setVerifyingUser(null);
    fetchPending(); 
  };

  const handleAspirantApproval = async (aspirantId: string, approve: boolean) => {
      if (confirm(approve ? "Approve this aspirant? They will immediately become a candidate visible to voters." : "Reject this application?")) {
          try {
              await db.processAspirant('admin-1', aspirantId, approve);
              setReviewingAspirant(null);
              fetchAspirants();
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const openAddCandidate = () => {
    setCandidateForm({
      name: '',
      matricNo: '',
      department: departments[0] || '',
      position: positions[0] || '',
      manifesto: '',
      photoUrl: ''
    });
    setCandidatePhotoPreview(null);
    setIsEditingCandidate(false);
    setIsCandidateModalOpen(true);
  };

  const openEditCandidate = (candidate: Candidate) => {
    setCandidateForm({ ...candidate });
    setCandidatePhotoPreview(candidate.photoUrl);
    setIsEditingCandidate(true);
    setIsCandidateModalOpen(true);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setCandidateForm(prev => ({ ...prev, photoUrl: base64String }));
              setCandidatePhotoPreview(base64String);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const finalForm = {
        ...candidateForm,
        photoUrl: candidateForm.photoUrl || 'https://via.placeholder.com/200?text=No+Photo'
    };
    try {
      if (isEditingCandidate && finalForm.id) {
        await db.updateCandidate('admin-1', finalForm as Candidate);
      } else {
        await db.addCandidate('admin-1', finalForm as Omit<Candidate, 'id'>);
      }
      setIsCandidateModalOpen(false);
      fetchCandidates();
    } catch (err: any) {
      alert("Error saving candidate: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this candidate? This cannot be undone.")) {
      await db.removeCandidate('admin-1', id);
      fetchCandidates();
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition.trim()) return;
    try {
      await db.addPosition('admin-1', newPosition.trim());
      setNewPosition('');
      fetchPositions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemovePosition = async (name: string) => {
    if (window.confirm(`Delete position "${name}"? This won't delete existing candidates but might affect display.`)) {
      await db.removePosition('admin-1', name);
      fetchPositions();
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    try {
      await db.addDepartment('admin-1', newDepartment.trim());
      setNewDepartment('');
      fetchDepartments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveDepartment = async (name: string) => {
    if (window.confirm(`Delete department "${name}"?`)) {
      await db.removeDepartment('admin-1', name);
      fetchDepartments();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await db.updateElectionSettings('admin-1', settings);
          alert("Election settings updated successfully.");
      } catch (err: any) {
          alert("Error updating settings: " + err.message);
      } finally {
          setLoading(false);
      }
  }

  // --- Analytics & Export Functions ---
  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.text("NACOSS E-Voting Election Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    // Add Stats
    const totalVotes = results.reduce((acc, curr) => acc + curr.votes, 0);
    const totalRegistered = departmentStats.reduce((acc, curr) => acc + curr.count, 0);
    doc.text(`Total Registered Students: ${totalRegistered}`, 14, 40);
    doc.text(`Total Votes Cast: ${totalVotes}`, 14, 46);

    // Results Table
    const tableColumn = ["Candidate", "Position", "Votes"];
    const tableRows: any[] = [];
    results.forEach(item => {
        tableRows.push([item.name, item.position, item.votes]);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 55,
    });

    doc.save("election_report.pdf");
  };

  const exportExcelCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Candidate,Position,Votes\n";
    results.forEach(row => {
        csvContent += `${row.name},${row.position},${row.votes}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "election_results.csv");
    document.body.appendChild(link);
    link.click();
  };

  const totalVotes = results.reduce((acc, curr) => acc + curr.votes, 0);
  const totalRegistered = departmentStats.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">NACOSS Admin Console</h1>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-emerald-400">Admin Access</span>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {['pending', 'aspirants', 'results', 'analytics', 'candidates', 'positions', 'departments', 'audit', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab} {tab === 'pending' && pendingUsers.length > 0 && `(${pendingUsers.length})`}
              {tab === 'aspirants' && aspirants.length > 0 && `(${aspirants.length})`}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'pending' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {pendingUsers.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No pending registrations.</div>
          ) : (
          <ul className="divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <li key={user.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group relative" onClick={() => setVerifyingUser(user)}>
                        {user.idCardUrl ? <img src={user.idCardUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs">No ID</div>}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center text-transparent group-hover:text-white text-xs font-bold">View</div>
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-medium text-emerald-600 truncate">{user.fullName}</p>
                      <p className="text-sm text-gray-500">Matric: {user.matricNo} • {user.department}</p>
                      <p className="text-xs text-gray-400">Registered: {new Date(user.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="primary" onClick={() => setVerifyingUser(user)}>Review Application</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      {activeTab === 'aspirants' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {aspirants.length === 0 ? <div className="p-8 text-center text-gray-500">No pending aspirant applications.</div> : (
                <ul className="divide-y divide-gray-200">
                    {aspirants.map(asp => (
                         <li key={asp.id} className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                     <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                         <img src={asp.passportUrl} className="h-full w-full object-cover" />
                                     </div>
                                     <div>
                                         <p className="text-lg font-medium text-purple-600">{asp.fullName} <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">CGPA: {asp.cgpa}</span></p>
                                         <p className="text-sm text-gray-600">Contesting for: <strong>{asp.position}</strong></p>
                                         <p className="text-xs text-gray-500">{asp.level} Level • {asp.department}</p>
                                     </div>
                                </div>
                                <Button size="sm" onClick={() => setReviewingAspirant(asp)}>Review & Approve</Button>
                            </div>
                         </li>
                    ))}
                </ul>
            )}
        </div>
      )}

      {activeTab === 'results' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-3/4 bg-white p-6 rounded shadow">
                 <div className="bg-emerald-50 border border-emerald-100 rounded p-4 mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-emerald-800 uppercase font-bold tracking-wide">Total Votes Cast</p>
                        <p className="text-4xl font-extrabold text-emerald-900">{totalVotes}</p>
                    </div>
                    <div className="h-10 w-10 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                 </div>

                 <h2 className="text-lg font-medium text-gray-900 mb-4">Live Vote Count</h2>
                 <div className="h-96 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={results} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="votes" fill="#10B981" name="Votes" />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>
            
            <div className="lg:w-1/4 bg-white p-6 rounded shadow h-fit">
                <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                    <span className="h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                    Live Activity Feed
                </h3>
                <ul className="space-y-3 max-h-[500px] overflow-y-auto">
                    {liveActivity.map((log) => (
                        <li key={log.id} className="text-xs border-b border-gray-100 pb-2">
                            <span className="text-gray-400 block mb-1">{log.time}</span>
                            <span className="text-gray-700">{log.message}</span>
                        </li>
                    ))}
                    {liveActivity.length === 0 && <li className="text-xs text-gray-400 italic">Waiting for new votes...</li>}
                </ul>
            </div>
          </div>
      )}

      {activeTab === 'analytics' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                      <p className="text-sm text-gray-500 uppercase font-bold">Total Registered Students</p>
                      <p className="text-3xl font-bold text-gray-800">{totalRegistered}</p>
                  </div>
                  <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                      <p className="text-sm text-gray-500 uppercase font-bold">Total Votes Cast</p>
                      <p className="text-3xl font-bold text-gray-800">{totalVotes}</p>
                  </div>
                  <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500">
                      <p className="text-sm text-gray-500 uppercase font-bold">Voter Turnout</p>
                      <p className="text-3xl font-bold text-gray-800">
                          {totalRegistered > 0 ? Math.round((totalVotes / (totalRegistered * positions.length || 1)) * 100) : 0}%
                      </p>
                  </div>
              </div>

              <div className="flex gap-4">
                  <Button onClick={generatePDFReport} className="bg-red-600 hover:bg-red-700">
                      Download Official Report (PDF)
                  </Button>
                  <Button variant="outline" onClick={exportExcelCSV}>
                      Export Raw Data (CSV)
                  </Button>
              </div>

              <div className="bg-white p-6 rounded shadow">
                  <h3 className="text-lg font-bold mb-4">Registrations by Department</h3>
                  <div className="h-80 min-w-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={departmentStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis dataKey="name" type="category" width={150} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#6366F1" name="Students" />
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'candidates' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openAddCandidate}>+ Add New Candidate</Button>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <img className="h-12 w-12 rounded-full object-cover bg-gray-200" src={candidate.photoUrl} alt="" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-emerald-600">{candidate.name}</p>
                      <p className="text-sm text-gray-500">{candidate.position} • {candidate.department}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditCandidate(candidate)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteCandidate(candidate.id)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Position</h3>
              <form onSubmit={handleAddPosition} className="flex gap-4">
                  <input 
                    type="text" 
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                    placeholder="e.g. Director of Socials"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                  />
                  <Button type="submit">Add Position</Button>
              </form>
           </div>
           
           <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                  {positions.map(pos => (
                      <li key={pos} className="p-4 flex justify-between items-center">
                          <span className="text-gray-900 font-medium">{pos}</span>
                          <Button size="sm" variant="danger" onClick={() => handleRemovePosition(pos)}>Remove</Button>
                      </li>
                  ))}
              </ul>
           </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Department</h3>
              <form onSubmit={handleAddDepartment} className="flex gap-4">
                  <input 
                    type="text" 
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                    placeholder="e.g. Information Technology"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                  />
                  <Button type="submit">Add Department</Button>
              </form>
           </div>
           
           <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                  {departments.map(dept => (
                      <li key={dept} className="p-4 flex justify-between items-center">
                          <span className="text-gray-900 font-medium">{dept}</span>
                          <Button size="sm" variant="danger" onClick={() => handleRemoveDepartment(dept)}>Remove</Button>
                      </li>
                  ))}
              </ul>
           </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
           <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                   <tr>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                   </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                   {logs.map(log => (
                       <tr key={log.id}>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                               {new Date(log.timestamp).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                               {log.actorId} <span className="text-xs text-gray-400">({log.actorRole})</span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                               {log.actionType}
                           </td>
                           <td className="px-6 py-4 text-sm text-gray-500">
                               {log.details}
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
        </div>
      )}

      {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded shadow space-y-8">
              <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Election Schedule</h3>
                  <form onSubmit={handleSaveSettings} className="space-y-4 max-w-lg">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Start Date</label>
                          <input 
                              type="date" 
                              required 
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={settings.startDate}
                              onChange={(e) => setSettings({...settings, startDate: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">End Date</label>
                          <input 
                              type="date" 
                              required 
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                              value={settings.endDate}
                              onChange={(e) => setSettings({...settings, endDate: e.target.value})}
                          />
                      </div>
                      <div className="flex items-center">
                          <input 
                              id="voting-toggle"
                              type="checkbox" 
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              checked={settings.isVotingEnabled}
                              onChange={(e) => setSettings({...settings, isVotingEnabled: e.target.checked})}
                          />
                          <label htmlFor="voting-toggle" className="ml-2 block text-sm text-gray-900 font-bold">
                              Enable Voting System (Open Polls)
                          </label>
                      </div>
                      <Button type="submit" isLoading={loading}>Save Settings</Button>
                  </form>
              </div>

              <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Database Connection</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                       <p className="text-sm text-gray-600 mb-4">
                           Configure where the data is stored.
                           <br/>
                           <span className="font-bold">Current Status:</span> {dbMode === 'local' ? 'Local Demo (Offline)' : 'Remote Server (Real API)'}
                       </p>
                       
                       <div className="flex flex-col gap-4 max-w-lg">
                           <div>
                               <label className="block text-sm font-medium text-gray-700">Data Source</label>
                               <select 
                                   className="mt-1 block w-full border border-gray-300 rounded p-2"
                                   value={dbMode}
                                   onChange={(e) => setDbMode(e.target.value)}
                               >
                                   <option value="local">Local Demo (Offline)</option>
                                   <option value="remote">Remote Server (Real API)</option>
                               </select>
                           </div>
                           
                           {dbMode === 'remote' && (
                               <div>
                                   <label className="block text-sm font-medium text-gray-700">Backend API URL</label>
                                   <input 
                                       type="url" 
                                       placeholder="https://your-flask-app.herokuapp.com/api"
                                       className="mt-1 block w-full border border-gray-300 rounded p-2"
                                       value={apiUrl}
                                       onChange={(e) => setApiUrl(e.target.value)}
                                   />
                                   <p className="text-xs text-gray-500 mt-1">Must be a valid https URL pointing to your deployed backend.</p>
                               </div>
                           )}
                           
                           <Button 
                                variant="secondary" 
                                onClick={() => {
                                    alert("To switch modes permanently, please update the 'mockDb.ts' file configuration. This UI is for demonstration of the settings panel layout.");
                                }}
                            >
                               Save & Test Connection
                           </Button>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* Candidate Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsCandidateModalOpen(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <form onSubmit={handleSaveCandidate}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">{isEditingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input required type="text" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={candidateForm.name} onChange={e => setCandidateForm({...candidateForm, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Matric No</label>
                                    <input required type="text" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={candidateForm.matricNo} onChange={e => setCandidateForm({...candidateForm, matricNo: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Department</label>
                                        <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={candidateForm.department} onChange={e => setCandidateForm({...candidateForm, department: e.target.value})}>
                                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Position</label>
                                        <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={candidateForm.position} onChange={e => setCandidateForm({...candidateForm, position: e.target.value})}>
                                            {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Manifesto</label>
                                    <textarea required rows={3} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={candidateForm.manifesto} onChange={e => setCandidateForm({...candidateForm, manifesto: e.target.value})}></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                                    <div className="flex items-center space-x-4">
                                        {candidatePhotoPreview && <img src={candidatePhotoPreview} className="h-16 w-16 rounded-full object-cover" />}
                                        <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="text-sm text-gray-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <Button type="submit" className="w-full sm:ml-3 sm:w-auto" isLoading={loading}>Save</Button>
                            <Button type="button" variant="outline" className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto" onClick={() => setIsCandidateModalOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* User Verification Modal */}
      {verifyingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setVerifyingUser(null)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
                    <div className="p-6">
                        <h3 className="text-xl font-bold mb-4">Verify Student</h3>
                        <div className="flex flex-col md:flex-row gap-6">
                           <div className="md:w-1/2">
                               {verifyingUser.idCardUrl ? 
                                   <img src={verifyingUser.idCardUrl} className="w-full rounded shadow-sm border" alt="ID Card" /> 
                                   : <div className="bg-gray-100 h-64 flex items-center justify-center">No Image</div>
                               }
                           </div>
                           <div className="md:w-1/2 space-y-3">
                               <div>
                                   <p className="text-xs text-gray-500 uppercase">Full Name</p>
                                   <p className="font-bold text-lg">{verifyingUser.fullName}</p>
                               </div>
                               <div>
                                   <p className="text-xs text-gray-500 uppercase">Matric No</p>
                                   <p className="font-mono bg-gray-100 p-1 rounded inline-block">{verifyingUser.matricNo}</p>
                               </div>
                               <div>
                                   <p className="text-xs text-gray-500 uppercase">Department</p>
                                   <p>{verifyingUser.department}</p>
                               </div>
                               <div className="mt-8 pt-4 border-t flex gap-3">
                                   <Button className="flex-1" onClick={() => handleApproval(verifyingUser.id, true)}>
                                       ✓ Approve Registration
                                   </Button>
                                   <Button variant="danger" className="flex-1" onClick={() => handleApproval(verifyingUser.id, false)}>
                                       ✕ Reject
                                   </Button>
                               </div>
                           </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 flex justify-end">
                        <Button variant="ghost" onClick={() => setVerifyingUser(null)}>Close</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Aspirant Review Modal */}
      {reviewingAspirant && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
               <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                   <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setReviewingAspirant(null)}></div>
                   <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
                       <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Review Aspirant Application</h3>
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Images */}
                                <div className="md:w-1/2 space-y-4">
                                    <div className="border p-2 rounded">
                                        <p className="text-xs text-gray-500 mb-1">Passport Photo</p>
                                        <img src={reviewingAspirant.passportUrl} className="h-48 mx-auto object-cover" />
                                    </div>
                                    <div className="border p-2 rounded">
                                        <p className="text-xs text-gray-500 mb-1">Result Document (CGPA Proof)</p>
                                        <img src={reviewingAspirant.resultUrl} className="h-64 mx-auto object-contain" />
                                    </div>
                                </div>
                                {/* Details */}
                                <div className="md:w-1/2 space-y-3">
                                    <div className="bg-purple-50 p-4 rounded border border-purple-100">
                                        <p className="text-sm text-purple-800 font-bold">Target Position</p>
                                        <p className="text-2xl font-bold text-purple-900">{reviewingAspirant.position}</p>
                                    </div>
                                    <p><strong>Name:</strong> {reviewingAspirant.fullName}</p>
                                    <p><strong>Matric:</strong> {reviewingAspirant.matricNo}</p>
                                    <p><strong>Department:</strong> {reviewingAspirant.department}</p>
                                    <p><strong>Level:</strong> {reviewingAspirant.level}</p>
                                    <p><strong>Claimed CGPA:</strong> {reviewingAspirant.cgpa}</p>
                                    <div>
                                        <strong>Manifesto:</strong>
                                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1 max-h-40 overflow-y-auto">{reviewingAspirant.manifesto}</p>
                                    </div>

                                    <div className="pt-4 flex flex-col gap-2">
                                        <Button className="w-full" onClick={() => handleAspirantApproval(reviewingAspirant.id, true)}>
                                            ✓ Approve & Promote to Candidate
                                        </Button>
                                        <Button variant="danger" className="w-full" onClick={() => handleAspirantApproval(reviewingAspirant.id, false)}>
                                            ✕ Reject Application
                                        </Button>
                                    </div>
                                </div>
                            </div>
                       </div>
                       <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                            <Button variant="ghost" onClick={() => setReviewingAspirant(null)}>Close</Button>
                       </div>
                   </div>
               </div>
          </div>
      )}

    </div>
  );
};
