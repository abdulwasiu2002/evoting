
import React, { useEffect, useState } from 'react';
import { User, Candidate, Position, Vote, ElectionSettings } from '../types';
import { db } from '../services/mockDb';
import { analyzeManifesto } from '../services/geminiService';
import { Button } from '../components/Button';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [results, setResults] = useState<{candidateId: string, count: number}[]>([]);
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  // Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastVoteReceipts, setLastVoteReceipts] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [c, v, p, s, r] = await Promise.all([
        db.getCandidates(),
        db.getMyVotes(user.id),
        db.getPositions(),
        db.getElectionSettings(),
        db.getResults()
      ]);
      setCandidates(c);
      setMyVotes(v);
      setPositions(p);
      setSettings(s);
      setResults(r); // Fetch results to show aspirant their own stats
      setLoading(false);
    };
    fetchData();
  }, [user.id]);

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
        // Cast votes sequentially
        for (const [position, candidateId] of votesToCast) {
            try {
                const vote = await db.castVote(user.id, candidateId as string, position as Position);
                successfulVotes.push(vote);
            } catch (err: any) {
                errors.push(`${position}: ${err.message}`);
            }
        }

        if (successfulVotes.length > 0) {
             setMyVotes(prev => [...prev, ...successfulVotes]);
             setLastVoteReceipts(successfulVotes.map(v => v.id));
             
             // Update results locally so aspirant sees their count go up immediately
             const newResults = [...results];
             successfulVotes.forEach(v => {
                 const existing = newResults.find(r => r.candidateId === v.candidateId);
                 if (existing) existing.count++;
                 else newResults.push({ candidateId: v.candidateId, count: 1 });
             });
             setResults(newResults);

             // Clear selections
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

  const groupedCandidates = positions.map(position => ({
    position,
    candidates: candidates.filter(c => c.position === position)
  }));

  const pendingCount = getPendingVotes().length;
  const votingOpen = isVotingOpen();

  // CHECK IF USER IS A CANDIDATE
  const myCandidateProfile = candidates.find(c => c.matricNo === user.matricNo);
  const myCandidateVotes = myCandidateProfile ? (results.find(r => r.candidateId === myCandidateProfile.id)?.count || 0) : 0;

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

      {/* ASPIRANT / CANDIDATE WIDGET */}
      {myCandidateProfile && (
          <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-lg shadow-lg p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
              <div className="relative z-10 flex justify-between items-center">
                  <div>
                      <p className="text-purple-200 font-bold uppercase text-xs tracking-wider">Campaign Performance</p>
                      <h2 className="text-2xl font-bold mt-1">{myCandidateProfile.position} Candidate</h2>
                      <p className="text-purple-100 text-sm mt-1">You are currently visible on the ballot.</p>
                  </div>
                  <div className="text-center">
                      <span className="block text-4xl font-extrabold">{myCandidateVotes}</span>
                      <span className="text-xs text-purple-200 uppercase">Total Votes</span>
                  </div>
              </div>
          </div>
      )}

      {!votingOpen && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                        {getStatusMessage()}
                    </p>
                </div>
            </div>
          </div>
      )}

      {groupedCandidates.map(group => {
        // If no candidates for this position, skip rendering it
        if (group.candidates.length === 0) return null;

        const voteForPosition = myVotes.find(v => v.position === group.position);
        
        return (
          <div key={group.position} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                                    {/* Tag if this is YOU */}
                                    {candidate.matricNo === user.matricNo && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded uppercase font-bold">You</span>
                                    )}
                                </h3>
                                <p className="text-xs text-gray-500">{candidate.department}</p>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex-1">
                            <p className="text-sm text-gray-600 italic">"{candidate.manifesto}"</p>
                            
                            {/* Gemini AI Integration */}
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

      {/* Fixed Bottom Bar for Casting Votes */}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowConfirmModal(false)}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
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
