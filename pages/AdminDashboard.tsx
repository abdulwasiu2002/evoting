
import React, { useEffect, useState } from 'react';
import { User, Candidate, AuditLog, Vote, ElectionSettings, Position, Aspirant, PaymentStatus, OutgoingExecutive, ExecutiveStatus } from '../types';
import { db } from '../services/mockDb';
import { Button } from '../components/Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { isSupabaseConfigured } from '../services/supabaseClient';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'aspirants' | 'results' | 'analytics' | 'candidates' | 'positions' | 'departments' | 'audit' | 'settings' | 'executives'>('analytics');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [aspirants, setAspirants] = useState<Aspirant[]>([]);
  const [executives, setExecutives] = useState<OutgoingExecutive[]>([]);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [executiveForm, setExecutiveForm] = useState<Partial<OutgoingExecutive>>({});
  const [executivePhotoPreview, setExecutivePhotoPreview] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{name: string, count: number}[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // UI Safety
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Real-time Activity Feed State
  const [liveActivity, setLiveActivity] = useState<{id: string, message: string, time: string}[]>([]);

  // Candidate Management State
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState<Partial<Candidate>>({});
  const [candidatePhotoPreview, setCandidatePhotoPreview] = useState<string | null>(null);

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

  // --- CHART COLORS ---
  const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

  const fetchPending = async () => {
    const users = await db.getPendingUsers();
    setPendingUsers(users);
  };

  const fetchAspirants = async () => {
    const asps = await db.getAspirants();
    setAspirants(asps);
  };

  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const cands = await db.getCandidates();
      setCandidates(cands);
      return cands;
    } finally {
      setCandidatesLoading(false);
    }
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
    let currentCandidates = candidates;
    if (currentCandidates.length === 0) {
      currentCandidates = await (db.getVotingCandidates ? db.getVotingCandidates() : db.getCandidates());
      setCandidates(currentCandidates);
    }
    const res = await db.getResults();
    
    // Merge votes with candidate names for chart
    const chartData = currentCandidates.map(c => {
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
        fetchAudit(); 
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

    if (activeTab === 'executives') {
        fetchExecutives();
        fetchPositions();
    }

  }, [activeTab]);

  const fetchExecutives = async () => {
      const execs = await db.getOutgoingExecutives();
      setExecutives(execs);
  };

  const handleApproval = async (userId: string, approve: boolean) => {
    const reason = !approve ? prompt("Reason for rejection?") : undefined;
    if (!approve && reason === null) return; 
    
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

  const openAddExecutive = () => {
      setExecutiveForm({
         fullName: '',
         position: positions[0]?.name || '',
         session: '2025/2026 Administration',
         startDate: '',
         endDate: '',
         biography: '',
         achievements: '',
         appreciationMessage: '',
         quote: '',
         profileImage: '',
         status: ExecutiveStatus.OUTGOING
      });
      setExecutivePhotoPreview(null);
      setIsExecutiveModalOpen(true);
  };

  const openEditExecutive = (exec: OutgoingExecutive) => {
      setExecutiveForm({...exec});
      setExecutivePhotoPreview(exec.profileImage);
      setIsExecutiveModalOpen(true);
  }

  const handleDeleteExecutive = async (id: string) => {
      if (confirm('Are you sure you want to delete this executive?')) {
          await db.deleteOutgoingExecutive('admin-1', id);
          fetchExecutives();
      }
  }

  const handleExecutivePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setExecutiveForm(prev => ({ ...prev, profileImage: base64String }));
              setExecutivePhotoPreview(base64String);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveExecutive = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const finalForm = {
          ...executiveForm,
          profileImage: executiveForm.profileImage || 'https://via.placeholder.com/400x500?text=No+Photo'
      };
      // Type assertion safe because required fields are enforced in form
      try {
          if (finalForm.id) {
              await db.updateOutgoingExecutive('admin-1', finalForm as OutgoingExecutive);
          } else {
              await db.addOutgoingExecutive('admin-1', finalForm as Omit<OutgoingExecutive, 'id'|'createdAt'>);
          }
          setIsExecutiveModalOpen(false);
          fetchExecutives();
      } catch (err: any) {
          alert("Error saving executive: " + err.message);
      } finally {
          setLoading(false);
      }
  }

  const generatePDFReport = async () => {
    setIsGeneratingReport(true);
    try {
        // Fetch fresh up-to-date data
        const [freshResults, freshCandidates, freshPositions, freshDeptStats, freshSettings, freshDepts] = await Promise.all([
             db.getResults(),
             db.getCandidates(),
             db.getPositions(),
             db.getDepartmentStats(),
             db.getElectionSettings(),
             db.getDepartments()
        ]);

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Merge candidates with their votes
        const candidatesWithVotes = freshCandidates.map(c => {
            const v = freshResults.find(r => r.candidateId === c.id);
            return {
                ...c,
                votes: v ? v.count : 0
            };
        });

        const currentTotalVotes = freshResults.reduce((acc, curr) => acc + curr.count, 0);
        const currentTotalRegistered = freshDeptStats.reduce((acc, curr) => acc + curr.count, 0);
        const activePosCount = freshPositions.length > 0 ? freshPositions.length : 1;
        const turnoutPercentage = currentTotalRegistered > 0 
            ? Math.round((currentTotalVotes / (currentTotalRegistered * activePosCount)) * 100) 
            : 0;

        // Position names to evaluate
        const positionNames: string[] = [];
        freshPositions.forEach(p => {
            if (!positionNames.some(pn => pn.toLowerCase() === p.name.toLowerCase())) {
                positionNames.push(p.name);
            }
        });
        freshCandidates.forEach(c => {
            if (!positionNames.some(pn => pn.toLowerCase() === c.position.toLowerCase())) {
                positionNames.push(c.position);
            }
        });

        // Determine Winners for each position
        const winnersList: {
            position: string;
            winnerName: string;
            department: string;
            matricNo: string;
            votes: string;
            status: string;
            isUnopposed: boolean;
            isTie: boolean;
        }[] = [];

        positionNames.forEach(posName => {
            const posCandidates = candidatesWithVotes.filter(
                c => c.position.trim().toLowerCase() === posName.trim().toLowerCase()
            );

            if (posCandidates.length === 0) {
                winnersList.push({
                    position: posName,
                    winnerName: "No Candidate Registered",
                    department: "-",
                    matricNo: "-",
                    votes: "-",
                    status: "Vacant (No Contestant)",
                    isUnopposed: false,
                    isTie: false
                });
            } else if (posCandidates.length === 1) {
                // Single candidate who contested for this position -> won the election
                const singleCand = posCandidates[0];
                winnersList.push({
                    position: posName,
                    winnerName: singleCand.name,
                    department: singleCand.department || 'N/A',
                    matricNo: singleCand.matricNo || 'N/A',
                    votes: `${singleCand.votes} votes`,
                    status: "Elected Winner (Unopposed)",
                    isUnopposed: true,
                    isTie: false
                });
            } else {
                // Multiple candidates contested -> determine highest vote getter
                posCandidates.sort((a, b) => b.votes - a.votes);
                const totalPosVotes = posCandidates.reduce((sum, c) => sum + c.votes, 0);
                const highestVotes = posCandidates[0].votes;
                const topCandidates = posCandidates.filter(c => c.votes === highestVotes);

                if (topCandidates.length === 1) {
                    const winner = topCandidates[0];
                    const percentage = totalPosVotes > 0 ? Math.round((winner.votes / totalPosVotes) * 100) : 0;
                    winnersList.push({
                        position: posName,
                        winnerName: winner.name,
                        department: winner.department || 'N/A',
                        matricNo: winner.matricNo || 'N/A',
                        votes: `${winner.votes} votes (${percentage}%)`,
                        status: "Declared Winner (Highest Votes)",
                        isUnopposed: false,
                        isTie: false
                    });
                } else {
                    // Tie between top candidates
                    const names = topCandidates.map(c => c.name).join(" / ");
                    winnersList.push({
                        position: posName,
                        winnerName: names,
                        department: "Multiple",
                        matricNo: "-",
                        votes: `${highestVotes} votes each`,
                        status: "Tie (Equal Votes for 1st)",
                        isUnopposed: false,
                        isTie: true
                    });
                }
            }
        });

        // --- PDF HEADER (Green Banner) ---
        doc.setFillColor(4, 120, 87); // Emerald-700 (#047857)
        doc.rect(0, 0, pageWidth, 42, 'F');
        
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("NIGERIA ASSOCIATION OF COMPUTING STUDENTS (NACOS)", pageWidth / 2, 16, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("OFFICIAL ELECTION REPORT & DECLARATION OF WINNERS", pageWidth / 2, 26, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on: ${new Date().toLocaleString()}  |  System Status: ${freshSettings.isVotingEnabled ? 'Active Voting' : 'Election Concluded'}`, pageWidth / 2, 35, { align: 'center' });

        // --- EXECUTIVE SUMMARY SECTION ---
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. ELECTION EXECUTIVE SUMMARY", 14, 52);

        // Summary Card Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 56, pageWidth - 28, 26, 3, 3, 'FD');

        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        
        const sumY = 64;
        doc.text(`• Total Registered Voters: ${currentTotalRegistered}`, 20, sumY);
        doc.text(`• Total Votes Cast: ${currentTotalVotes}`, 20, sumY + 8);
        doc.text(`• Overall Voter Turnout: ${turnoutPercentage}%`, 20, sumY + 16);
        
        doc.text(`• Total Positions Contested: ${positionNames.length}`, 110, sumY);
        doc.text(`• Total Candidates: ${freshCandidates.length}`, 110, sumY + 8);
        doc.text(`• Election State: ${freshSettings.isVotingEnabled ? 'Voting In Progress' : 'Concluded & Certified'}`, 110, sumY + 16);

        // --- SECTION 2: OFFICIAL WINNERS TABLE ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(4, 120, 87);
        doc.text("2. OFFICIAL ELECTION WINNERS (ELECTED CANDIDATES)", 14, 92);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text("Official declaration of winning candidates. Contested winners and single-candidate (unopposed) winners are indicated.", 14, 97);

        const winnersTableRows = winnersList.map((w, index) => [
            index + 1,
            w.position,
            w.winnerName,
            w.department,
            w.votes,
            w.status
        ]);

        autoTable(doc, {
            startY: 101,
            head: [["#", "Position", "Elected Candidate", "Department", "Votes Won", "Electoral Status"]],
            body: winnersTableRows,
            theme: 'grid',
            headStyles: { 
                fillColor: [4, 120, 87], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [30, 41, 59]
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 38, fontStyle: 'bold' },
                2: { cellWidth: 42, fontStyle: 'bold' },
                3: { cellWidth: 30 },
                4: { cellWidth: 28, halign: 'center' },
                5: { cellWidth: 36, fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const statusText = data.row.raw[5] as string;
                    if (statusText?.includes('Winner') || statusText?.includes('Elected')) {
                        data.cell.styles.fillColor = [240, 253, 244]; // Light emerald tint for winners
                    } else if (statusText?.includes('Tie')) {
                        data.cell.styles.fillColor = [254, 243, 199]; // Light amber for tie
                    }
                }
            }
        });

        // --- SECTION 3: DETAILED CANDIDATES BREAKDOWN TABLE ---
        const detailedStartY = (doc as any).lastAutoTable.finalY + 14;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("3. DETAILED RESULTS BREAKDOWN (ALL CANDIDATES)", 14, detailedStartY);

        const allCandidatesRows: any[] = [];
        positionNames.forEach(posName => {
            const posCandidates = candidatesWithVotes.filter(
                c => c.position.trim().toLowerCase() === posName.trim().toLowerCase()
            );
            posCandidates.sort((a, b) => b.votes - a.votes);
            const totalPosVotes = posCandidates.reduce((sum, c) => sum + c.votes, 0);
            const maxVotes = posCandidates.length > 0 ? posCandidates[0].votes : 0;

            posCandidates.forEach((c) => {
                const pct = totalPosVotes > 0 ? `${((c.votes / totalPosVotes) * 100).toFixed(1)}%` : '0.0%';
                let resultBadge = "Contestant";
                if (posCandidates.length === 1) {
                    resultBadge = "WINNER (Unopposed)";
                } else if (c.votes === maxVotes && maxVotes > 0) {
                    const topCount = posCandidates.filter(tc => tc.votes === maxVotes).length;
                    resultBadge = topCount > 1 ? "TIED WINNER" : "WINNER";
                } else {
                    resultBadge = "Runner-up";
                }

                allCandidatesRows.push([
                    posName,
                    c.name,
                    c.matricNo || 'N/A',
                    c.department || 'N/A',
                    c.votes,
                    pct,
                    resultBadge
                ]);
            });
        });

        autoTable(doc, {
            startY: detailedStartY + 5,
            head: [["Position", "Candidate Name", "Matric No.", "Department", "Votes", "Vote %", "Outcome"]],
            body: allCandidatesRows,
            theme: 'striped',
            headStyles: { 
                fillColor: [75, 85, 99], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold',
                fontSize: 8.5
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [30, 41, 59]
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 38, fontStyle: 'bold' },
                2: { cellWidth: 26 },
                3: { cellWidth: 26 },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 18, halign: 'center' },
                6: { cellWidth: 25, fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 6) {
                    const val = data.cell.raw as string;
                    if (val?.includes('WINNER')) {
                        data.cell.styles.textColor = [4, 120, 87];
                    }
                }
            }
        });

        // --- SECTION 4: DEPARTMENT BREAKDOWN TABLE ---
        const deptStartY = (doc as any).lastAutoTable.finalY + 14;

        // Check if new page is needed for department table & signatures
        if (deptStartY > 220) {
            doc.addPage();
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("4. VOTER REGISTRATION BY DEPARTMENT", 14, 20);
        } else {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("4. VOTER REGISTRATION BY DEPARTMENT", 14, deptStartY);
        }

        const deptRows = freshDeptStats.map(d => [
            d.name, 
            d.count, 
            currentTotalRegistered > 0 ? `${((d.count / currentTotalRegistered) * 100).toFixed(1)}%` : '0%'
        ]);
        
        autoTable(doc, {
            startY: deptStartY > 220 ? 25 : deptStartY + 5,
            head: [["Department Name", "Registered Voters", "Share %"]],
            body: deptRows,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], fontSize: 8.5 },
            bodyStyles: { fontSize: 8 }
        });

        // --- OFFICIAL CERTIFICATION / SIGN-OFF BLOCK ---
        const signStartY = (doc as any).lastAutoTable.finalY + 16;
        const finalSignY = signStartY > 240 ? (doc.addPage(), 30) : signStartY;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("OFFICIAL CERTIFICATION & ENDORSEMENT", 14, finalSignY);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("We hereby certify that the results and winners declared herein are true and accurate as recorded by the NACOS Electronic Voting System.", 14, finalSignY + 6);

        const sigLineY = finalSignY + 26;
        
        // Chairman signature line
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.5);
        doc.line(14, sigLineY, 80, sigLineY);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("ELCOM Chairman", 14, sigLineY + 5);
        doc.setFont("helvetica", "normal");
        doc.text("Signature & Date", 14, sigLineY + 9);

        // Staff Adviser signature line
        doc.line(110, sigLineY, 180, sigLineY);
        doc.setFont("helvetica", "bold");
        doc.text("Staff Adviser / Electoral Patron", 110, sigLineY + 5);
        doc.setFont("helvetica", "normal");
        doc.text("Signature & Date", 110, sigLineY + 9);

        // Page Numbers on all pages
        const totalPageCount = (doc as any).internal.getNumberOfPages();
        for(let i = 1; i <= totalPageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${totalPageCount} - NACOS E-Voting System Official Report`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
        
        doc.save("NACOS_Official_Election_Report_Winners.pdf");
    } catch (error: any) {
        console.error(error);
        alert(`Failed to generate report: ${error.message}`);
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
  
  const pendingAspirants = aspirants.filter(a => a.status === 'pending');
  const approvedAspirants = aspirants.filter(a => a.status === 'approved');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-sm">
          <p className="font-bold text-slate-800">{label}</p>
          <p className="text-emerald-600 font-medium">Votes: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Console</h1>
            <p className="text-slate-500 text-sm mt-1">Manage elections, candidates, and view real-time analytics.</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200 flex items-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                System Active
            </span>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
                Admin Access
            </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-6">
          {['analytics', 'pending', 'aspirants', 'results', 'candidates', 'positions', 'departments', 'audit', 'settings', 'executives'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm capitalize transition-colors rounded-t-lg`}
            >
              {tab} {tab === 'pending' && pendingUsers.length > 0 && <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs font-bold">{pendingUsers.length}</span>}
              {tab === 'aspirants' && pendingAspirants.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full text-xs font-bold">{pendingAspirants.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-shadow">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                      </div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Registered Voters</p>
                      <div className="flex items-baseline">
                          <p className="text-4xl font-extrabold text-slate-800">{totalRegistered}</p>
                          <span className="ml-2 text-sm font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 mt-4 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                      </div>
                  </div>

                  <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-shadow">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <svg className="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                      </div>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Total Votes Cast</p>
                      <div className="flex items-baseline">
                          <p className="text-4xl font-extrabold text-slate-800">{totalVotes}</p>
                          <span className="ml-2 text-sm font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Live</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 mt-4 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalRegistered > 0 ? (totalVotes / (totalRegistered * 3)) * 100 : 0}%` }}></div>
                      </div>
                  </div>

                  <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                           <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 00-1-1H3zm6 9a1 1 0 100-2 1 1 0 000 2zM9.5 5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5zm0 4h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5z" clipRule="evenodd"></path></svg>
                      </div>
                      <p className="text-sm text-purple-200 font-bold uppercase tracking-wider mb-1">Voter Turnout</p>
                      <div className="flex items-baseline">
                          <p className="text-4xl font-extrabold">{totalRegistered > 0 ? Math.round((totalVotes / (totalRegistered * positions.length || 1)) * 100) : 0}%</p>
                      </div>
                      <p className="text-purple-200 text-xs mt-4">Engagement Rate</p>
                  </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end w-full sm:w-auto">
                  <Button onClick={generatePDFReport} className="bg-slate-800 hover:bg-slate-900 w-full sm:w-auto" isLoading={isGeneratingReport}>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Detailed Report (PDF)
                  </Button>
                  <Button variant="outline" onClick={exportExcelCSV} className="w-full sm:w-auto">
                      Export CSV
                  </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                          <span className="w-2 h-6 bg-emerald-500 rounded mr-3"></span>
                          Election Results Trend
                      </h3>
                      <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={results} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Area type="monotone" dataKey="votes" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorVotes)" animationDuration={1500} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                          <span className="w-2 h-6 bg-purple-500 rounded mr-3"></span>
                          Voter Demographics
                      </h3>
                      <div className="h-80 w-full flex items-center justify-center">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={departmentStats}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={80}
                                      outerRadius={110}
                                      paddingAngle={5}
                                      dataKey="count"
                                  >
                                      {departmentStats.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                          <span className="w-2 h-6 bg-blue-500 rounded mr-3"></span>
                          Audit Trail & Live Activity
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
                          {logs.length === 0 ? (
                              <p className="text-slate-500 text-sm text-center py-4">No activity logs recorded yet.</p>
                          ) : (
                              <table className="min-w-full text-sm">
                                  <tbody>
                                      {logs.slice(0, 10).map((log, idx) => (
                                          <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                                              <td className="py-3 px-2 text-slate-400 font-mono text-xs w-24">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                              <td className="py-3 px-2">
                                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                      log.actorRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                  }`}>
                                                      {log.actorRole.toUpperCase()}
                                                  </span>
                                              </td>
                                              <td className="py-3 px-2 font-medium text-slate-700">{log.actionType}</td>
                                              <td className="py-3 px-2 text-slate-500 truncate max-w-xs">{log.details}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PENDING USERS TAB */}
      {activeTab === 'pending' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md animate-fade-in-up">
          {pendingUsers.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No pending registrations.</div>
          ) : (
          <ul className="divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <li key={user.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group relative" onClick={() => setVerifyingUser(user)}>
                        {user.idCardUrl ? <img src={user.idCardUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs">No ID</div>}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center text-transparent group-hover:text-white text-xs font-bold">View</div>
                    </div>
                    <div className="ml-3 sm:ml-4 overflow-hidden">
                      <p className="text-base sm:text-lg font-medium text-emerald-600 truncate">{user.fullName}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">Matric: {user.matricNo} • {user.department}</p>
                      <p className="text-[11px] sm:text-xs text-gray-400">Registered: {new Date(user.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex w-full sm:w-auto">
                    <Button size="sm" variant="primary" onClick={() => setVerifyingUser(user)} disabled={processingId === user.id} isLoading={processingId === user.id} className="w-full sm:w-auto">Review Application</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      {/* ASPIRANTS TAB */}
      {activeTab === 'aspirants' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md animate-fade-in-up">
          {aspirants.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No aspirants registered yet.</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aspirant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aspirants.map((asp) => (
                  <tr key={asp.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full object-cover" src={asp.passportUrl} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{asp.fullName}</div>
                          <div className="text-sm text-gray-500">{asp.matricNo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asp.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        asp.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                        asp.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {asp.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        asp.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
                        asp.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {asp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button size="sm" onClick={() => setReviewingAspirant(asp)}>Review</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Live Election Results & Tally</h3>
              <p className="text-sm text-slate-500">Real-time vote distribution across all contested positions.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button onClick={generatePDFReport} className="bg-emerald-700 hover:bg-emerald-800 text-white w-full sm:w-auto" isLoading={isGeneratingReport}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download Winners Report (PDF)
              </Button>
              <Button variant="outline" onClick={exportExcelCSV} className="w-full sm:w-auto">
                Export CSV
              </Button>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vote Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((row, idx) => {
                      const samePos = results.filter(r => r.position === row.position);
                      const totalForPos = samePos.reduce((acc, curr) => acc + curr.votes, 0);
                      const percent = totalForPos > 0 ? ((row.votes / totalForPos) * 100).toFixed(1) : '0.0';
                      const maxVotes = Math.max(...samePos.map(r => r.votes));
                      const isSingle = samePos.length === 1;
                      const isWinner = (isSingle && row.votes >= 0) || (row.votes === maxVotes && maxVotes > 0);
                      
                      return (
                        <tr key={idx} className={isWinner ? "bg-emerald-50/40" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.position}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{row.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono font-bold">{row.votes}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                    <span className="mr-2 w-12 text-right">{percent}%</span>
                                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {isSingle ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  👑 Winner (Unopposed)
                                </span>
                              ) : isWinner ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  👑 Leading / Winner
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  Contestant
                                </span>
                              )}
                            </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATES TAB */}
      {activeTab === 'candidates' && (
        <div className="space-y-6 animate-fade-in-up">
           <div className="flex justify-end">
             <Button onClick={openAddCandidate}>+ Add New Candidate</Button>
           </div>

           {candidatesLoading && candidates.length === 0 ? (
             <div className="p-12 text-center">
               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
               <p className="text-gray-600 font-medium">Loading candidates...</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map(candidate => (
                   <div key={candidate.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      <div className="h-48 overflow-hidden bg-gray-100 relative">
                          {candidate.photoUrl ? (
                              <img src={candidate.photoUrl} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                          )}
                          <div className="absolute top-2 right-2 flex space-x-1">
                               <button onClick={() => openEditCandidate(candidate)} className="bg-white p-1 rounded-full shadow hover:bg-gray-50">✏️</button>
                               <button onClick={() => handleDeleteCandidate(candidate.id)} className="bg-white p-1 rounded-full shadow hover:bg-gray-50 text-red-500">🗑️</button>
                          </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                          <h3 className="text-lg font-bold text-gray-900">{candidate.name}</h3>
                          <p className="text-sm text-emerald-600 font-medium">{candidate.position}</p>
                          <p className="text-xs text-gray-500 mt-1">{candidate.department} • {candidate.matricNo}</p>
                          <div className="mt-3 flex-1">
                               <p className="text-sm text-gray-600 line-clamp-3 italic">"{candidate.manifesto}"</p>
                          </div>
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>
      )}

      {/* POSITIONS TAB */}
      {activeTab === 'positions' && (
         <div className="grid md:grid-cols-3 gap-8 animate-fade-in-up">
             <div className="md:col-span-1">
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                     <h3 className="text-lg font-bold mb-4">Add Position</h3>
                     <form onSubmit={handleAddPosition} className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Position Name</label>
                             <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={newPosition.name} onChange={e => setNewPosition({...newPosition, name: e.target.value})} required />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Form Price (₦)</label>
                             <input type="number" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={newPosition.price} onChange={e => setNewPosition({...newPosition, price: e.target.value})} required />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Eligible Level</label>
                             <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={newPosition.level} onChange={e => setNewPosition({...newPosition, level: e.target.value})}>
                                 <option value="All">All Levels</option>
                                 <option value="ND I">ND I</option>
                                 <option value="ND II">ND II</option>
                                 <option value="HND I">HND I</option>
                                 <option value="HND II">HND II</option>
                             </select>
                         </div>
                         <Button type="submit" className="w-full">Create Position</Button>
                     </form>
                 </div>
             </div>
             <div className="md:col-span-2">
                 <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                     <ul className="divide-y divide-gray-200">
                         {positions.map((pos, idx) => (
                             <li key={idx} className="px-6 py-4 flex items-center justify-between">
                                 <div>
                                     <p className="text-sm font-bold text-gray-900">{pos.name}</p>
                                     <p className="text-xs text-gray-500">Price: ₦{pos.price} • Level: {pos.eligibleLevel}</p>
                                 </div>
                                 <button onClick={() => handleRemovePosition(pos.name)} className="text-red-600 hover:text-red-900 text-sm">Remove</button>
                             </li>
                         ))}
                     </ul>
                 </div>
             </div>
         </div>
      )}

      {/* DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
         <div className="grid md:grid-cols-3 gap-8 animate-fade-in-up">
             <div className="md:col-span-1">
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                     <h3 className="text-lg font-bold mb-4">Add Department</h3>
                     <form onSubmit={handleAddDepartment} className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Department Name</label>
                             <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={newDepartment} onChange={e => setNewDepartment(e.target.value)} required />
                         </div>
                         <Button type="submit" className="w-full">Add Department</Button>
                     </form>
                 </div>
             </div>
             <div className="md:col-span-2">
                 <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                     <ul className="divide-y divide-gray-200">
                         {departments.map((dept, idx) => (
                             <li key={idx} className="px-6 py-4 flex items-center justify-between">
                                 <span className="text-sm font-medium text-gray-900">{dept}</span>
                                 <button onClick={() => handleRemoveDepartment(dept)} className="text-red-600 hover:text-red-900 text-sm">Remove</button>
                             </li>
                         ))}
                     </ul>
                 </div>
             </div>
         </div>
      )}

      {/* AUDIT TAB */}
      {activeTab === 'audit' && (
         <div className="bg-white shadow overflow-hidden sm:rounded-lg animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map(log => (
                          <tr key={log.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{log.actorRole} ({log.actorId.slice(0,5)})</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.actionType}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
         </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
         <div className="max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-lg shadow-sm border border-gray-200 animate-fade-in-up">
             <h3 className="text-xl font-bold mb-6">Election Configuration</h3>
             <form onSubmit={handleSaveSettings} className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                     <div>
                         <label className="block text-sm font-medium text-gray-700">Start Date</label>
                         <DatePicker
                             selected={settings.startDate ? new Date(settings.startDate) : null}
                             onChange={(date: Date | null) => setSettings({...settings, startDate: date ? date.toISOString() : ''})}
                             showTimeSelect
                             dateFormat="Pp"
                             className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
                             placeholderText="Select start date"
                             required
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700">End Date</label>
                         <DatePicker
                             selected={settings.endDate ? new Date(settings.endDate) : null}
                             onChange={(date: Date | null) => setSettings({...settings, endDate: date ? date.toISOString() : ''})}
                             showTimeSelect
                             dateFormat="Pp"
                             className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
                             placeholderText="Select end date"
                             required
                         />
                     </div>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded border border-gray-200">
                     <div>
                         <h4 className="font-bold text-gray-900">Voting Status</h4>
                         <p className="text-sm text-gray-500">Enable or disable voting globally.</p>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" className="sr-only peer" checked={settings.isVotingEnabled} onChange={e => setSettings({...settings, isVotingEnabled: e.target.checked})} />
                         <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                     </label>
                 </div>

                 <Button type="submit" isLoading={loading} className="w-full sm:w-auto">Save Settings</Button>
             </form>
         </div>
      )}

      
      {/* EXECUTIVES TAB */}
      {activeTab === 'executives' && (
        <div className="space-y-6 animate-fade-in-up">
           <div className="flex justify-end">
             <Button onClick={openAddExecutive}>+ Add New Executive</Button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {executives.map(exec => (
                 <div key={exec.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="h-48 overflow-hidden bg-gray-100 relative">
                        {exec.profileImage ? (
                            <img src={exec.profileImage} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                        )}
                        <div className="absolute top-2 right-2 flex space-x-1">
                             <button onClick={() => openEditExecutive(exec)} className="bg-white p-1 rounded-full shadow hover:bg-gray-50">✏️</button>
                             <button onClick={() => handleDeleteExecutive(exec.id)} className="bg-white p-1 rounded-full shadow hover:bg-gray-50 text-red-500">🗑️</button>
                        </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start">
                             <h3 className="text-lg font-bold text-gray-900">{exec.fullName}</h3>
                             <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${exec.status === ExecutiveStatus.ACTIVE ? 'bg-green-100 text-green-700' : exec.status === ExecutiveStatus.OUTGOING ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                 {exec.status}
                             </span>
                        </div>
                        <p className="text-sm text-emerald-600 font-medium">{exec.position}</p>
                        <p className="text-xs text-gray-500 mt-1">{exec.session}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}
      
      {/* EXECUTIVE MODAL */}
      {isExecutiveModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold mb-4">{executiveForm.id ? 'Edit Executive' : 'Add New Executive'}</h3>
                  <form onSubmit={handleSaveExecutive} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Full Name</label>
                              <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.fullName || ''} onChange={e => setExecutiveForm({...executiveForm, fullName: e.target.value})} required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Position</label>
                              <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.position || ''} onChange={e => setExecutiveForm({...executiveForm, position: e.target.value})} required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Session (e.g. 2025/2026 Admin)</label>
                              <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.session || ''} onChange={e => setExecutiveForm({...executiveForm, session: e.target.value})} required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Status</label>
                              <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={executiveForm.status || ExecutiveStatus.OUTGOING} onChange={e => setExecutiveForm({...executiveForm, status: e.target.value as ExecutiveStatus})}>
                                  <option value={ExecutiveStatus.ACTIVE}>{ExecutiveStatus.ACTIVE}</option>
                                  <option value={ExecutiveStatus.OUTGOING}>{ExecutiveStatus.OUTGOING}</option>
                                  <option value={ExecutiveStatus.ARCHIVED}>{ExecutiveStatus.ARCHIVED}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Start Date</label>
                              <input type="date" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.startDate || ''} onChange={e => setExecutiveForm({...executiveForm, startDate: e.target.value})} required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">End Date</label>
                              <input type="date" className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.endDate || ''} onChange={e => setExecutiveForm({...executiveForm, endDate: e.target.value})} required />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Biography</label>
                          <textarea rows={3} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.biography || ''} onChange={e => setExecutiveForm({...executiveForm, biography: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Key Achievements</label>
                          <textarea rows={2} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.achievements || ''} onChange={e => setExecutiveForm({...executiveForm, achievements: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Appreciation Message</label>
                          <textarea rows={2} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.appreciationMessage || ''} onChange={e => setExecutiveForm({...executiveForm, appreciationMessage: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Personal Quote</label>
                          <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={executiveForm.quote || ''} onChange={e => setExecutiveForm({...executiveForm, quote: e.target.value})} required />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700">Photo</label>
                          <input type="file" className="mt-1 block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" accept="image/*" onChange={handleExecutivePhotoFileChange} />
                          {executivePhotoPreview && <img src={executivePhotoPreview} className="mt-2 h-20 w-20 object-cover rounded" />}
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
                          <Button type="button" variant="outline" onClick={() => setIsExecutiveModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                          <Button type="submit" isLoading={loading} className="w-full sm:w-auto">Save</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* CANDIDATE MODAL */}
      {isCandidateModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold mb-4">{isEditingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</h3>
                  <form onSubmit={handleSaveCandidate} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={candidateForm.name || ''} onChange={e => setCandidateForm({...candidateForm, name: e.target.value})} required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Matric No</label>
                              <input className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={candidateForm.matricNo || ''} onChange={e => setCandidateForm({...candidateForm, matricNo: e.target.value})} required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Department</label>
                              <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={candidateForm.department} onChange={e => setCandidateForm({...candidateForm, department: e.target.value})}>
                                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Position</label>
                          <select className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 bg-white" value={candidateForm.position} onChange={e => setCandidateForm({...candidateForm, position: e.target.value})}>
                              {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Manifesto</label>
                          <textarea rows={3} className="mt-1 block w-full border border-gray-300 rounded px-3 py-2" value={candidateForm.manifesto || ''} onChange={e => setCandidateForm({...candidateForm, manifesto: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Photo</label>
                          <input type="file" className="mt-1 block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" accept="image/*" onChange={handlePhotoFileChange} />
                          {candidatePhotoPreview && <img src={candidatePhotoPreview} className="mt-2 h-20 w-20 object-cover rounded" />}
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
                          <Button type="button" variant="outline" onClick={() => setIsCandidateModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                          <Button type="submit" isLoading={loading} className="w-full sm:w-auto">Save</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* VERIFY USER MODAL */}
      {verifyingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-3 sm:p-4 text-center">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setVerifyingUser(null)}></div>
                <div className="inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all max-w-2xl w-full max-h-[90vh] flex flex-col z-10">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 overflow-y-auto">
                        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Verify Student Registration</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Student ID Card</label>
                                <div className="border rounded-lg overflow-hidden bg-gray-100 h-48 sm:h-64 flex items-center justify-center">
                                    {verifyingUser.idCardUrl ? (
                                        <img src={verifyingUser.idCardUrl} alt="ID Card" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-gray-400 text-xs sm:text-sm">No Image</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase">Full Name</label>
                                    <p className="text-base sm:text-lg font-bold">{verifyingUser.fullName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase">Matric No</label>
                                    <p className="text-base sm:text-lg font-mono bg-gray-50 inline-block px-2 rounded">{verifyingUser.matricNo}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-gray-100">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setVerifyingUser(null)}>Cancel</Button>
                        <Button variant="danger" className="w-full sm:w-auto" onClick={() => handleApproval(verifyingUser.id, false)} disabled={processingId === verifyingUser.id}>Reject</Button>
                        <Button className="w-full sm:w-auto" onClick={() => handleApproval(verifyingUser.id, true)} disabled={processingId === verifyingUser.id} isLoading={processingId === verifyingUser.id}>Approve</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* REVIEW ASPIRANT MODAL */}
      {reviewingAspirant && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-3 sm:p-4 text-center">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setReviewingAspirant(null)}></div>
                <div className="inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all max-w-3xl w-full max-h-[90vh] flex flex-col z-10">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 overflow-y-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 sm:mb-6 border-b pb-4">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Review Aspirant Application</h3>
                             <span className={`px-2 py-1 rounded text-xs font-bold self-start sm:self-auto ${reviewingAspirant.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Payment: {reviewingAspirant.paymentStatus.toUpperCase()}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 sm:p-4 rounded border border-gray-200">
                                    <p className="font-bold text-gray-900">{reviewingAspirant.fullName}</p>
                                    <p className="text-sm text-emerald-600 font-medium">{reviewingAspirant.position}</p>
                                </div>
                                {reviewingAspirant.paymentReceiptUrl && (
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">Payment Receipt</h4>
                                        <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center max-h-48 sm:max-h-56">
                                            <img src={reviewingAspirant.paymentReceiptUrl} alt="Payment Receipt" className="max-w-full max-h-48 sm:max-h-56 object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">Passport Photo</h4>
                                <div className="h-40 sm:h-48 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                    <img src={reviewingAspirant.passportUrl} className="h-full w-full object-cover" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-gray-100">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReviewingAspirant(null)}>Close</Button>
                        <Button variant="danger" className="w-full sm:w-auto" onClick={() => handleAspirantApproval(reviewingAspirant.id, false)} disabled={processingId === reviewingAspirant.id}>Reject Application</Button>
                        {reviewingAspirant.paymentStatus !== PaymentStatus.PAID ? (
                             <Button className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700" onClick={() => handleVerifyPayment(reviewingAspirant.id)} disabled={processingId === reviewingAspirant.id} isLoading={processingId === reviewingAspirant.id}>Verify Payment First</Button>
                        ) : (
                             <Button className="w-full sm:w-auto" onClick={() => handleAspirantApproval(reviewingAspirant.id, true)} disabled={processingId === reviewingAspirant.id} isLoading={processingId === reviewingAspirant.id}>Approve & Promote</Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
