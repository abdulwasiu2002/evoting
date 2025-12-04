import React, { useEffect, useState } from 'react';
import { User, Candidate, AuditLog, Vote, ElectionSettings, Position, Aspirant, PaymentStatus } from '../types';
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
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{name: string, count: number}[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // UI Safety: Track which specific item is being processed to disable its button
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Real-time Activity Feed State
  const [liveActivity, setLiveActivity] = useState<{id: string, message: string, time: string}[]>([]);

  // Candidate Management State
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState<Partial<Candidate>>({});
  const [candidatePhotoPreview, setCandidatePhotoPreview] = useState<string | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);

  // Position Management State
  const [newPosition, setNewPosition] = useState({ name: '', price: '0', level: 'All' });

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
    setAspirants(asps);
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
    
    setProcessingId(userId);
    try {
        await db.processRegistration('admin-1', userId, approve, reason || undefined);
        setVerifyingUser(null);
        fetchPending(); 
    } catch (e: any) {
        alert(e.message);
    } finally {
        setProcessingId(null);
    }
  };

  const handleAspirantApproval = async (aspirantId: string, approve: boolean) => {
      if (approve) {
           const asp = aspirants.find(a => a.id === aspirantId);
           if (asp && asp.paymentStatus !== PaymentStatus.PAID) {
               alert("Cannot approve: Payment not verified. Please verify payment first.");
               return;
           }
      }

      if (confirm(approve ? "Approve this aspirant? They will immediately become a candidate visible to voters." : "Reject this application?")) {
          setProcessingId(aspirantId);
          try {
              await db.processAspirant('admin-1', aspirantId, approve);
              setReviewingAspirant(null);
              fetchAspirants();
          } catch (e: any) {
              alert(e.message);
          } finally {
              setProcessingId(null);
          }
      }
  };

  const handleVerifyPayment = async (aspirantId: string) => {
      if (confirm("Confirm that you have received payment from this aspirant?")) {
          setProcessingId(aspirantId);
          try {
              await db.verifyPayment('admin-1', aspirantId);
              fetchAspirants();
              if (reviewingAspirant?.id === aspirantId) {
                  setReviewingAspirant(prev => prev ? ({...prev, paymentStatus: PaymentStatus.PAID}) : null);
              }
          } catch (e: any) {
              alert(e.message);
          } finally {
              setProcessingId(null);
          }
      }
  };

  const openAddCandidate = () => {
    setCandidateForm({
      name: '',
      matricNo: '',
      department: departments[0] || '',
      position: positions[0]?.name || '',
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
    if (!newPosition.name.trim()) return;
    try {
      await db.addPosition('admin-1', newPosition.name.trim(), Number(newPosition.price), newPosition.level);
      setNewPosition({ name: '', price: '0', level: 'All' });
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
  const generatePDFReport = async () => {
    setIsGeneratingReport(true);
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.setFillColor(16, 185, 129); // Emerald-500
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        try {
            const logoUrl = "https://nacos.org.ng/img/about.jpg";
            const img = new Image();
            img.src = logoUrl;
            img.crossOrigin = "Anonymous";
            await new Promise((resolve) => {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
            });
            doc.addImage(img, 'JPEG', 14, 5, 30, 30, undefined, 'FAST');
        } catch (e) {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(14, 10, 20, 20, 2, 2, 'F'); 
            doc.setFillColor(16, 185, 129);
            doc.rect(18, 14, 12, 10, 'F');
            doc.rect(19, 25, 10, 2, 'F'); 
        }

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("NACOSS", 50, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Nigeria Association of Computer Science Students", 50, 26);
        doc.text("Official Election Report", 50, 31);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 31, { align: 'right' });

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Executive Summary", 14, 55);

        const totalVotes = results.reduce((acc, curr) => acc + curr.votes, 0);
        const totalRegistered = departmentStats.reduce((acc, curr) => acc + curr.count, 0);
        const turnout = totalRegistered > 0 ? Math.round((totalVotes / (totalRegistered * positions.length || 1)) * 100) : 0;

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, 60, pageWidth - 28, 25, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.text(`Total Registered Students`, 20, 70);
        doc.text(`Total Votes Cast`, 80, 70);
        doc.text(`Voter Turnout`, 140, 70);

        doc.setFontSize(16);
        doc.setTextColor(16, 185, 129);
        doc.text(`${totalRegistered}`, 20, 80);
        doc.text(`${totalVotes}`, 80, 80);
        doc.text(`${turnout}%`, 140, 80);

        let finalY = 95;

        const tableTheme = {
            headStyles: { fillColor: [4, 120, 87] as any, textColor: 255, fontStyle: 'bold' as any },
            alternateRowStyles: { fillColor: [236, 253, 245] as any },
            bodyStyles: { textColor: 50 },
            margin: { left: 14, right: 14 },
        };

        const runAutoTable = (d: any, options: any) => {
            if (typeof d.autoTable === 'function') d.autoTable(options);
            else if (typeof autoTable === 'function') autoTable(d, options);
            else throw new Error("PDF Table plugin not loaded correctly.");
        };

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text("Election Results", 14, finalY);
        finalY += 5;

        const resultRows: any[] = [];
        results.forEach(item => {
            resultRows.push([item.position, item.name, item.votes]);
        });

        runAutoTable(doc, {
            head: [["Position", "Candidate", "Votes"]],
            body: resultRows,
            startY: finalY,
            ...tableTheme
        });
        
        finalY = (doc as any).lastAutoTable.finalY + 15;

        const breakdown = await db.getVoterBreakdown();

        doc.text("Voter Turnout by Level", 14, finalY);
        finalY += 5;

        const levelRows = breakdown.byLevel.map(l => [l.name, l.count]);
        runAutoTable(doc, {
            head: [['Level', 'Voters']],
            body: levelRows,
            startY: finalY,
            ...tableTheme
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;

        if (finalY > pageHeight - 40) {
            doc.addPage();
            finalY = 20;
        }

        doc.text("Voter Turnout by Department", 14, finalY);
        finalY += 5;

        const deptRows = breakdown.byDepartment.map(d => [d.name, d.count]);
        runAutoTable(doc, {
            head: [['Department', 'Voters']],
            body: deptRows,
            startY: finalY,
            ...tableTheme
        });

        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${totalPages} - NACOSS E-Voting System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        doc.save("NACOSS_Election_Report.pdf");
    } catch (error: any) {
        console.error("PDF Export Error:", error);
        alert(`Failed to generate PDF Report: ${error.message || 'Unknown error'}`);
    } finally {
        setIsGeneratingReport(false);
    }
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
  
  // Split aspirants for better UI
  const pendingAspirants = aspirants.filter(a => a.status === 'pending');
  const approvedAspirants = aspirants.filter(a => a.status === 'approved');

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
              {tab === 'aspirants' && pendingAspirants.length > 0 && `(${pendingAspirants.length})`}
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
                    <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => setVerifyingUser(user)}
                        disabled={processingId === user.id}
                        isLoading={processingId === user.id}
                    >
                        Review Application
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      {activeTab === 'aspirants' && (
        <div className="space-y-8">
            {/* PENDING SECTION */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md border-l-4 border-yellow-400">
                <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Pending Applications</h3>
                    <span className="text-sm text-gray-500">Action Required: {pendingAspirants.length}</span>
                </div>
                {pendingAspirants.length === 0 ? <div className="p-8 text-center text-gray-500">No pending applications.</div> : (
                    <ul className="divide-y divide-gray-200">
                        {pendingAspirants.map(asp => (
                            <li key={asp.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer" onClick={() => setReviewingAspirant(asp)}>
                                            <img src={asp.passportUrl} className="h-full w-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-lg font-medium text-purple-600">{asp.fullName}</p>
                                                {asp.paymentStatus === PaymentStatus.PAID ? 
                                                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">Paid</span> :
                                                    asp.paymentStatus === PaymentStatus.PENDING ?
                                                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-bold">Verify Payment</span> :
                                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Unpaid</span>
                                                }
                                            </div>
                                            <p className="text-sm text-gray-600">Contesting for: <strong>{asp.position}</strong></p>
                                            <p className="text-xs text-gray-500">{asp.level} Level • {asp.department}</p>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        onClick={() => setReviewingAspirant(asp)}
                                        disabled={processingId === asp.id}
                                    >
                                        Review & Approve
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* APPROVED SECTION */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md border-l-4 border-emerald-400 opacity-90">
                <div className="px-6 py-4 border-b border-gray-200 bg-emerald-50">
                    <h3 className="text-lg font-bold text-gray-900">Approved Candidates (History)</h3>
                </div>
                 {approvedAspirants.length === 0 ? <div className="p-8 text-center text-gray-500">No approved candidates yet.</div> : (
                    <ul className="divide-y divide-gray-200 bg-gray-50">
                        {approvedAspirants.map(asp => (
                            <li key={asp.id} className="p-4 pl-6 opacity-75 hover:opacity-100 transition-opacity">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-10 w-10 bg-gray-200 rounded-full overflow-hidden">
                                            <img src={asp.passportUrl} className="h-full w-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{asp.fullName} <span className="text-emerald-600 text-xs">(Candidate)</span></p>
                                            <p className="text-xs text-gray-500">Approved for {asp.position}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">Promoted</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                 )}
            </div>
        </div>
      )}

      {/* ... (Rest of dashboard remains same) ... */}
      
      {activeTab === 'results' && ( /* ... existing results tab content ... */ 
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

      {activeTab === 'analytics' && ( /* ... existing analytics tab ... */ 
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
                  <Button onClick={generatePDFReport} className="bg-red-600 hover:bg-red-700" isLoading={isGeneratingReport}>
                      {isGeneratingReport ? 'Generating Report...' : 'Download Detailed Report (PDF)'}
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

      {activeTab === 'candidates' && ( /* ... existing candidates tab ... */
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
                    <Button size="sm" variant="secondary" onClick={() => setViewingCandidate(candidate)}>View Profile</Button>
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
              <form onSubmit={handleAddPosition} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 uppercase">Position Name</label>
                      <input 
                        type="text" 
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                        placeholder="e.g. Director of Socials"
                        value={newPosition.name}
                        onChange={(e) => setNewPosition({...newPosition, name: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-gray-500 uppercase">Form Price (₦)</label>
                      <input 
                        type="number" 
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                        placeholder="5000"
                        value={newPosition.price}
                        onChange={(e) => setNewPosition({...newPosition, price: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-gray-500 uppercase">Eligible Level</label>
                      <select 
                         className="w-full rounded-md border-gray-300 shadow-sm border p-2 bg-white"
                         value={newPosition.level}
                         onChange={(e) => setNewPosition({...newPosition, level: e.target.value})}
                      >
                          <option value="All">All Levels</option>
                          <option value="ND I">ND I</option>
                          <option value="ND II">ND II</option>
                          <option value="HND I">HND I</option>
                          <option value="HND II">HND II</option>
                      </select>
                  </div>
                  <div className="md:col-span-1">
                      <Button type="submit" className="w-full">Add Position</Button>
                  </div>
              </form>
           </div>
           
           <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {positions.map(pos => (
                          <tr key={pos.name}>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{pos.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">₦{pos.price.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{pos.eligibleLevel}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <Button size="sm" variant="danger" onClick={() => handleRemovePosition(pos.name)}>Remove</Button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'departments' && ( /* ... existing departments tab ... */ 
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

      {activeTab === 'audit' && ( /* ... existing audit tab ... */ 
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

      {activeTab === 'settings' && ( /* ... existing settings tab ... */
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

      {/* Candidate Modal (Update position dropdown to handle object if needed, though we just use name) */}
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
                                            {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
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

      {/* View Candidate Profile Modal */}
      {viewingCandidate && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
               <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                   <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setViewingCandidate(null)}></div>
                   <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
                       <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                           <div className="flex justify-between items-start border-b pb-4 mb-4">
                               <div>
                                   <h3 className="text-xl font-bold text-gray-900">{viewingCandidate.name}</h3>
                                   <p className="text-sm text-gray-500">{viewingCandidate.matricNo} • {viewingCandidate.department}</p>
                                   <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded mt-1 font-bold">
                                       {viewingCandidate.position}
                                   </span>
                               </div>
                               <button onClick={() => setViewingCandidate(null)} className="text-gray-400 hover:text-gray-500">
                                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                           </div>
                           
                           <div className="grid md:grid-cols-2 gap-6">
                               <div className="space-y-4">
                                   <div>
                                       <label className="block text-xs text-gray-500 uppercase font-bold">Passport Photo</label>
                                       <div className="mt-1 h-48 bg-gray-100 rounded flex items-center justify-center overflow-hidden border">
                                           <img src={viewingCandidate.photoUrl} className="h-full w-full object-cover" />
                                       </div>
                                   </div>
                                   <div>
                                       <label className="block text-xs text-gray-500 uppercase font-bold">Result Document</label>
                                       {viewingCandidate.resultUrl ? (
                                           <div className="mt-1 h-48 bg-gray-100 rounded flex items-center justify-center overflow-hidden border">
                                                <img src={viewingCandidate.resultUrl} className="h-full w-full object-contain" />
                                           </div>
                                       ) : (
                                           <div className="mt-1 h-20 bg-gray-50 rounded flex items-center justify-center text-gray-400 italic text-sm">
                                               No result document uploaded.
                                           </div>
                                       )}
                                   </div>
                               </div>
                               <div className="space-y-4">
                                   <div className="grid grid-cols-2 gap-4">
                                       <div className="bg-purple-50 p-3 rounded">
                                           <label className="block text-xs text-purple-800 uppercase font-bold">CGPA</label>
                                           <p className="text-lg font-bold text-gray-900">{viewingCandidate.cgpa || 'N/A'}</p>
                                       </div>
                                       <div className="bg-blue-50 p-3 rounded">
                                           <label className="block text-xs text-blue-800 uppercase font-bold">Level</label>
                                           <p className="text-lg font-bold text-gray-900">{viewingCandidate.level || 'N/A'}</p>
                                       </div>
                                   </div>
                                   <div>
                                       <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Manifesto</label>
                                       <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 italic border border-gray-100 h-64 overflow-y-auto">
                                           "{viewingCandidate.manifesto}"
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>
                       <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                           <Button onClick={() => setViewingCandidate(null)}>Close Profile</Button>
                       </div>
                   </div>
               </div>
          </div>
      )}

      {/* Verification Modal for Users (Existing) */}
      {verifyingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setVerifyingUser(null)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Verify Student Registration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Student ID Card</label>
                                <div className="border rounded-lg overflow-hidden bg-gray-100 h-64 flex items-center justify-center">
                                    {verifyingUser.idCardUrl ? (
                                        <img src={verifyingUser.idCardUrl} alt="ID Card" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-gray-400">No Image</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase">Full Name</label>
                                    <p className="text-lg font-bold">{verifyingUser.fullName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase">Matric No</label>
                                    <p className="text-lg font-mono bg-gray-50 inline-block px-2 rounded">{verifyingUser.matricNo}</p>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase">Department</label>
                                    <p className="text-md">{verifyingUser.department}</p>
                                </div>
                                 <div>
                                    <label className="block text-xs text-gray-500 uppercase">Level</label>
                                    <p className="text-md">{verifyingUser.level || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button 
                            className="w-full sm:ml-3 sm:w-auto" 
                            onClick={() => handleApproval(verifyingUser.id, true)}
                            disabled={processingId === verifyingUser.id}
                            isLoading={processingId === verifyingUser.id}
                        >
                            Approve
                        </Button>
                        <Button 
                            variant="danger" 
                            className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto" 
                            onClick={() => handleApproval(verifyingUser.id, false)}
                            disabled={processingId === verifyingUser.id}
                        >
                            Reject
                        </Button>
                        <Button 
                            variant="outline" 
                            className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto" 
                            onClick={() => setVerifyingUser(null)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* Review Aspirant Modal */}
      {reviewingAspirant && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setReviewingAspirant(null)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">Review Aspirant Application</h3>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    reviewingAspirant.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    Payment: {reviewingAspirant.paymentStatus.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                    <h4 className="font-bold text-gray-700 mb-3 uppercase text-xs">Applicant Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Name</label>
                                            <p className="font-medium">{reviewingAspirant.fullName}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Matric No</label>
                                            <p className="font-medium">{reviewingAspirant.matricNo}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Department</label>
                                            <p className="font-medium">{reviewingAspirant.department}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Level</label>
                                            <p className="font-medium">{reviewingAspirant.level}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                                    <h4 className="font-bold text-purple-800 mb-3 uppercase text-xs">Contest Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-purple-600">Position</label>
                                            <p className="font-bold text-lg">{reviewingAspirant.position}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-purple-600">CGPA</label>
                                            <p className="font-bold text-lg">{reviewingAspirant.cgpa}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="text-xs text-purple-600">Manifesto</label>
                                        <p className="text-sm italic mt-1 bg-white p-2 rounded border border-purple-100">{reviewingAspirant.manifesto}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-2 uppercase text-xs">Passport</h4>
                                    <div className="h-48 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                        <img src={reviewingAspirant.passportUrl} className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-2 uppercase text-xs">Result / Proof</h4>
                                    <div className="h-48 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                        <img src={reviewingAspirant.resultUrl} className="h-full w-full object-contain" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        {reviewingAspirant.paymentStatus !== PaymentStatus.PAID ? (
                             <Button 
                                className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700"
                                onClick={() => handleVerifyPayment(reviewingAspirant.id)}
                                disabled={processingId === reviewingAspirant.id}
                                isLoading={processingId === reviewingAspirant.id}
                             >
                                 Verify Payment First
                             </Button>
                        ) : (
                             <Button 
                                className="w-full sm:w-auto" 
                                onClick={() => handleAspirantApproval(reviewingAspirant.id, true)}
                                disabled={processingId === reviewingAspirant.id}
                                isLoading={processingId === reviewingAspirant.id}
                             >
                                 Approve & Promote
                             </Button>
                        )}
                        
                        <Button 
                            variant="danger" 
                            className="w-full sm:w-auto" 
                            onClick={() => handleAspirantApproval(reviewingAspirant.id, false)}
                            disabled={processingId === reviewingAspirant.id}
                        >
                            Reject Application
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full sm:w-auto" 
                            onClick={() => setReviewingAspirant(null)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};