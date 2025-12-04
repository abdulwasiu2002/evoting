
import React, { useEffect, useState } from 'react';
import { User, Candidate, Position, Vote, ElectionSettings, Aspirant, PaymentStatus } from '../types';
import { db } from '../services/mockDb';
import { analyzeManifesto } from '../services/geminiService';
import { Button } from '../components/Button';
import { jsPDF } from 'jspdf';

interface Props {
  user: User;
}

// Helper function to load images (Base64) to bypass some PDF generation issues
const loadImage = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Try to handle CORS
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
      } else {
          resolve(null);
      }
    };
    img.onerror = () => {
      console.warn("Could not load image for PDF:", url);
      resolve(null);
    };
  });
};

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [results, setResults] = useState<{candidateId: string, count: number}[]>([]);
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  // Aspirant Specifics
  const [myAspirantProfile, setMyAspirantProfile] = useState<Aspirant | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastVoteReceipts, setLastVoteReceipts] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [c, v, p, s, r, asps] = await Promise.all([
        db.getCandidates(),
        db.getMyVotes(user.id),
        db.getPositions(),
        db.getElectionSettings(),
        db.getResults(),
        db.getAspirants()
      ]);
      setCandidates(c);
      setMyVotes(v);
      setPositions(p);
      setSettings(s);
      setResults(r);
      
      const myAsp = asps.find(a => a.matricNo === user.matricNo);
      setMyAspirantProfile(myAsp || null);

      setLoading(false);
    };
    fetchData();
  }, [user.id, user.matricNo]);

  const handleAnalyze = async (candidate: Candidate) => {
    setAnalyzingId(candidate.id);
    const result = await analyzeManifesto(candidate.name, candidate.manifesto);
    setAiAnalysis(prev => ({ ...prev, [candidate.id]: result }));
    setAnalyzingId(null);
  };

  const getPendingVotes = () => {
     return Object.entries(selectedCandidates).filter(([position, candidateId]) => {
        const hasVoted = myVotes.some(v => v.position === position);
        return !hasVoted && candidateId;
    });
  };

  const isVotingOpen = () => {
      if (!settings) return false;
      const now = new Date();
      const start = new Date(settings.startDate);
      const end = new Date(settings.endDate);
      end.setHours(23, 59, 59, 999);
      
      return settings.isVotingEnabled && now >= start && now <= end;
  };

  const getStatusMessage = () => {
      if (!settings) return "";
      if (!settings.isVotingEnabled) return "Election is currently closed by the administration.";
      const now = new Date();
      if (now < new Date(settings.startDate)) return `Voting has not started yet. Opens: ${settings.startDate}`;
      if (now > new Date(settings.endDate)) return `Voting has ended. Closed: ${settings.endDate}`;
      return "";
  };

  const handleInitiateVote = () => {
    const votesToCast = getPendingVotes();

    if (votesToCast.length === 0) {
      alert("Please select at least one candidate to vote for.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    const votesToCast = getPendingVotes();
    const successfulVotes: Vote[] = [];
    const errors: string[] = [];

    try {
        for (const [position, candidateId] of votesToCast) {
            try {
                const vote = await db.castVote(user.id, candidateId as string, position);
                successfulVotes.push(vote);
            } catch (err: any) {
                errors.push(`${position}: ${err.message}`);
            }
        }

        if (successfulVotes.length > 0) {
             setMyVotes(prev => [...prev, ...successfulVotes]);
             setLastVoteReceipts(successfulVotes.map(v => v.id));
             
             const newResults = [...results];
             successfulVotes.forEach(v => {
                 const existing = newResults.find(r => r.candidateId === v.candidateId);
                 if (existing) existing.count++;
                 else newResults.push({ candidateId: v.candidateId, count: 1 });
             });
             setResults(newResults);

             const remainingSelections = { ...selectedCandidates };
             votesToCast.forEach(([pos]) => {
                 if(successfulVotes.find(v => v.position === pos)) {
                     delete remainingSelections[pos];
                 }
             });
             setSelectedCandidates(remainingSelections);
             setShowSuccessModal(true);
        }

        if (errors.length > 0) {
            alert(`Note: Some votes failed to process:\n${errors.join('\n')}`);
        }

    } catch (err: any) {
        alert("An unexpected error occurred: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  // Payment Logic
  const handleConfirmPayment = async () => {
      if (!myAspirantProfile) return;
      try {
          setSubmitting(true);
          await db.markPaymentAsPending(myAspirantProfile.id);
          setMyAspirantProfile({ ...myAspirantProfile, paymentStatus: PaymentStatus.PENDING });
          setShowPaymentModal(false);
          alert("Payment confirmation sent. Please wait for admin approval.");
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setSubmitting(false);
      }
  };

  const downloadReceipt = async () => {
      if (!myAspirantProfile) return;
      
      const doc = new jsPDF();
      
      // Load Images Async
      const logoUrl = "https://nacos.org.ng/img/about.jpg";
      const polyLogoUrl = "https://fedpolybida.edu.ng/images/fpb.png";
      
      const qrData = `NACOSS FORM\nName: ${myAspirantProfile.fullName}\nMatric: ${myAspirantProfile.matricNo}\nPos: ${myAspirantProfile.position}\nStatus: PAID\nPhone: ${myAspirantProfile.phone || 'N/A'}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

      // Load all images in parallel
      const [logoData, polyLogoData, qrImageData] = await Promise.all([
          loadImage(logoUrl),
          loadImage(polyLogoUrl),
          loadImage(qrUrl)
      ]);
      
      // -- HEADER --
      // Left Logo (NACOSS)
      if (logoData) {
           doc.addImage(logoData, 'JPEG', 20, 10, 25, 25, undefined, 'FAST');
      }

      // Right Logo (School)
      if (polyLogoData) {
           doc.addImage(polyLogoData, 'PNG', 165, 10, 25, 25, undefined, 'FAST');
      }

      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50); 
      doc.setFont("helvetica", "bold");
      doc.text("NIGERIA ASSOCIATION OF COMPUTING STUDENT", 105, 18, { align: "center" });
      
      doc.setFontSize(30);
      doc.setTextColor(40, 60, 50); // Dark Greenish
      doc.text("NACOS", 105, 29, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("THE FEDERAL POLYTECHNIC BIDA", 105, 35, { align: "center" });
      doc.text("P.M.B 55, BIDA NIGER STATE", 105, 39, { align: "center" });
      doc.text("MOTTO: TOWARDS ADVANCED TECHNOLOGY", 105, 43, { align: "center" });
      
      // Left/Right Header Info
      doc.setFontSize(6);
      doc.text("SECRETARIAT", 25, 40);
      doc.text("Computer Science", 25, 43);
      doc.text("Department", 25, 46);
      doc.text("The Federal Polytechnic", 25, 49);
      doc.text("P.M.B 55 Bida, Niger State", 25, 52);

      doc.text("+2349046465408", 170, 40);
      doc.text("nacosfpb@gmail.com", 170, 43);

      doc.setLineWidth(0.5);
      doc.line(15, 55, 195, 55);

      // -- TITLE --
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("ELECTION CANDIDATE", 105, 65, { align: "center" });
      doc.text("NOMINATION FORM", 105, 70, { align: "center" });
      
      // -- PASSPORT BOX --
      doc.setDrawColor(0, 0, 0);
      doc.rect(140, 60, 40, 45); // x, y, w, h
      // If we have a passport in the profile, we could add it, but requirement is just the box for physical affixing if needed,
      // or we can add it if available. Let's add it if it loads properly later.
      
      // -- FIELDS --
      let y = 85;
      const lineHeight = 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Helper for underlined field: Label________Value________
      const addField = (label: string, value: string) => {
          doc.text(label, 20, y);
          // Draw line
          doc.line(60, y + 1, 140, y + 1); 
          // Add Value
          doc.text(value.toUpperCase(), 62, y);
          y += lineHeight;
      };

      addField("FULLNAME:", myAspirantProfile.fullName);
      y += 2; // Extra space
      addField("MATRIC NUMBER:", myAspirantProfile.matricNo);
      addField("ADDRESS:", myAspirantProfile.address || "");
      y += 5; // Address takes more space usually
      addField("LEVEL:", myAspirantProfile.level || "");
      addField("POSITION:", myAspirantProfile.position);
      addField("GPA:", myAspirantProfile.cgpa);
      addField("PHONE NUMBER:", myAspirantProfile.phone || "");
      
      // Manual Fields
      doc.text("GUARANTOR:", 20, y);
      doc.line(60, y + 1, 140, y + 1); // Empty line
      y += lineHeight;

      doc.text("GUARANTOR PHONE NUMBER:", 20, y);
      doc.line(80, y + 1, 140, y + 1); // Empty line
      
      y += 40;
      
      // -- SIGNATURES --
      doc.line(20, y, 70, y);
      doc.text("Candidate Signature", 20, y + 5);
      
      doc.line(120, y, 170, y);
      doc.text("Guarantor Signature", 120, y + 5);

      y += 20;
      
      doc.line(20, y, 60, y);
      doc.text("Date", 20, y + 5);

      doc.line(120, y, 160, y);
      doc.text("Date", 120, y + 5);

      // -- QR CODE --
      if (qrImageData) {
         // Bottom center/right
         doc.addImage(qrImageData, "PNG", 90, 240, 30, 30); 
      } else {
          doc.rect(90, 240, 30, 30);
          doc.setFontSize(8);
          doc.text("QR SCAN", 105, 255, { align: "center"});
      }

      // -- FOOTER INSTRUCTION --
      doc.setFontSize(9);
      doc.setFont("helvetica", "bolditalic");
      doc.setTextColor(0, 0, 0);
      const note = "NOTE: After completing and signing this form, please photocopy and submit one copy to the Electoral Chairman's Office.";
      const splitNote = doc.splitTextToSize(note, 180);
      doc.text(splitNote, 105, 280, { align: "center" });

      doc.save("NACOSS_Nomination_Form.pdf");
  };

  const groupedCandidates = positions.map(position => ({
    position: position.name,
    candidates: candidates.filter(c => c.position === position.name)
  }));

  const pendingCount = getPendingVotes().length;
  const votingOpen = isVotingOpen();

  const myCandidateProfile = candidates.find(c => c.matricNo === user.matricNo);
  const myCandidateVotes = myCandidateProfile ? (results.find(r => r.candidateId === myCandidateProfile.id)?.count || 0) : 0;
  
  // Find price for aspirant
  const aspirantPositionPrice = myAspirantProfile ? positions.find(p => p.name === myAspirantProfile.position)?.price || 0 : 0;

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="space-y-8 pb-32 relative">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.fullName}</h1>
            <p className="text-gray-500">Matric: {user.matricNo} • {user.department}</p>
        </div>
        <div className="text-right">
             <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                Verified Voter
            </span>
        </div>
      </div>

      {/* ASPIRANT PORTAL SECTION */}
      {myAspirantProfile && (
          <div className="bg-white rounded-lg shadow-lg border border-purple-200 overflow-hidden">
              <div className="bg-purple-50 px-6 py-4 border-b border-purple-200 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-purple-900">Aspirant Portal</h2>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      myAspirantProfile.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      myAspirantProfile.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                  }`}>
                      Status: {myAspirantProfile.status}
                  </span>
              </div>
              <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div>
                          <p className="text-sm text-gray-500">Position Applied For</p>
                          <p className="text-xl font-bold text-gray-900">{myAspirantProfile.position}</p>
                          <p className="text-sm text-gray-500 mt-2">Nomination Form Price: <span className="font-bold text-gray-900">₦{aspirantPositionPrice.toLocaleString()}</span></p>
                      </div>
                      
                      <div className="flex flex-col items-center">
                           {myAspirantProfile.paymentStatus === PaymentStatus.UNPAID && (
                               <Button onClick={() => setShowPaymentModal(true)}>
                                   Purchase Nomination Form
                               </Button>
                           )}
                           
                           {myAspirantProfile.paymentStatus === PaymentStatus.PENDING && (
                               <div className="text-center">
                                   <p className="text-yellow-600 font-bold mb-2">Payment Verification Pending</p>
                                   <p className="text-xs text-gray-500">Please wait for admin approval.</p>
                               </div>
                           )}

                           {myAspirantProfile.paymentStatus === PaymentStatus.PAID && (
                               <div className="text-center space-y-2">
                                   <div className="flex items-center text-green-600 font-bold justify-center">
                                       <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                       Payment Verified
                                   </div>
                                   <Button variant="outline" size="sm" onClick={downloadReceipt}>
                                       Download Receipt & Form
                                   </Button>
                               </div>
                           )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CANDIDATE PERFORMANCE WIDGET (Only if approved) */}
      {myCandidateProfile && (
          <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-lg shadow-lg p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
              <div className="relative z-10 flex justify-between items-center">
                  <div>
                      <p className="text-purple-200 font-bold uppercase text-xs tracking-wider">Campaign Performance</p>
                      <h2 className="text-2xl font-bold mt-1">{myCandidateProfile.position} Candidate</h2>
                      <p className="text-purple-100 text-sm mt-1">You are visible on the ballot.</p>
                  </div>
                  <div className="text-center">
                      <span className="block text-4xl font-extrabold">{myCandidateVotes}</span>
                      <span className="text-xs text-purple-200 uppercase">Total Votes</span>
                  </div>
              </div>
          </div>
      )}

      {/* VOTING SECTION */}
      {!votingOpen && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
             {/* ... existing alert content ... */}
             <div className="flex">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700">{getStatusMessage()}</p>
                </div>
            </div>
          </div>
      )}

      {groupedCandidates.map(group => {
        if (group.candidates.length === 0) return null;
        const voteForPosition = myVotes.find(v => v.position === group.position);
        
        return (
          <div key={group.position} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             {/* ... existing voting card content ... */}
             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{group.position}</h2>
              {voteForPosition && (
                 <span className="text-sm text-emerald-600 font-medium flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Voted
                 </span>
              )}
            </div>

            <div className="p-6">
               {voteForPosition ? (
                   <div className="text-center py-6 bg-emerald-50 rounded border border-emerald-100">
                        <p className="text-emerald-800 font-medium">You have voted for this position.</p>
                        <p className="text-xs text-emerald-600 mt-1">Receipt: {voteForPosition.id}</p>
                        <p className="text-xs text-emerald-600">Timestamp: {new Date(voteForPosition.timestamp).toLocaleString()}</p>
                   </div>
               ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {group.candidates.map(candidate => (
                    <div 
                        key={candidate.id} 
                        onClick={() => votingOpen && setSelectedCandidates(prev => ({ ...prev, [group.position]: candidate.id }))}
                        className={`border rounded-lg p-4 flex flex-col relative transition-all ${
                            votingOpen ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                        } ${
                            selectedCandidates[group.position] === candidate.id 
                            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 shadow-md' 
                            : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-start space-x-4">
                            <img src={candidate.photoUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover bg-gray-200" />
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center">
                                    {candidate.name}
                                    {candidate.matricNo === user.matricNo && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded uppercase font-bold">You</span>
                                    )}
                                </h3>
                                <p className="text-xs text-gray-500">{candidate.department}</p>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex-1">
                            <p className="text-sm text-gray-600 italic">"{candidate.manifesto}"</p>
                            
                            {aiAnalysis[candidate.id] ? (
                                <div className="mt-3 p-2 bg-purple-50 text-purple-800 text-xs rounded border border-purple-100">
                                    <strong>AI Summary:</strong> {aiAnalysis[candidate.id]}
                                </div>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleAnalyze(candidate); }}
                                    className="mt-2 text-xs text-purple-600 hover:text-purple-800 underline flex items-center"
                                    disabled={analyzingId === candidate.id}
                                >
                                    {analyzingId === candidate.id ? 'Analyzing...' : 'Ask AI to analyze manifesto ✨'}
                                </button>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 pointer-events-none">
                            <label className="flex items-center space-x-2 w-full">
                                <input 
                                    type="radio" 
                                    name={`vote-${group.position}`} 
                                    value={candidate.id}
                                    checked={selectedCandidates[group.position] === candidate.id}
                                    readOnly
                                    disabled={!votingOpen}
                                    className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300 disabled:text-gray-400"
                                />
                                <span className="text-sm font-medium text-gray-900">Select Candidate</span>
                            </label>
                        </div>
                    </div>
                    ))}
                </div>
               )}
            </div>
          </div>
        );
      })}

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 lg:px-8 gap-4">
            <div className="flex flex-col text-center sm:text-left">
                <span className="text-gray-900 font-bold text-lg">Your Ballot</span>
                <span className="text-sm text-gray-500">
                    {pendingCount} candidate{pendingCount !== 1 ? 's' : ''} selected
                </span>
            </div>
            <Button 
                onClick={handleInitiateVote} 
                disabled={pendingCount === 0 || submitting || !votingOpen}
                className="w-full sm:w-auto px-12 py-3 text-lg shadow-md font-semibold"
            >
                {submitting ? 'Submitting...' : !votingOpen ? 'Voting Closed' : 'Cast Votes'}
            </Button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
             <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPaymentModal(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Purchase Nomination Form</h3>
                        <p className="text-sm text-gray-600 mb-4">Please make a transfer of <span className="font-bold text-lg text-emerald-600">₦{aspirantPositionPrice.toLocaleString()}</span> to the account below:</p>
                        
                        <div className="bg-gray-100 p-4 rounded mb-6 text-center space-y-1 border border-gray-200">
                            <p className="text-sm text-gray-500 uppercase">Bank Name</p>
                            <p className="font-bold text-lg">Moniepoint</p>
                            
                            <p className="text-sm text-gray-500 uppercase mt-2">Account Number</p>
                            <p className="font-mono text-2xl font-bold tracking-widest text-emerald-700 bg-white inline-block px-3 py-1 rounded border border-gray-300">5449087183</p>
                            
                            <p className="text-sm text-gray-500 uppercase mt-2">Account Name</p>
                            <p className="font-bold text-lg">Abdulwasiu Abubakar</p>
                        </div>
                        
                        <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mb-4">
                            <strong>Note:</strong> After transfer, click "I have made payment" below. Admin approval is required before your form is valid.
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button onClick={handleConfirmPayment} className="w-full sm:ml-3 sm:w-auto" isLoading={submitting}>I have made the payment</Button>
                        <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto">Cancel</Button>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* Confirmation & Success Modals (Existing code...) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowConfirmModal(false)}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        {/* ... */}
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Your Vote</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 mb-4">You are about to cast votes for the following candidates. This action cannot be undone.</p>
                                    <ul className="bg-gray-50 rounded p-3 text-sm space-y-2">
                                        {getPendingVotes().map(([pos, cId]) => {
                                            const cand = candidates.find(c => c.id === cId);
                                            return (
                                                <li key={pos} className="flex justify-between">
                                                    <span className="font-semibold text-gray-700">{pos}:</span>
                                                    <span className="text-gray-900">{cand?.name}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button onClick={handleConfirmVote} className="w-full sm:ml-3 sm:w-auto">Confirm Vote</Button>
                        <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto">Cancel</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                         <div className="mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
                            <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-center text-xl leading-6 font-bold text-gray-900">Vote Cast Successfully!</h3>
                        <p className="text-center text-sm text-gray-500 mt-2">Your vote has been securely recorded on the blockchain ledger.</p>
                        
                        <div className="mt-4 bg-gray-50 p-3 rounded text-center">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Transaction Receipts</p>
                            <div className="mt-1 text-xs text-gray-600 font-mono space-y-1">
                                {lastVoteReceipts.map(id => <div key={id}>{id}</div>)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-center">
                        <Button onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">Close & View Dashboard</Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
