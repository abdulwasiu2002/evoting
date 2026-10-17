import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, ChevronRight, ChevronLeft, Save, 
  Calendar, Layers, Users, Award, ShieldCheck, AlertCircle, Plus, Trash2, Edit2
} from 'lucide-react';
import { Election, ElectionStatus, Position, DEFAULT_ELECTION_ID } from '../types';
import { Button } from './Button';

interface ElectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (electionData: Omit<Election, 'createdAt' | 'updatedAt'>, positions?: Position[]) => Promise<void>;
  initialElection?: Election | null;
  departments: string[];
  existingPositions?: Position[];
  adminId: string;
}

export const ElectionWizard: React.FC<ElectionWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  initialElection,
  departments,
  existingPositions = [],
  adminId
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [id, setId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [session, setSession] = useState<string>('2025/2026');
  const [description, setDescription] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<ElectionStatus>('draft');
  const [isVotingEnabled, setIsVotingEnabled] = useState<boolean>(false);

  // Step 2: Eligibility
  const [allLevelsEligible, setAllLevelsEligible] = useState<boolean>(true);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['ND I', 'ND II', 'HND I', 'HND II']);
  const [allDeptsEligible, setAllDeptsEligible] = useState<boolean>(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  // Step 3: Positions for this election
  const [electionPositions, setElectionPositions] = useState<Position[]>([]);
  const [newPosName, setNewPosName] = useState<string>('');
  const [newPosPrice, setNewPosPrice] = useState<number>(3000);
  const [newPosLevel, setNewPosLevel] = useState<string>('All');
  const [editingPosIndex, setEditingPosIndex] = useState<number | null>(null);

  // Step 4: Nominations & Screening
  const [aspirantRegistrationOpen, setAspirantRegistrationOpen] = useState<boolean>(true);
  const [aspirantFeeRequired, setAspirantFeeRequired] = useState<boolean>(true);
  const [minCgpaRequirement, setMinCgpaRequirement] = useState<string>('2.50');

  const availableLevels = ['ND I', 'ND II', 'HND I', 'HND II'];

  useEffect(() => {
    if (initialElection) {
      setId(initialElection.id);
      setTitle(initialElection.title);
      setSession(initialElection.session || '2025/2026');
      setDescription(initialElection.description || '');
      setStartDate(initialElection.startDate ? initialElection.startDate.split('T')[0] : '');
      setEndDate(initialElection.endDate ? initialElection.endDate.split('T')[0] : '');
      setStatus(initialElection.status);
      setIsVotingEnabled(initialElection.isVotingEnabled);

      if (initialElection.eligibleLevels && !initialElection.eligibleLevels.includes('All')) {
        setAllLevelsEligible(false);
        setSelectedLevels(initialElection.eligibleLevels);
      } else {
        setAllLevelsEligible(true);
        setSelectedLevels(availableLevels);
      }

      if (initialElection.eligibleDepartments && !initialElection.eligibleDepartments.includes('All')) {
        setAllDeptsEligible(false);
        setSelectedDepts(initialElection.eligibleDepartments);
      } else {
        setAllDeptsEligible(true);
        setSelectedDepts(departments);
      }

      setAspirantRegistrationOpen(initialElection.aspirantRegistrationOpen ?? true);
      setAspirantFeeRequired(initialElection.aspirantFeeRequired ?? true);

      // Positions
      const filtered = existingPositions.filter(p => (p.electionId || DEFAULT_ELECTION_ID) === initialElection.id);
      if (filtered.length > 0) {
        setElectionPositions(filtered);
      } else {
        // Provide standard positions template
        setElectionPositions([
          { name: 'President', price: 5000, eligibleLevel: 'HND II', electionId: initialElection.id },
          { name: 'Vice President', price: 4000, eligibleLevel: 'HND I', electionId: initialElection.id },
          { name: 'General Secretary', price: 3000, eligibleLevel: 'All', electionId: initialElection.id },
          { name: 'Financial Secretary', price: 3000, eligibleLevel: 'All', electionId: initialElection.id },
          { name: 'Treasurer', price: 3000, eligibleLevel: 'All', electionId: initialElection.id },
          { name: 'Director of Socials', price: 2500, eligibleLevel: 'All', electionId: initialElection.id },
          { name: 'P.R.O', price: 2500, eligibleLevel: 'All', electionId: initialElection.id },
          { name: 'Director of Sports', price: 2500, eligibleLevel: 'All', electionId: initialElection.id },
          { name: 'Director of Software', price: 2500, eligibleLevel: 'All', electionId: initialElection.id }
        ]);
      }
    } else {
      // New Election default
      const defaultId = `election-${Date.now().toString(36)}`;
      setId(defaultId);
      setTitle('');
      setSession('2025/2026');
      setDescription('');
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(nextWeek);
      setStatus('draft');
      setIsVotingEnabled(false);
      setAllLevelsEligible(true);
      setSelectedLevels(availableLevels);
      setAllDeptsEligible(true);
      setSelectedDepts(departments);
      setAspirantRegistrationOpen(true);
      setAspirantFeeRequired(true);

      // Standard positions template
      setElectionPositions([
        { name: 'President', price: 5000, eligibleLevel: 'HND II', electionId: defaultId },
        { name: 'Vice President', price: 4000, eligibleLevel: 'HND I', electionId: defaultId },
        { name: 'General Secretary', price: 3000, eligibleLevel: 'All', electionId: defaultId },
        { name: 'Financial Secretary', price: 3000, eligibleLevel: 'All', electionId: defaultId },
        { name: 'Treasurer', price: 3000, eligibleLevel: 'All', electionId: defaultId },
        { name: 'Director of Socials', price: 2500, eligibleLevel: 'All', electionId: defaultId },
        { name: 'P.R.O', price: 2500, eligibleLevel: 'All', electionId: defaultId },
        { name: 'Director of Sports', price: 2500, eligibleLevel: 'All', electionId: defaultId },
        { name: 'Director of Software', price: 2500, eligibleLevel: 'All', electionId: defaultId }
      ]);
    }
    setCurrentStep(1);
    setError(null);
  }, [initialElection, isOpen, departments]);

  if (!isOpen) return null;

  // Validation per step
  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!title.trim()) {
        setError('Election Title is required.');
        return false;
      }
      if (!session.trim()) {
        setError('Academic Session is required (e.g. 2025/2026).');
        return false;
      }
      if (!startDate) {
        setError('Start Date is required.');
        return false;
      }
      if (!endDate) {
        setError('End Date is required.');
        return false;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError('End Date must be equal to or after Start Date.');
        return false;
      }
    } else if (step === 2) {
      if (!allLevelsEligible && selectedLevels.length === 0) {
        setError('Please select at least one eligible student level or enable All Levels.');
        return false;
      }
      if (!allDeptsEligible && selectedDepts.length === 0) {
        setError('Please select at least one eligible department or enable All Departments.');
        return false;
      }
    } else if (step === 3) {
      if (electionPositions.length === 0) {
        setError('An election must define at least one executive position.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleAddOrUpdatePosition = () => {
    if (!newPosName.trim()) return;
    if (editingPosIndex !== null) {
      const updated = [...electionPositions];
      updated[editingPosIndex] = {
        name: newPosName.trim(),
        price: Number(newPosPrice) || 0,
        eligibleLevel: newPosLevel,
        electionId: id
      };
      setElectionPositions(updated);
      setEditingPosIndex(null);
    } else {
      if (electionPositions.some(p => p.name.toLowerCase() === newPosName.trim().toLowerCase())) {
        setError(`Position "${newPosName.trim()}" already exists in this election list.`);
        return;
      }
      setElectionPositions(prev => [
        ...prev,
        {
          name: newPosName.trim(),
          price: Number(newPosPrice) || 0,
          eligibleLevel: newPosLevel,
          electionId: id
        }
      ]);
    }
    setNewPosName('');
    setNewPosPrice(3000);
    setNewPosLevel('All');
    setError(null);
  };

  const handleEditPosition = (index: number) => {
    const pos = electionPositions[index];
    setNewPosName(pos.name);
    setNewPosPrice(pos.price);
    setNewPosLevel(pos.eligibleLevel);
    setEditingPosIndex(index);
  };

  const handleDeletePosition = (index: number) => {
    setElectionPositions(prev => prev.filter((_, i) => i !== index));
    if (editingPosIndex === index) {
      setEditingPosIndex(null);
      setNewPosName('');
    }
  };

  const handleSaveElection = async (targetStatus?: ElectionStatus) => {
    if (!validateStep(currentStep)) return;
    if (!title.trim() || !session.trim()) {
      setError('Title and Academic Session are mandatory.');
      return;
    }

    setSaving(true);
    setError(null);

    const finalStatus = targetStatus || status;
    const finalVotingEnabled = finalStatus === 'live' ? true : isVotingEnabled;

    const payload: Omit<Election, 'createdAt' | 'updatedAt'> = {
      id: id || `election-${Date.now().toString(36)}`,
      title: title.trim(),
      session: session.trim(),
      description: description.trim(),
      startDate,
      endDate,
      status: finalStatus,
      isVotingEnabled: finalVotingEnabled,
      eligibleLevels: allLevelsEligible ? ['All'] : selectedLevels,
      eligibleDepartments: allDeptsEligible ? ['All'] : selectedDepts,
      aspirantRegistrationOpen,
      aspirantFeeRequired,
      createdBy: adminId
    };

    try {
      await onSave(payload, electionPositions.map(p => ({ ...p, electionId: payload.id })));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save election configuration.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, title: 'Details', icon: Calendar, desc: 'Session, title & dates' },
    { num: 2, title: 'Eligibility', icon: Users, desc: 'Voter levels & departments' },
    { num: 3, title: 'Positions', icon: Award, desc: 'Executive posts & criteria' },
    { num: 4, title: 'Nominations', icon: ShieldCheck, desc: 'Aspirant rules & screening' },
    { num: 5, title: 'Review & Launch', icon: CheckCircle2, desc: 'Confirm & publish' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Multi-Election Wizard
              </span>
              <span className="text-xs text-slate-400">Step {currentStep} of 5</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {initialElection ? `Edit: ${initialElection.title}` : 'Create New NACOS Election'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="grid grid-cols-5 gap-2">
            {steps.map(s => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep || validateStep(currentStep)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 text-left p-1.5 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold shadow-sm'
                      : isDone
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-400 opacity-75'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isActive 
                      ? 'bg-emerald-600 text-white' 
                      : isDone 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isDone ? '✓' : s.num}
                  </div>
                  <div className="hidden sm:block truncate">
                    <div className="text-xs truncate">{s.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs">Dismiss</button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: Election Details */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Election General Information</h3>
                <p className="text-xs text-slate-500">Define the core identification, academic tenure, and schedule for this election.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Election Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. NACOS General Elections 2025/2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Academic Session <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={session}
                    onChange={e => setSession(e.target.value)}
                    placeholder="e.g. 2025/2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Identifies the tenure cohort in student voting slips and certificates.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ElectionStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  >
                    <option value="draft">Draft (Private, not visible to voters)</option>
                    <option value="scheduled">Scheduled (Visible countdown, voting opens on start date)</option>
                    <option value="live">Live (Active voting enabled immediately)</option>
                    <option value="closed">Closed (Voting ended, results archived)</option>
                    <option value="archived">Archived (Historical read-only record)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Description & Purpose
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of the positions contested, guidelines, or constitutional context..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Voter Eligibility */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Voter Eligibility & Scoping Rules</h3>
                <p className="text-xs text-slate-500">Determine which registered students can vote in this specific election.</p>
              </div>

              {/* Student Levels */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Student Academic Level Eligibility</h4>
                    <p className="text-xs text-slate-500">Allow all approved students or restrict by study level.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allLevelsEligible}
                      onChange={e => setAllLevelsEligible(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">All Levels Allowed</span>
                  </label>
                </div>

                {!allLevelsEligible && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    {availableLevels.map(lvl => {
                      const checked = selectedLevels.includes(lvl);
                      return (
                        <label key={lvl} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedLevels(prev => [...prev, lvl]);
                              } else {
                                setSelectedLevels(prev => prev.filter(x => x !== lvl));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-emerald-600"
                          />
                          <span>{lvl}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Departments */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Departmental Scope</h4>
                    <p className="text-xs text-slate-500">All computing departments or specific departmental by-election.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allDeptsEligible}
                      onChange={e => setAllDeptsEligible(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">All NACOS Departments</span>
                  </label>
                </div>

                {!allDeptsEligible && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 max-h-48 overflow-y-auto">
                    {departments.map(dept => {
                      const checked = selectedDepts.includes(dept);
                      return (
                        <label key={dept} className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedDepts(prev => [...prev, dept]);
                              } else {
                                setSelectedDepts(prev => prev.filter(x => x !== dept));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-emerald-600"
                          />
                          <span className="truncate">{dept}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Positions */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Contested Positions ({electionPositions.length})</h3>
                  <p className="text-xs text-slate-500">Configure executive positions, application fees, and candidate eligibility for this election.</p>
                </div>
              </div>

              {/* Add / Edit Position Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {editingPosIndex !== null ? 'Edit Position' : 'Add Executive Position'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Position Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Director of Research"
                      value={newPosName}
                      onChange={e => setNewPosName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Form Fee (₦)</label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={newPosPrice}
                      onChange={e => setNewPosPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Eligible Aspirant Level</label>
                    <select
                      value={newPosLevel}
                      onChange={e => setNewPosLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="All">All Levels</option>
                      <option value="HND II">HND II Only</option>
                      <option value="HND I">HND I Only</option>
                      <option value="ND II">ND II Only</option>
                      <option value="ND I">ND I Only</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  {editingPosIndex !== null && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPosIndex(null);
                        setNewPosName('');
                        setNewPosPrice(3000);
                        setNewPosLevel('All');
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddOrUpdatePosition}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {editingPosIndex !== null ? 'Update Position' : 'Add Position'}
                  </Button>
                </div>
              </div>

              {/* Position List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {electionPositions.map((pos, idx) => (
                  <div key={idx} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{pos.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Aspirant Level: <span className="font-semibold text-slate-700">{pos.eligibleLevel}</span> • Form Fee: <span className="font-semibold text-emerald-700">₦{pos.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditPosition(idx)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                        title="Edit position"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePosition(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        title="Delete position"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Nominations & Screening */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Aspirant Nominations & Vetting Criteria</h3>
                <p className="text-xs text-slate-500">Configure aspirant application portal behavior and screening threshold.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={aspirantRegistrationOpen}
                    onChange={e => setAspirantRegistrationOpen(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Open Aspirant Registration Portal</span>
                    <span className="text-[11px] text-slate-500 block">Allow eligible students to register online for executive positions in this election.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={aspirantFeeRequired}
                    onChange={e => setAspirantFeeRequired(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Enforce Nomination Fee Verification</span>
                    <span className="text-[11px] text-slate-500 block">Aspirants must upload proof of payment before admin screening and approval as a candidate.</span>
                  </div>
                </label>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Minimum Recommended CGPA for Candidates
                </label>
                <input
                  type="text"
                  value={minCgpaRequirement}
                  onChange={e => setMinCgpaRequirement(e.target.value)}
                  className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Used by the electoral screening committee to vet statement of results.</p>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Publish */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Review & Publish Election</h3>
                <p className="text-xs text-slate-500">Confirm election settings and set publication status.</p>
              </div>

              {/* Overview Card */}
              <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">Academic Session: {session}</div>
                    <div className="text-lg font-bold mt-0.5">{title}</div>
                    <div className="text-xs text-slate-400 mt-1">{description || 'No description provided.'}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    status === 'live' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    status === 'scheduled' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    status === 'closed' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Start Date</span>
                    <span className="font-semibold text-slate-200">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">End Date</span>
                    <span className="font-semibold text-slate-200">{endDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Positions</span>
                    <span className="font-semibold text-emerald-400">{electionPositions.length} Contested</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Eligible Levels</span>
                    <span className="font-semibold text-slate-200">{allLevelsEligible ? 'All Levels' : selectedLevels.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Publication Status Selector */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Choose Publication Action
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => { setStatus('draft'); setIsVotingEnabled(false); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      status === 'draft' 
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-amber-800">Save as Draft</div>
                    <div className="text-[11px] text-slate-500 mt-1">Keeps configuration private for further editing before launch.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStatus('scheduled'); setIsVotingEnabled(false); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      status === 'scheduled' 
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-blue-800">Schedule Launch</div>
                    <div className="text-[11px] text-slate-500 mt-1">Shows countdown timer on landing page until start date.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStatus('live'); setIsVotingEnabled(true); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      status === 'live' 
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-emerald-800">Publish as LIVE</div>
                    <div className="text-[11px] text-slate-500 mt-1">Opens voting immediately for all eligible registered voters.</div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="gap-1.5"
                disabled={saving}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveElection('draft')}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>

            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                className="gap-1.5"
                disabled={saving}
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveElection()}
                isLoading={saving}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Save Election
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
