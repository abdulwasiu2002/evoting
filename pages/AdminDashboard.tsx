
import React, { useEffect, useState } from 'react';
import { User, Candidate, AuditLog, Vote, ElectionSettings, Position } from '../types';
import { db } from '../services/mockDb';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'results' | 'analytics' | 'candidates' | 'positions' | 'departments' | 'audit' | 'settings'>('pending');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
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

  // Settings State
  const [settings, setSettings] = useState<ElectionSettings>({
      startDate: '',
      endDate: '',
      isVotingEnabled: false
  });

  const fetchPending = async () => {
    const users = await db.getPendingUsers();
    setPendingUsers(users);
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
      
      // Header
      doc.setFillColor(5, 150, 105); // Emerald 600
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("NACOSS Election Official Report", 105, 25, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 50);

      const totalVotes = results.reduce((acc, curr) => acc + curr.votes, 0);
      const totalRegistered = departmentStats.reduce((acc, curr) => acc + curr.count, 0);
      
      doc.text("Summary Statistics:", 14, 60);
      doc.setFontSize(10);
      doc.text(`Total Registered Voters: ${totalRegistered}`, 14, 66);
      doc.text(`Total Votes Cast: ${totalVotes}`, 14, 72);
      doc.text(`Participating Departments: ${departmentStats.length}`, 14, 78);

      // Results Table
      doc.setFontSize(14);
      doc.text("Election Results", 14, 90);
      
      const tableColumn = ["Position", "Candidate", "Votes", "Percentage"];
      const tableRows: any[] = [];

      results.forEach(item => {
          const percentage = totalVotes > 0 ? ((item.votes / totalVotes) * 100).toFixed(1) + '%' : '0%';
          tableRows.push([item.position, item.name, item.votes, percentage]);
      });

      autoTable(doc, {
          startY: 95,
          head: [tableColumn],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105] }
      });

      // Department Stats
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Registration by Department", 14, finalY);
      
      const deptRows = departmentStats.map(d => [d.name, d.count]);
      autoTable(doc, {
          startY: finalY + 5,
          head: [["Department", "Registered Students"]],
          body: deptRows,
          theme: 'grid',
          headStyles: { fillColor: [75, 85, 99] }
      });

      doc.save("NACOSS_Election_Report.pdf");
  };

  const exportExcelCSV = () => {
      // Create CSV Content
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Position,Candidate Name,Votes Received,Percentage\n";
      
      const totalVotes = results.reduce((acc, curr) => acc + curr.votes, 0);
      
      results.forEach(row => {
          const percentage = totalVotes > 0 ? ((row.votes / totalVotes) * 100).toFixed(2) : 0;
          csvContent += `"${row.position}","${row.name}",${row.votes},${percentage}%\n`;
      });
      
      // Trigger Download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "nacoss_election_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          {['pending', 'results', 'analytics', 'candidates', 'positions', 'departments', 'audit', 'settings'].map((tab) => (
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

      {activeTab === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6 min-w-0">
                
                {/* Total Votes Summary Card */}
                <div className="bg-white p-6 rounded-lg shadow border border-emerald-100 flex items-center">
                    <div className="p-4 rounded-full bg-emerald-50 text-emerald-600">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div className="ml-5">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Votes Cast</p>
                        <p className="text-3xl font-bold text-gray-900">{totalVotes}</p>
                    </div>
                    <div className="ml-auto flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        <span className="animate-pulse mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                        Live
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow min-w-0">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Vote Distribution</h3>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={results}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="votes" fill="#059669" name="Vote Count" animationDuration={500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.map((r, idx) => (
                                <tr key={idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.position}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{r.votes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Live Activity Feed Sidebar */}
            <div className="bg-white p-6 rounded-lg shadow lg:col-span-1 h-fit sticky top-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Live Activity Feed</h3>
                {liveActivity.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Waiting for incoming votes...</p>
                ) : (
                    <ul className="space-y-3">
                        {liveActivity.map((activity) => (
                            <li key={activity.id} className="text-sm flex flex-col bg-emerald-50 p-2 rounded border border-emerald-100 animate-fade-in-down transition-all">
                                <span className="text-gray-900 font-medium">{activity.message}</span>
                                <span className="text-xs text-gray-400 text-right mt-1">{activity.time}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      )}

      {activeTab === 'analytics' && (
          <div className="space-y-8">
              {/* Analytics Header Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div>
                      <h2 className="text-xl font-bold text-gray-900">Election Analytics & Reporting</h2>
                      <p className="text-sm text-gray-500">Visualize data and export official reports.</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-3">
                      <Button onClick={exportExcelCSV} variant="outline" size="sm">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Export to Excel (CSV)
                      </Button>
                      <Button onClick={generatePDFReport} size="sm">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          Download PDF Report
                      </Button>
                  </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                      <p className="text-sm font-medium text-gray-500 uppercase">Registered Voters</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{totalRegistered}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-emerald-500">
                      <p className="text-sm font-medium text-gray-500 uppercase">Total Votes Cast</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{totalVotes}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                      <p className="text-sm font-medium text-gray-500 uppercase">Turnout Rate</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                          {totalRegistered > 0 ? ((totalVotes / totalRegistered) * 100).toFixed(1) : 0}%
                      </p>
                  </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Department Chart */}
                  <div className="bg-white p-6 rounded-lg shadow min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Registrations by Department</h3>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={departmentStats} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4F46E5" name="Students" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Votes Chart */}
                  <div className="bg-white p-6 rounded-lg shadow min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Total Votes per Candidate</h3>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={results}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="votes" fill="#059669" name="Votes" />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'candidates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Manage Candidates</h3>
            <Button onClick={openAddCandidate}>+ Add Candidate</Button>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="p-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                          <img src={candidate.photoUrl} alt="" className="h-12 w-12 rounded-full bg-gray-200 object-cover" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{candidate.name}</p>
                            <p className="text-sm text-gray-500">{candidate.position} • {candidate.department}</p>
                          </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditCandidate(candidate)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteCandidate(candidate.id)}>Delete</Button>
                      </div>
                   </div>
                   <div className="mt-2 text-sm text-gray-500 italic truncate max-w-2xl">
                     "{candidate.manifesto}"
                   </div>
                </li>
              ))}
              {candidates.length === 0 && <div className="p-8 text-center text-gray-500">No candidates found.</div>}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Position</h3>
              <form onSubmit={handleAddPosition} className="flex gap-4">
                 <input 
                    type="text" 
                    placeholder="e.g. Public Relations Officer" 
                    className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                 />
                 <Button type="submit">Add Position</Button>
              </form>
           </div>

           <div className="bg-white shadow overflow-hidden sm:rounded-md">
             <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Current Positions</h3>
             </div>
             <ul className="divide-y divide-gray-200">
               {positions.map((pos) => (
                 <li key={pos} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-gray-900 font-medium">{pos}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemovePosition(pos)} className="text-red-600 hover:text-red-900 hover:bg-red-50">
                       Delete
                    </Button>
                 </li>
               ))}
               {positions.length === 0 && <li className="p-6 text-center text-gray-500">No positions defined.</li>}
             </ul>
           </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Department</h3>
              <form onSubmit={handleAddDepartment} className="flex gap-4">
                 <input 
                    type="text" 
                    placeholder="e.g. Artificial Intelligence" 
                    className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                 />
                 <Button type="submit">Add Department</Button>
              </form>
           </div>

           <div className="bg-white shadow overflow-hidden sm:rounded-md">
             <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Current Departments</h3>
             </div>
             <ul className="divide-y divide-gray-200">
               {departments.map((dept) => (
                 <li key={dept} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-gray-900 font-medium">{dept}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveDepartment(dept)} className="text-red-600 hover:text-red-900 hover:bg-red-50">
                       Delete
                    </Button>
                 </li>
               ))}
               {departments.length === 0 && <li className="p-6 text-center text-gray-500">No departments defined.</li>}
             </ul>
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-2xl">
              <div className="bg-white shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Election Configuration</h3>
                      <p className="mt-1 text-sm text-gray-500">Manage voting window and availability.</p>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                      <form onSubmit={handleSaveSettings} className="space-y-6">
                          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                              <div className="sm:col-span-3">
                                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                  <div className="mt-1">
                                      <input 
                                          type="date"
                                          required
                                          className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                          value={settings.startDate}
                                          onChange={(e) => setSettings({...settings, startDate: e.target.value})}
                                      />
                                  </div>
                              </div>
                              <div className="sm:col-span-3">
                                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                                  <div className="mt-1">
                                      <input 
                                          type="date"
                                          required
                                          className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                          value={settings.endDate}
                                          onChange={(e) => setSettings({...settings, endDate: e.target.value})}
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center justify-between py-4 border-t border-gray-100">
                              <div>
                                  <span className="flex flex-col">
                                      <span className="text-sm font-medium text-gray-900">Election Status</span>
                                      <span className="text-sm text-gray-500">Toggle to manually open or close the polls.</span>
                                  </span>
                              </div>
                              <button 
                                  type="button" 
                                  onClick={() => setSettings({...settings, isVotingEnabled: !settings.isVotingEnabled})}
                                  className={`${settings.isVotingEnabled ? 'bg-emerald-600' : 'bg-gray-200'} relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
                              >
                                  <span className="sr-only">Use setting</span>
                                  <span 
                                      aria-hidden="true" 
                                      className={`${settings.isVotingEnabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                  />
                              </button>
                          </div>

                          <div className="flex justify-end">
                              <Button type="submit" isLoading={loading}>Save Settings</Button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'audit' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">System Audit Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {log.actorId} <span className="text-xs font-normal text-gray-500">({log.actorRole})</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase text-xs font-bold">{log.actionType}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* Candidate Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsCandidateModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleSaveCandidate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {isEditingCandidate ? 'Edit Candidate' : 'Add Candidate'}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input 
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        value={candidateForm.name || ''}
                        onChange={e => setCandidateForm({...candidateForm, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Matric / User ID</label>
                      <input 
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        value={candidateForm.matricNo || ''}
                        onChange={e => setCandidateForm({...candidateForm, matricNo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <select 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                        value={candidateForm.department}
                        onChange={e => setCandidateForm({...candidateForm, department: e.target.value})}
                      >
                         {departments.length === 0 && <option>No Departments</option>}
                         {departments.map(d => (
                           <option key={d} value={d}>{d}</option>
                         ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <select 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                        value={candidateForm.position}
                        onChange={e => setCandidateForm({...candidateForm, position: e.target.value as Position})}
                      >
                        {positions.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Candidate Photo</label>
                      <div className="mt-1 flex items-center space-x-4">
                          {candidatePhotoPreview && (
                              <img src={candidatePhotoPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border border-gray-300" />
                          )}
                          <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                              <span>Upload Image</span>
                              <input type="file" className="sr-only" accept="image/*" onChange={handlePhotoFileChange} />
                          </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Upload a clear JPG or PNG image.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Manifesto</label>
                      <textarea 
                        required
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                        value={candidateForm.manifesto || ''}
                        onChange={e => setCandidateForm({...candidateForm, manifesto: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button type="submit" isLoading={loading} className="w-full sm:w-auto sm:ml-3">
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsCandidateModalOpen(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">
                    Cancel
                  </Button>
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setVerifyingUser(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
               <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4" id="modal-title">
                    Verify Student Registration
                  </h3>
                  <div className="flex flex-col md:flex-row gap-6">
                      {/* ID Card Column */}
                      <div className="md:w-1/2 bg-gray-100 rounded-lg flex items-center justify-center p-2 border border-gray-200">
                          {verifyingUser.idCardUrl ? (
                              <img 
                                src={verifyingUser.idCardUrl} 
                                alt="ID Card" 
                                className="max-h-[400px] w-auto object-contain rounded" 
                              />
                          ) : (
                              <div className="text-gray-400 p-10">No ID Card Uploaded</div>
                          )}
                      </div>
                      
                      {/* Details Column */}
                      <div className="md:w-1/2 space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-500">Full Name</label>
                              <div className="text-lg font-bold text-gray-900">{verifyingUser.fullName}</div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-500">Matriculation Number</label>
                              <div className="text-lg font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 inline-block">
                                  {verifyingUser.matricNo}
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-500">Department</label>
                              <div className="text-lg text-gray-900">{verifyingUser.department}</div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-500">Registration Date</label>
                              <div className="text-gray-900">{new Date(verifyingUser.createdAt).toLocaleString()}</div>
                          </div>
                          
                          <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
                              <p className="text-sm text-gray-500 italic">Please verify that the name and matric number on the ID card matches the registration details above.</p>
                              <div className="flex gap-3 mt-2">
                                  <Button 
                                    className="flex-1" 
                                    variant="primary" 
                                    onClick={() => handleApproval(verifyingUser.id, true)}
                                  >
                                      ✓ Approve Student
                                  </Button>
                                  <Button 
                                    className="flex-1" 
                                    variant="danger" 
                                    onClick={() => handleApproval(verifyingUser.id, false)}
                                  >
                                      ✕ Reject Application
                                  </Button>
                              </div>
                              <Button variant="ghost" onClick={() => setVerifyingUser(null)}>Cancel Review</Button>
                          </div>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
