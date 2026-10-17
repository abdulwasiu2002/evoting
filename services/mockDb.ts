import { 
  User, Candidate, Vote, AuditLog, UserRole, ApprovalStatus, Position, 
  ElectionSettings, Aspirant, PaymentStatus, OutgoingExecutive, ExecutiveStatus,
  Election, ElectionStatus, DEFAULT_ELECTION, DEFAULT_ELECTION_ID 
} from '../types';
import { sendEmail } from './emailService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// --- CONFIGURATION ---
const USE_MOCK_DB = !isSupabaseConfigured(); 

// Constants for LocalStorage keys (Mock Mode)
const ELECTIONS_KEY = 'univote_elections';
const USERS_KEY = 'univote_users';
const CANDIDATES_KEY = 'univote_candidates';
const VOTES_KEY = 'univote_votes';
const AUDIT_KEY = 'univote_audit';
const POSITIONS_KEY = 'univote_positions';
const DEPARTMENTS_KEY = 'univote_departments';
const SETTINGS_KEY = 'univote_settings';
const ASPIRANTS_KEY = 'univote_aspirants';
const EXECUTIVES_KEY = 'univote_executives';

// Initial Seed Data (Mock Mode)
const seedAdmin: User = {
  id: 'admin-1',
  fullName: 'NACOS Administrator',
  matricNo: 'admin',
  department: 'Computer Science',
  role: UserRole.ADMIN,
  status: ApprovalStatus.APPROVED,
  passwordHash: 'admin123',
  createdAt: Date.now()
};

const seedPositions: Position[] = [
  { name: 'President', price: 5000, eligibleLevel: 'HND II', electionId: DEFAULT_ELECTION_ID },
  { name: 'Vice President', price: 4000, eligibleLevel: 'HND I', electionId: DEFAULT_ELECTION_ID },
  { name: 'General Secretary', price: 3000, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID },
  { name: 'Financial Secretary', price: 3000, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID },
  { name: 'Treasurer', price: 3000, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID },
  { name: 'Director of Socials', price: 2500, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID },
  { name: 'P.R.O', price: 2500, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID },
  { name: 'Director of Sports', price: 2500, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID },
  { name: 'Director of Software', price: 2500, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID }
];

const seedDepartments = [
  'Computer Science',
  'Software Engineering',
  'Cyber Security',
  'Information Systems',
  'Information Technology'
];

const seedCandidates: Candidate[] = [
  {
    id: 'c-1',
    name: 'Chioma Okeke',
    matricNo: 'CS/2021/001',
    department: 'Computer Science',
    position: 'President',
    manifesto: 'My vision is a NACOS that connects every student to industry opportunities. I will launch the "Code & Earn" initiative and ensure transparent dues management.',
    photoUrl: 'https://picsum.photos/200/200?random=1',
    electionId: DEFAULT_ELECTION_ID
  },
  {
    id: 'c-2',
    name: 'Ahmed Ibrahim',
    matricNo: 'CS/2021/045',
    department: 'Computer Science',
    position: 'President',
    manifesto: 'Inclusivity is key. I promise to organize more tutorials for freshers and ensure the departmental laboratory is accessible 24/7.',
    photoUrl: 'https://picsum.photos/200/200?random=2',
    electionId: DEFAULT_ELECTION_ID
  }
];

const defaultSettings: ElectionSettings = {
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  isVotingEnabled: true,
  electionId: DEFAULT_ELECTION_ID
};

const seedExecutives: OutgoingExecutive[] = [
  {
    id: 'exec-1',
    fullName: 'David Olawale',
    position: 'President',
    session: '2025/2026 Administration',
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    biography: 'Served as the president, focusing on student welfarism and academic excellence.',
    achievements: 'Launched the Code & Earn initiative. Secured 50 laptops for the department.',
    appreciationMessage: 'Thank you for your support throughout my tenure. It was an honor to serve.',
    quote: 'Leadership is service, not position.',
    profileImage: 'https://picsum.photos/400/500?random=10',
    status: ExecutiveStatus.OUTGOING,
    createdAt: Date.now()
  },
  {
    id: 'exec-2',
    fullName: 'Sarah Johnson',
    position: 'Vice President',
    session: '2025/2026 Administration',
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    biography: 'Focused on student inclusivity and tech bootcamps.',
    achievements: 'Organized 3 major hackathons. Mentored 100+ freshers.',
    appreciationMessage: 'I am grateful to everyone who contributed to our success.',
    quote: 'Great things in business are never done by one person.',
    profileImage: 'https://picsum.photos/400/500?random=11',
    status: ExecutiveStatus.OUTGOING,
    createdAt: Date.now()
  }
];

// Helper to simulate delay for Mock Mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Listener = (data?: any) => void;

export interface IDatabaseService {
  subscribe(event: string, callback: Listener): () => void;
  connectToLiveUpdates(event: string, callback: Listener): () => void;
  
  // Elections
  getElections(): Promise<Election[]>;
  getElection(id: string): Promise<Election | null>;
  getActiveElection(): Promise<Election>;
  createElection(adminId: string, data: Omit<Election, 'createdAt' | 'updatedAt'>): Promise<Election>;
  updateElection(adminId: string, election: Partial<Election> & { id: string }): Promise<Election>;
  deleteElection(adminId: string, electionId: string): Promise<void>;
  archiveElection(adminId: string, electionId: string): Promise<Election>;
  setElectionStatus(adminId: string, electionId: string, status: ElectionStatus): Promise<Election>;

  // Settings
  getElectionSettings(electionId?: string): Promise<ElectionSettings>;
  getElectionStats(electionId?: string): Promise<{
      totalApproved: number,
      totalRejected: number,
      totalPending: number,
      totalVotesCast: number,
      distinctVoters: number
  }>;
  updateElectionSettings(adminId: string, settings: ElectionSettings, electionId?: string): Promise<ElectionSettings>;
  
  // Departments
  getDepartments(): Promise<string[]>;
  addDepartment(adminId: string, name: string): Promise<string>;
  removeDepartment(adminId: string, name: string): Promise<void>;
  
  // Positions
  getPositions(electionId?: string): Promise<Position[]>;
  addPosition(adminId: string, name: string, price: number, level: string, electionId?: string): Promise<Position>;
  removePosition(adminId: string, name: string, electionId?: string): Promise<void>;
  
  // Auth
  login(matricNo: string, password: string): Promise<User>;
  register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User>;
  getPendingUsers(): Promise<User[]>;
  processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void>;
  
  // Aspirants
  registerAspirant(data: Omit<Aspirant, 'id' | 'status' | 'createdAt' | 'paymentStatus'>, electionId?: string): Promise<Aspirant>;
  registerAspirantUser(data: {
      fullName: string, matricNo: string, department: string, level: string, passwordHash: string, idCardUrl: string,
      position: string, cgpa: string, manifesto: string, passportUrl: string, resultUrl: string, address: string, phone: string
  }, electionId?: string): Promise<void>;
  getAspirants(electionId?: string): Promise<Aspirant[]>;
  getMyAspirantProfile(matricNo: string, electionId?: string): Promise<Aspirant | null>;
  processAspirant(adminId: string, aspirantId: string, approved: boolean): Promise<void>;
  
  // Payment
  markPaymentAsPending(aspirantId: string, receiptBase64?: string): Promise<void>;
  verifyPayment(adminId: string, aspirantId: string): Promise<void>;

  // Voting
  getCandidates(electionId?: string): Promise<Candidate[]>;
  getVotingCandidates(electionId?: string): Promise<Candidate[]>;
  addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>, electionId?: string): Promise<Candidate>;
  updateCandidate(adminId: string, candidate: Candidate, electionId?: string): Promise<Candidate>;
  removeCandidate(adminId: string, candidateId: string, electionId?: string): Promise<void>;
  castVote(studentId: string, candidateId: string, position: string, electionId?: string): Promise<Vote>;
  getMyVotes(studentId: string, electionId?: string): Promise<Vote[]>;
  getResults(electionId?: string): Promise<{candidateId: string, count: number}[]>;
  getCandidateVoteCount(candidateId: string, electionId?: string): Promise<number>;
  
  // Analytics
  getAuditLogs(adminId: string, electionId?: string): Promise<AuditLog[]>;
  getDepartmentStats(electionId?: string): Promise<{name: string, count: number}[]>;
  getVoterBreakdown(electionId?: string): Promise<{
      byLevel: {name: string, count: number}[],
      byDepartment: {name: string, count: number}[]
  }>;

  // Outgoing Executives
  getOutgoingExecutives(): Promise<OutgoingExecutive[]>;
  addOutgoingExecutive(adminId: string, exec: Omit<OutgoingExecutive, 'id' | 'createdAt'>): Promise<OutgoingExecutive>;
  updateOutgoingExecutive(adminId: string, exec: OutgoingExecutive): Promise<OutgoingExecutive>;
  deleteOutgoingExecutive(adminId: string, execId: string): Promise<void>;
}

// ----------------------------------------------------------------------
// 1. LOCAL MOCK DB (Browser Storage - For Demo/Prototyping)
// ----------------------------------------------------------------------

class MockDB implements IDatabaseService {
  private listeners: Record<string, Listener[]> = {};
  private memoryStore: Record<string, string> = {};

  constructor() {
    this.init();
    console.log("MockDB Initialized (Demo Mode - LocalStorage with Multi-Election)");
    
    // Listen for storage events to support multi-tab real-time updates
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === VOTES_KEY) {
          this.emit('vote_update', null);
        }
        if (event.key === USERS_KEY) {
          this.emit('user_update', null);
        }
        if (event.key === ELECTIONS_KEY) {
          this.emit('election_update', null);
        }
      });
    }
  }

  public subscribe(event: string, callback: Listener): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  public connectToLiveUpdates(event: string, callback: Listener): () => void {
    return this.subscribe(event, callback);
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  private getStorage(): { getItem: (k: string) => string | null, setItem: (k: string, v: string) => void } {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return {
      getItem: (k: string) => this.memoryStore[k] || null,
      setItem: (k: string, v: string) => { this.memoryStore[k] = v; }
    };
  }

  private init() {
    try {
      const storage = this.getStorage();
      if (!storage.getItem(ELECTIONS_KEY)) {
        storage.setItem(ELECTIONS_KEY, JSON.stringify([DEFAULT_ELECTION]));
      } else {
        // Ensure default baseline exists
        const elections = this.getItems<Election>(ELECTIONS_KEY);
        if (!elections.some(e => e.id === DEFAULT_ELECTION_ID)) {
          elections.unshift(DEFAULT_ELECTION);
          this.setItems(ELECTIONS_KEY, elections);
        }
      }

      if (!storage.getItem(USERS_KEY)) {
        storage.setItem(USERS_KEY, JSON.stringify([seedAdmin]));
      }
      if (!storage.getItem(POSITIONS_KEY)) {
        storage.setItem(POSITIONS_KEY, JSON.stringify(seedPositions));
      }
      if (!storage.getItem(DEPARTMENTS_KEY)) {
        storage.setItem(DEPARTMENTS_KEY, JSON.stringify(seedDepartments));
      }
      if (!storage.getItem(CANDIDATES_KEY)) {
        storage.setItem(CANDIDATES_KEY, JSON.stringify(seedCandidates));
      }
      if (!storage.getItem(VOTES_KEY)) {
        storage.setItem(VOTES_KEY, JSON.stringify([]));
      }
      if (!storage.getItem(AUDIT_KEY)) {
        storage.setItem(AUDIT_KEY, JSON.stringify([]));
      }
      if (!storage.getItem(SETTINGS_KEY)) {
        storage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      }
      if (!storage.getItem(ASPIRANTS_KEY)) {
        storage.setItem(ASPIRANTS_KEY, JSON.stringify([]));
      }
      if (!storage.getItem(EXECUTIVES_KEY)) {
        storage.setItem(EXECUTIVES_KEY, JSON.stringify(seedExecutives));
      }
    } catch (e) {
      console.warn("Could not initialize local storage (Quota exceeded?)", e);
    }
  }

  private getItems<T>(key: string): T[] {
    const item = this.getStorage().getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItems<T>(key: string, items: T[]) {
    try {
      this.getStorage().setItem(key, JSON.stringify(items));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         throw new Error("Demo storage quota exceeded. Please clear some data or use smaller images.");
      }
      throw e;
    }
  }
  
  private getItem<T>(key: string): T | null {
    const item = this.getStorage().getItem(key);
    return item ? JSON.parse(item) : null;
  }

  private setItem<T>(key: string, item: T) {
    try {
      this.getStorage().setItem(key, JSON.stringify(item));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         throw new Error("Demo storage quota exceeded.");
      }
      throw e;
    }
  }


  private addAudit(actorId: string, role: UserRole, action: string, details: string, targetId?: string, electionId?: string) {
    try {
        const logs = this.getItems<AuditLog>(AUDIT_KEY);
        if (logs.length > 100) logs.pop();
        
        logs.unshift({
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            actorId,
            actorRole: role,
            actionType: action,
            details,
            targetId,
            electionId: electionId || DEFAULT_ELECTION_ID,
            timestamp: Date.now()
        });
        this.setItems(AUDIT_KEY, logs);
    } catch (e) {
        console.warn("Could not save audit log due to storage limits");
    }
  }

  // --- ELECTIONS (MockDB) ---
  async getElections(): Promise<Election[]> {
    await delay(150);
    const elections = this.getItems<Election>(ELECTIONS_KEY);
    if (!elections || elections.length === 0) {
      this.setItems(ELECTIONS_KEY, [DEFAULT_ELECTION]);
      return [DEFAULT_ELECTION];
    }
    return elections;
  }

  async getElection(id: string): Promise<Election | null> {
    const elections = await this.getElections();
    return elections.find(e => e.id === id) || null;
  }

  async getActiveElection(): Promise<Election> {
    const elections = await this.getElections();
    const live = elections.find(e => e.status === 'live');
    if (live) return live;
    const scheduled = elections.find(e => e.status === 'scheduled');
    if (scheduled) return scheduled;
    return elections[0] || DEFAULT_ELECTION;
  }

  async createElection(adminId: string, data: Omit<Election, 'createdAt' | 'updatedAt'>): Promise<Election> {
    await delay(300);
    const elections = await this.getElections();
    if (elections.some(e => e.id === data.id)) {
      throw new Error(`Election with ID "${data.id}" already exists.`);
    }

    const newElection: Election = {
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: adminId
    };

    // If new election is set to live, close any previously live election
    if (newElection.status === 'live') {
      elections.forEach(e => {
        if (e.status === 'live') {
          e.status = 'closed';
          e.updatedAt = Date.now();
        }
      });
    }

    elections.unshift(newElection);
    this.setItems(ELECTIONS_KEY, elections);
    this.addAudit(adminId, UserRole.ADMIN, 'election_created', `Created election: ${newElection.title}`, newElection.id, newElection.id);
    this.emit('election_update', newElection);
    return newElection;
  }

  async updateElection(adminId: string, election: Partial<Election> & { id: string }): Promise<Election> {
    await delay(250);
    const elections = await this.getElections();
    const idx = elections.findIndex(e => e.id === election.id);
    if (idx === -1) throw new Error("Election not found");

    if (election.status === 'live' && elections[idx].status !== 'live') {
      elections.forEach(e => {
        if (e.id !== election.id && e.status === 'live') {
          e.status = 'closed';
          e.updatedAt = Date.now();
        }
      });
    }

    const updated: Election = {
      ...elections[idx],
      ...election,
      updatedAt: Date.now()
    };
    elections[idx] = updated;
    this.setItems(ELECTIONS_KEY, elections);
    this.addAudit(adminId, UserRole.ADMIN, 'election_updated', `Updated election: ${updated.title}`, updated.id, updated.id);
    this.emit('election_update', updated);
    return updated;
  }

  async deleteElection(adminId: string, electionId: string): Promise<void> {
    await delay(250);
    // CRITICAL SAFETY CHECK: Cannot delete election containing votes!
    const votes = this.getItems<Vote>(VOTES_KEY);
    const hasVotes = votes.some(v => (v.electionId || DEFAULT_ELECTION_ID) === electionId);
    if (hasVotes) {
      throw new Error("Cannot delete election containing vote records. Please archive the election instead to preserve the permanent audit trail.");
    }
    if (electionId === DEFAULT_ELECTION_ID) {
      throw new Error("Cannot delete the primary live NACOS election record. It can only be archived.");
    }

    let elections = await this.getElections();
    const target = elections.find(e => e.id === electionId);
    elections = elections.filter(e => e.id !== electionId);
    this.setItems(ELECTIONS_KEY, elections);

    // Clean up draft positions and candidates belonging to this election
    let candidates = this.getItems<Candidate>(CANDIDATES_KEY);
    candidates = candidates.filter(c => (c.electionId || DEFAULT_ELECTION_ID) !== electionId);
    this.setItems(CANDIDATES_KEY, candidates);

    let positions = this.getItems<Position>(POSITIONS_KEY);
    positions = positions.filter(p => (p.electionId || DEFAULT_ELECTION_ID) !== electionId);
    this.setItems(POSITIONS_KEY, positions);

    this.addAudit(adminId, UserRole.ADMIN, 'election_deleted', `Deleted draft election: ${target?.title || electionId}`, electionId, electionId);
    this.emit('election_update', null);
  }

  async archiveElection(adminId: string, electionId: string): Promise<Election> {
    return this.setElectionStatus(adminId, electionId, 'archived');
  }

  async setElectionStatus(adminId: string, electionId: string, status: ElectionStatus): Promise<Election> {
    return this.updateElection(adminId, { 
      id: electionId, 
      status,
      isVotingEnabled: status === 'live'
    });
  }

  // --- SETTINGS & STATS ---
  async getElectionSettings(electionId?: string): Promise<ElectionSettings> {
    await delay(150);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const elections = this.getItems<Election>(ELECTIONS_KEY);
    const election = elections.find(e => e.id === targetElectionId);
    if (election) {
      return {
        startDate: election.startDate,
        endDate: election.endDate,
        isVotingEnabled: election.status === 'live' && election.isVotingEnabled,
        electionId: election.id
      };
    }
    return this.getItem<ElectionSettings>(SETTINGS_KEY) || defaultSettings;
  }

  async getElectionStats(electionId?: string): Promise<{
      totalApproved: number,
      totalRejected: number,
      totalPending: number,
      totalVotesCast: number,
      distinctVoters: number
  }> {
    await delay(150);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const users = this.getItems<User>(USERS_KEY).filter(u => u.role === 'student');
    const votes = this.getItems<Vote>(VOTES_KEY).filter(v => (v.electionId || DEFAULT_ELECTION_ID) === targetElectionId);

    // Scoped eligibility filtering if configured
    const elections = this.getItems<Election>(ELECTIONS_KEY);
    const currentElection = elections.find(e => e.id === targetElectionId);
    let eligibleUsers = users;
    if (currentElection?.eligibleLevels && !currentElection.eligibleLevels.includes('All')) {
      eligibleUsers = eligibleUsers.filter(u => u.level && currentElection.eligibleLevels!.includes(u.level));
    }
    if (currentElection?.eligibleDepartments && !currentElection.eligibleDepartments.includes('All')) {
      eligibleUsers = eligibleUsers.filter(u => u.department && currentElection.eligibleDepartments!.includes(u.department));
    }

    const totalApproved = eligibleUsers.filter(u => u.status === 'approved').length;
    const totalRejected = eligibleUsers.filter(u => u.status === 'rejected').length;
    const totalPending = eligibleUsers.filter(u => u.status === 'pending' || !u.status).length;
    const totalVotesCast = votes.length;
    const approvedUserIds = new Set(eligibleUsers.filter(u => u.status === 'approved').map(u => u.id));
    const distinctVoters = new Set(votes.map(v => v.studentId).filter(id => approvedUserIds.has(id))).size;
    return { totalApproved, totalRejected, totalPending, totalVotesCast, distinctVoters };
  }

  async updateElectionSettings(adminId: string, settings: ElectionSettings, electionId?: string): Promise<ElectionSettings> {
    await delay(200);
    const targetElectionId = electionId || settings.electionId || DEFAULT_ELECTION_ID;
    this.setItem(SETTINGS_KEY, settings);

    const elections = this.getItems<Election>(ELECTIONS_KEY);
    const idx = elections.findIndex(e => e.id === targetElectionId);
    if (idx !== -1) {
      elections[idx].startDate = settings.startDate;
      elections[idx].endDate = settings.endDate;
      elections[idx].isVotingEnabled = settings.isVotingEnabled;
      elections[idx].updatedAt = Date.now();
      this.setItems(ELECTIONS_KEY, elections);
    }
    return settings;
  }

  // --- DEPARTMENTS ---
  async getDepartments(): Promise<string[]> {
    await delay(150);
    return this.getItems<string>(DEPARTMENTS_KEY);
  }

  async addDepartment(adminId: string, name: string): Promise<string> {
    const depts = this.getItems<string>(DEPARTMENTS_KEY);
    if (depts.includes(name)) throw new Error("Department already exists");
    depts.push(name);
    this.setItems(DEPARTMENTS_KEY, depts);
    return name;
  }

  async removeDepartment(adminId: string, name: string): Promise<void> {
    let depts = this.getItems<string>(DEPARTMENTS_KEY);
    depts = depts.filter(d => d !== name);
    this.setItems(DEPARTMENTS_KEY, depts);
  }

  // --- POSITIONS ---
  async getPositions(electionId?: string): Promise<Position[]> {
    await delay(150);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const pos = this.getItems<any>(POSITIONS_KEY);
    if (pos.length > 0 && typeof pos[0] === 'string') {
        return pos.map((p: string) => ({ name: p, price: 0, eligibleLevel: 'All', electionId: DEFAULT_ELECTION_ID }));
    }
    return (pos as Position[]).filter(p => (p.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
  }

  async addPosition(adminId: string, name: string, price: number, level: string, electionId?: string): Promise<Position> {
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const positions = this.getItems<Position>(POSITIONS_KEY);
    if (positions.some(p => p.name.toLowerCase() === name.toLowerCase() && (p.electionId || DEFAULT_ELECTION_ID) === targetElectionId)) {
      throw new Error(`Position "${name}" already exists in this election`);
    }
    const newPos: Position = { id: `pos-${Date.now()}`, name, price, eligibleLevel: level, electionId: targetElectionId };
    positions.push(newPos);
    this.setItems(POSITIONS_KEY, positions);
    this.addAudit(adminId, UserRole.ADMIN, 'position_added', `Added position ${name} to election`, newPos.id, targetElectionId);
    return newPos;
  }

  async removePosition(adminId: string, name: string, electionId?: string): Promise<void> {
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    let positions = this.getItems<Position>(POSITIONS_KEY);
    positions = positions.filter(p => !(p.name === name && (p.electionId || DEFAULT_ELECTION_ID) === targetElectionId));
    this.setItems(POSITIONS_KEY, positions);
    this.addAudit(adminId, UserRole.ADMIN, 'position_removed', `Removed position ${name} from election`, undefined, targetElectionId);
  }

  // --- AUTH ---
  async login(matricNo: string, password: string): Promise<User> {
    await delay(400);
    const users = this.getItems<User>(USERS_KEY);
    const user = users.find(u => u.matricNo === matricNo && u.passwordHash === password);
    
    if (!user) throw new Error('Invalid credentials');
    
    if (user.role === UserRole.STUDENT && user.status !== ApprovalStatus.APPROVED) {
        if (user.status === ApprovalStatus.REJECTED) throw new Error(`Registration rejected: ${user.rejectionReason}`);
        throw new Error('Account pending approval');
    }
    return user;
  }

  async register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
    await delay(500);
    const users = this.getItems<User>(USERS_KEY);
    const existingIndex = users.findIndex(u => u.matricNo === data.matricNo);
    
    if (existingIndex !== -1) {
        const existingUser = users[existingIndex];
        if (existingUser.status === ApprovalStatus.REJECTED) {
             const updatedUser: User = {
                ...existingUser,
                fullName: data.fullName,
                department: data.department,
                level: data.level,
                passwordHash: data.passwordHash,
                idCardUrl: data.idCardUrl || existingUser.idCardUrl,
                status: ApprovalStatus.PENDING,
                rejectionReason: undefined,
                createdAt: Date.now()
             };
             users[existingIndex] = updatedUser;
             this.setItems(USERS_KEY, users);
             this.addAudit('system', UserRole.GUEST, 'registration_resubmitted', `User ${updatedUser.fullName} re-registered`, updatedUser.id);
             this.emit('user_update', updatedUser);
             return updatedUser;
        } else {
             throw new Error('Matric number already registered');
        }
    }

    const newUser: User = {
      ...data,
      id: `u-${Date.now()}`,
      role: UserRole.STUDENT,
      status: ApprovalStatus.PENDING,
      createdAt: Date.now(),
      idCardUrl: data.idCardUrl || 'https://picsum.photos/400/300?grayscale'
    };
    users.push(newUser);
    this.setItems(USERS_KEY, users);
    
    this.addAudit('system', UserRole.GUEST, 'registration_submitted', `User ${newUser.fullName} registered`, newUser.id);
    this.emit('user_update', newUser);
    return newUser;
  }

  async getPendingUsers(): Promise<User[]> {
    await delay(200);
    return this.getItems<User>(USERS_KEY).filter(u => u.status === ApprovalStatus.PENDING);
  }

  async processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void> {
    await delay(300);
    const users = this.getItems<User>(USERS_KEY);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    const user = users[idx];
    user.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    if (!approved && reason) user.rejectionReason = reason;
    this.setItems(USERS_KEY, users);
    this.addAudit(adminId, UserRole.ADMIN, approved ? 'registration_approved' : 'registration_rejected', `User ${user.matricNo} processed`, userId);
    this.emit('user_update', user);
  }

  // --- ASPIRANTS ---
  async registerAspirant(data: Omit<Aspirant, 'id' | 'status' | 'createdAt' | 'paymentStatus'>, electionId?: string): Promise<Aspirant> {
    await delay(500);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
    if (aspirants.some(a => a.matricNo === data.matricNo && (a.electionId || DEFAULT_ELECTION_ID) === targetElectionId)) {
      throw new Error('You have already applied for this election.');
    }
    const newAspirant: Aspirant = {
        ...data,
        id: `asp-${Date.now()}`,
        electionId: targetElectionId,
        status: ApprovalStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        createdAt: Date.now()
    };
    aspirants.push(newAspirant);
    this.setItems(ASPIRANTS_KEY, aspirants);
    this.addAudit('system', UserRole.GUEST, 'aspirant_applied', `New aspirant: ${data.fullName}`, newAspirant.id, targetElectionId);
    return newAspirant;
  }

  async registerAspirantUser(data: {
      fullName: string, matricNo: string, department: string, level: string, passwordHash: string, idCardUrl: string,
      position: string, cgpa: string, manifesto: string, passportUrl: string, resultUrl: string, address: string, phone: string
  }, electionId?: string): Promise<void> {
      await this.register({
          fullName: data.fullName,
          matricNo: data.matricNo,
          department: data.department,
          level: data.level,
          passwordHash: data.passwordHash,
          idCardUrl: data.idCardUrl
      });
      
      await this.registerAspirant({
          fullName: data.fullName,
          matricNo: data.matricNo,
          department: data.department,
          level: data.level,
          position: data.position,
          cgpa: data.cgpa,
          manifesto: data.manifesto,
          passportUrl: data.passportUrl,
          resultUrl: data.resultUrl,
          address: data.address,
          phone: data.phone
      }, electionId);
  }

  async getAspirants(electionId?: string): Promise<Aspirant[]> {
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
    return aspirants.filter(a => (a.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
  }

  async getMyAspirantProfile(matricNo: string, electionId?: string): Promise<Aspirant | null> {
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
    return aspirants.find(a => a.matricNo === matricNo && (a.electionId || DEFAULT_ELECTION_ID) === targetElectionId) || null;
  }

  async markPaymentAsPending(aspirantId: string, receiptBase64?: string): Promise<void> {
      const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
      const idx = aspirants.findIndex(a => a.id === aspirantId);
      if (idx !== -1) {
          aspirants[idx].paymentStatus = PaymentStatus.PENDING;
          if (receiptBase64) {
              aspirants[idx].paymentReceiptUrl = receiptBase64;
          }
          this.setItems(ASPIRANTS_KEY, aspirants);
      }
  }

  async verifyPayment(adminId: string, aspirantId: string): Promise<void> {
      const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
      const idx = aspirants.findIndex(a => a.id === aspirantId);
      if (idx !== -1) {
          aspirants[idx].paymentStatus = PaymentStatus.PAID;
          this.setItems(ASPIRANTS_KEY, aspirants);
          this.addAudit(adminId, UserRole.ADMIN, 'payment_verified', `Payment verified for ${aspirants[idx].fullName}`, aspirantId, aspirants[idx].electionId);
      }
  }

  async processAspirant(adminId: string, aspirantId: string, approved: boolean): Promise<void> {
    const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
    const idx = aspirants.findIndex(a => a.id === aspirantId);
    if (idx === -1) throw new Error("Aspirant not found");
    const aspirant = aspirants[idx];
    const electionId = aspirant.electionId || DEFAULT_ELECTION_ID;
    
    if (approved) {
        if (aspirant.paymentStatus !== PaymentStatus.PAID) {
            throw new Error("Cannot approve aspirant. Payment has not been verified.");
        }
        
        const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
        if (candidates.some(c => c.matricNo === aspirant.matricNo && (c.electionId || DEFAULT_ELECTION_ID) === electionId)) {
             aspirant.status = ApprovalStatus.APPROVED;
             this.setItems(ASPIRANTS_KEY, aspirants);
             return;
        }
        aspirant.status = ApprovalStatus.APPROVED;
        
        await this.addCandidate(adminId, {
            name: aspirant.fullName,
            matricNo: aspirant.matricNo,
            department: aspirant.department,
            position: aspirant.position,
            manifesto: aspirant.manifesto,
            photoUrl: aspirant.passportUrl,
            level: aspirant.level,
            cgpa: aspirant.cgpa,
            resultUrl: aspirant.resultUrl,
            electionId
        }, electionId);

        const users = this.getItems<User>(USERS_KEY);
        const uIdx = users.findIndex(u => u.matricNo === aspirant.matricNo);
        if (uIdx !== -1) {
            users[uIdx].status = ApprovalStatus.APPROVED;
            this.setItems(USERS_KEY, users);
        }
        this.addAudit(adminId, UserRole.ADMIN, 'aspirant_approved', `Promoted ${aspirant.fullName} to Candidate`, aspirantId, electionId);
    } else {
        aspirant.status = ApprovalStatus.REJECTED;
        this.addAudit(adminId, UserRole.ADMIN, 'aspirant_rejected', `Rejected aspirant ${aspirant.fullName}`, aspirantId, electionId);
    }
    
    this.setItems(ASPIRANTS_KEY, aspirants);
  }

  // --- CANDIDATES & VOTING ---
  async getCandidates(electionId?: string): Promise<Candidate[]> {
    await delay(200);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
    return candidates.filter(c => (c.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
  }

  async getVotingCandidates(electionId?: string): Promise<Candidate[]> {
    await delay(200);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const candidates = await this.getCandidates(targetElectionId);
    return candidates.map(c => ({
      id: c.id,
      name: c.name,
      matricNo: c.matricNo,
      department: c.department,
      position: c.position,
      manifesto: c.manifesto || '',
      photoUrl: c.photoUrl || '',
      level: c.level,
      electionId: c.electionId || targetElectionId
    }));
  }

  async addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>, electionId?: string): Promise<Candidate> {
      const targetElectionId = electionId || candidate.electionId || DEFAULT_ELECTION_ID;
      const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
      
      if (candidates.some(c => c.matricNo === candidate.matricNo && (c.electionId || DEFAULT_ELECTION_ID) === targetElectionId)) {
          throw new Error(`Candidate with Matric No ${candidate.matricNo} already exists in this election.`);
      }
      const newCand = { ...candidate, id: `c-${Date.now()}`, electionId: targetElectionId };
      candidates.push(newCand);
      this.setItems(CANDIDATES_KEY, candidates);
      this.addAudit(adminId, UserRole.ADMIN, 'candidate_added', `Added candidate ${candidate.name}`, newCand.id, targetElectionId);
      return newCand;
  }

  async updateCandidate(adminId: string, candidate: Candidate, electionId?: string): Promise<Candidate> {
    const targetElectionId = electionId || candidate.electionId || DEFAULT_ELECTION_ID;
    const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
    const index = candidates.findIndex(c => c.id === candidate.id);
    if (index === -1) throw new Error('Candidate not found');
    candidates[index] = { ...candidate, electionId: targetElectionId };
    this.setItems(CANDIDATES_KEY, candidates);
    this.addAudit(adminId, UserRole.ADMIN, 'candidate_updated', `Updated candidate ${candidate.name}`, candidate.id, targetElectionId);
    return candidates[index];
  }

  async removeCandidate(adminId: string, candidateId: string, electionId?: string): Promise<void> {
      let candidates = this.getItems<Candidate>(CANDIDATES_KEY);
      const target = candidates.find(c => c.id === candidateId);
      candidates = candidates.filter(c => c.id !== candidateId);
      this.setItems(CANDIDATES_KEY, candidates);
      this.addAudit(adminId, UserRole.ADMIN, 'candidate_removed', `Removed candidate ${target?.name || candidateId}`, candidateId, target?.electionId || electionId);
  }

  async castVote(studentId: string, candidateId: string, position: string, electionId?: string): Promise<Vote> {
    await delay(400);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const election = await this.getElection(targetElectionId);
    if (!election) throw new Error("Election not found");
    if (election.status !== 'live' || !election.isVotingEnabled) {
      throw new Error(`Voting is currently closed for "${election.title}".`);
    }
    const now = new Date();
    if (now < new Date(election.startDate) || now > new Date(election.endDate + 'T23:59:59')) {
      throw new Error("Voting is outside the scheduled election timeframe.");
    }

    // Voter verification
    const users = this.getItems<User>(USERS_KEY);
    const student = users.find(u => u.id === studentId);
    if (!student || student.status !== ApprovalStatus.APPROVED) {
      throw new Error("Only approved registered students are eligible to vote.");
    }

    // Eligibility check
    if (election.eligibleLevels && !election.eligibleLevels.includes('All') && student.level) {
      if (!election.eligibleLevels.includes(student.level)) {
        throw new Error(`Your level (${student.level}) is not eligible to vote in this election.`);
      }
    }
    if (election.eligibleDepartments && !election.eligibleDepartments.includes('All') && student.department) {
      if (!election.eligibleDepartments.includes(student.department)) {
        throw new Error(`Your department (${student.department}) is not eligible to vote in this election.`);
      }
    }

    const votes = this.getItems<Vote>(VOTES_KEY);
    if (votes.some(v => v.studentId === studentId && v.position === position && (v.electionId || DEFAULT_ELECTION_ID) === targetElectionId)) {
      throw new Error(`Already voted for ${position} in this election`);
    }

    const newVote: Vote = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId, 
      candidateId, 
      position, 
      electionId: targetElectionId,
      timestamp: Date.now()
    };
    votes.push(newVote);
    this.setItems(VOTES_KEY, votes);
    this.addAudit(studentId, UserRole.STUDENT, 'vote_cast', `Voted for ${position} in ${election.title}`, newVote.id, targetElectionId);
    this.emit('vote_update', newVote);
    return newVote;
  }

  async getMyVotes(studentId: string, electionId?: string): Promise<Vote[]> {
    await delay(200);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    return this.getItems<Vote>(VOTES_KEY).filter(v => v.studentId === studentId && (v.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
  }

  async getResults(electionId?: string): Promise<{candidateId: string, count: number}[]> {
    await delay(200);
    const targetElectionId = electionId || DEFAULT_ELECTION_ID;
    const candidates = await this.getCandidates(targetElectionId);
    const votes = this.getItems<Vote>(VOTES_KEY).filter(v => (v.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
    const counts: Record<string, number> = {};
    candidates.forEach(c => { counts[c.id] = 0; });
    votes.forEach(v => { counts[v.candidateId] = (counts[v.candidateId] || 0) + 1; });
    return Object.entries(counts).map(([candidateId, count]) => ({ candidateId, count }));
  }

  async getCandidateVoteCount(candidateId: string, electionId?: string): Promise<number> {
      await delay(200);
      const targetElectionId = electionId || DEFAULT_ELECTION_ID;
      const votes = this.getItems<Vote>(VOTES_KEY).filter(v => (v.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
      return votes.filter(v => v.candidateId === candidateId).length;
  }

  async getAuditLogs(adminId: string, electionId?: string): Promise<AuditLog[]> {
      const logs = this.getItems<AuditLog>(AUDIT_KEY);
      if (!electionId) return logs;
      return logs.filter(l => !l.electionId || l.electionId === electionId);
  }

  async getDepartmentStats(electionId?: string): Promise<{name: string, count: number}[]> {
    await delay(200);
    const users = this.getItems<User>(USERS_KEY).filter(u => u.role === UserRole.STUDENT);
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.department] = (counts[u.department] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  async getVoterBreakdown(electionId?: string): Promise<{
      byLevel: {name: string, count: number}[],
      byDepartment: {name: string, count: number}[]
  }> {
      await delay(200);
      const targetElectionId = electionId || DEFAULT_ELECTION_ID;
      const users = this.getItems<User>(USERS_KEY);
      const votes = this.getItems<Vote>(VOTES_KEY).filter(v => (v.electionId || DEFAULT_ELECTION_ID) === targetElectionId);
      const votingStudentIds = new Set(votes.map(v => v.studentId));
      
      const levelCounts: Record<string, number> = {};
      const deptCounts: Record<string, number> = {};
      users.forEach(u => {
          if (votingStudentIds.has(u.id)) {
              const level = u.level || 'Unknown';
              levelCounts[level] = (levelCounts[level] || 0) + 1;
              deptCounts[u.department] = (deptCounts[u.department] || 0) + 1;
          }
      });

      return {
          byLevel: Object.entries(levelCounts).map(([name, count]) => ({name, count})),
          byDepartment: Object.entries(deptCounts).map(([name, count]) => ({name, count}))
      };
  }

  // --- OUTGOING EXECUTIVES ---
  async getOutgoingExecutives(): Promise<OutgoingExecutive[]> {
      await delay(200);
      return this.getItems<OutgoingExecutive>(EXECUTIVES_KEY);
  }

  async addOutgoingExecutive(adminId: string, exec: Omit<OutgoingExecutive, 'id' | 'createdAt'>): Promise<OutgoingExecutive> {
      const execs = this.getItems<OutgoingExecutive>(EXECUTIVES_KEY);
      const newExec = {
          ...exec,
          id: `exec-${Date.now()}`,
          createdAt: Date.now()
      };
      execs.push(newExec);
      this.setItems(EXECUTIVES_KEY, execs);
      this.addAudit(adminId, UserRole.ADMIN, 'add_executive', `Added executive ${newExec.fullName}`);
      return newExec;
  }

  async updateOutgoingExecutive(adminId: string, exec: OutgoingExecutive): Promise<OutgoingExecutive> {
      const execs = this.getItems<OutgoingExecutive>(EXECUTIVES_KEY);
      const index = execs.findIndex(e => e.id === exec.id);
      if (index === -1) throw new Error("Executive not found");
      execs[index] = exec;
      this.setItems(EXECUTIVES_KEY, execs);
      this.addAudit(adminId, UserRole.ADMIN, 'update_executive', `Updated executive ${exec.fullName}`);
      return exec;
  }

  async deleteOutgoingExecutive(adminId: string, execId: string): Promise<void> {
      let execs = this.getItems<OutgoingExecutive>(EXECUTIVES_KEY);
      execs = execs.filter(e => e.id !== execId);
      this.setItems(EXECUTIVES_KEY, execs);
      this.addAudit(adminId, UserRole.ADMIN, 'delete_executive', `Deleted an executive record`);
  }
}

function logPerfMetrics(fnName: string, durationMs: number, data: any) {
  console.log(`[PERF] ${fnName}: ${durationMs.toFixed(2)} ms`);
}

// ----------------------------------------------------------------------
// 2. SUPABASE DB (Real Production Database with Graceful Fallbacks)
// ----------------------------------------------------------------------

class SupabaseDB implements IDatabaseService {
  constructor() {
    console.log("SupabaseDB Initialized (Production Mode with Multi-Election Scoping)");
  }

  public subscribe(event: string, callback: Listener): () => void {
    if (event === 'vote_update') {
      const channel = supabase
        .channel('public:votes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
          callback(payload.new);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    if (event === 'user_update') {
      const channel = supabase
        .channel('public:users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
          callback(payload.new);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    return () => {};
  }

  public connectToLiveUpdates(event: string, callback: Listener): () => void {
    return this.subscribe(event, callback);
  }

  // --- ELECTIONS (Supabase) ---
  async getElections(): Promise<Election[]> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return [DEFAULT_ELECTION];
      }

      return data.map(this.mapElection);
    } catch (e) {
      console.warn("Using fallback default election:", e);
      return [DEFAULT_ELECTION];
    }
  }

  async getElection(id: string): Promise<Election | null> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        if (id === DEFAULT_ELECTION_ID) return DEFAULT_ELECTION;
        return null;
      }
      return this.mapElection(data);
    } catch {
      if (id === DEFAULT_ELECTION_ID) return DEFAULT_ELECTION;
      return null;
    }
  }

  async getActiveElection(): Promise<Election> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('status', 'live')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return this.mapElection(data);
      }
    } catch (e) {
      console.warn("Could not query live election:", e);
    }
    return DEFAULT_ELECTION;
  }

  async createElection(adminId: string, data: Omit<Election, 'createdAt' | 'updatedAt'>): Promise<Election> {
    const payload = {
      id: data.id,
      title: data.title,
      session: data.session,
      description: data.description,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status,
      is_voting_enabled: data.isVotingEnabled,
      eligible_levels: data.eligibleLevels || ['All'],
      eligible_departments: data.eligibleDepartments || ['All'],
      aspirant_registration_open: data.aspirantRegistrationOpen ?? true,
      aspirant_fee_required: data.aspirantFeeRequired ?? true,
      created_by: adminId,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // If live, close others
    if (data.status === 'live') {
      try {
        await supabase.from('elections').update({ status: 'closed', updated_at: Date.now() }).eq('status', 'live');
      } catch (err) {
        console.warn("Error updating active election status:", err);
      }
    }

    const { data: inserted, error } = await supabase.from('elections').insert(payload).select().single();
    if (error) {
      throw new Error(`Database Error: ${error.message}. (Ensure multi_election_schema.sql has been executed).`);
    }

    this.logAudit(adminId, UserRole.ADMIN, 'election_created', `Created election ${data.title}`, data.id);
    return this.mapElection(inserted);
  }

  async updateElection(adminId: string, election: Partial<Election> & { id: string }): Promise<Election> {
    const payload: any = { updated_at: Date.now() };
    if (election.title !== undefined) payload.title = election.title;
    if (election.session !== undefined) payload.session = election.session;
    if (election.description !== undefined) payload.description = election.description;
    if (election.startDate !== undefined) payload.start_date = election.startDate;
    if (election.endDate !== undefined) payload.end_date = election.endDate;
    if (election.status !== undefined) payload.status = election.status;
    if (election.isVotingEnabled !== undefined) payload.is_voting_enabled = election.isVotingEnabled;
    if (election.eligibleLevels !== undefined) payload.eligible_levels = election.eligibleLevels;
    if (election.eligibleDepartments !== undefined) payload.eligible_departments = election.eligibleDepartments;
    if (election.aspirantRegistrationOpen !== undefined) payload.aspirant_registration_open = election.aspirantRegistrationOpen;
    if (election.aspirantFeeRequired !== undefined) payload.aspirant_fee_required = election.aspirantFeeRequired;

    if (election.status === 'live') {
      await supabase.from('elections').update({ status: 'closed', updated_at: Date.now() }).eq('status', 'live').neq('id', election.id);
    }

    const { data, error } = await supabase.from('elections').update(payload).eq('id', election.id).select().single();
    if (error) throw new Error(error.message);

    this.logAudit(adminId, UserRole.ADMIN, 'election_updated', `Updated election ${election.title || election.id}`, election.id);
    return this.mapElection(data);
  }

  async deleteElection(adminId: string, electionId: string): Promise<void> {
    // CRITICAL SAFETY CHECK: Cannot delete election containing votes!
    try {
      const { count } = await supabase
        .from('votes')
        .select('id', { count: 'exact', head: true })
        .eq('election_id', electionId);

      if (count && count > 0) {
        throw new Error("Cannot delete election containing vote records. Please archive the election instead to preserve the permanent audit trail.");
      }
    } catch (e: any) {
      if (e.message && e.message.includes("Cannot delete")) throw e;
    }

    if (electionId === DEFAULT_ELECTION_ID) {
      throw new Error("Cannot delete the primary live NACOS election record. It can only be archived.");
    }

    await supabase.from('elections').delete().eq('id', electionId);
    this.logAudit(adminId, UserRole.ADMIN, 'election_deleted', `Deleted draft election ${electionId}`);
  }

  async archiveElection(adminId: string, electionId: string): Promise<Election> {
    return this.setElectionStatus(adminId, electionId, 'archived');
  }

  async setElectionStatus(adminId: string, electionId: string, status: ElectionStatus): Promise<Election> {
    return this.updateElection(adminId, { 
      id: electionId, 
      status,
      isVotingEnabled: status === 'live'
    });
  }

  private mapElection(e: any): Election {
    return {
      id: e.id,
      title: e.title,
      session: e.session,
      description: e.description || '',
      startDate: e.start_date,
      endDate: e.end_date,
      status: e.status,
      isVotingEnabled: !!e.is_voting_enabled,
      eligibleLevels: e.eligible_levels || ['All'],
      eligibleDepartments: e.eligible_departments || ['All'],
      aspirantRegistrationOpen: e.aspirant_registration_open !== false,
      aspirantFeeRequired: e.aspirant_fee_required !== false,
      createdAt: Number(e.created_at) || Date.now(),
      updatedAt: Number(e.updated_at) || Date.now(),
      createdBy: e.created_by
    };
  }

  // --- SETTINGS & STATS ---
  async getElectionSettings(electionId?: string): Promise<ElectionSettings> {
    const t0 = performance.now();
    try {
      const targetId = electionId || DEFAULT_ELECTION_ID;
      const { data, error } = await supabase.from('settings').select('*').eq('election_id', targetId).maybeSingle();
      if (error || !data) {
        // Try single row without election_id filter
        const { data: baseData } = await supabase.from('settings').select('*').limit(1).maybeSingle();
        if (baseData) {
          const mapped = {
            startDate: baseData.start_date,
            endDate: baseData.end_date,
            isVotingEnabled: baseData.is_voting_enabled,
            electionId: targetId
          };
          logPerfMetrics('getElectionSettings', performance.now() - t0, mapped);
          return mapped;
        }
        return defaultSettings;
      }
      const mapped = {
        startDate: data.start_date,
        endDate: data.end_date,
        isVotingEnabled: data.is_voting_enabled,
        electionId: data.election_id || targetId
      };
      logPerfMetrics('getElectionSettings', performance.now() - t0, mapped);
      return mapped;
    } catch (e) {
      console.error("Connection Error:", e);
      logPerfMetrics('getElectionSettings', performance.now() - t0, defaultSettings);
      return defaultSettings;
    }
  }

  async getElectionStats(electionId?: string): Promise<{
      totalApproved: number,
      totalRejected: number,
      totalPending: number,
      totalVotesCast: number,
      distinctVoters: number
  }> {
      const t0 = performance.now();
      const targetId = electionId || DEFAULT_ELECTION_ID;
      
      const pApproved = supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'approved');
      const pRejected = supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'rejected');
      const pPending = supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('status', 'pending');
      
      // Scoped votes count
      let votesQuery = supabase.from('votes').select('id', { count: 'exact', head: true });
      if (electionId && electionId !== DEFAULT_ELECTION_ID) {
        votesQuery = votesQuery.eq('election_id', electionId);
      }

      let allStudentIds: string[] = [];
      let page = 0;
      const limit = 1000;
      while (true) {
        let pageQuery = supabase.from('votes').select('student_id');
        if (electionId && electionId !== DEFAULT_ELECTION_ID) {
          pageQuery = pageQuery.eq('election_id', electionId);
        }
        const { data, error } = await pageQuery.range(page * limit, (page + 1) * limit - 1);
        
        if (error || !data) break;
        allStudentIds = allStudentIds.concat(data.map((v: any) => v.student_id));
        if (data.length < limit) break;
        page++;
      }
      
      const votingStudentIds = Array.from(new Set(allStudentIds));
      
      // Fetch all approved students directly
      const { data: approvedUsers } = await supabase.from('users').select('id').eq('role', 'student').eq('status', 'approved');
      const approvedIds = new Set((approvedUsers || []).map(u => u.id));
      
      const distinctVoters = votingStudentIds.filter(id => approvedIds.has(id)).length;
      
      const [resApp, resRej, resPend, resVotes] = await Promise.all([pApproved, pRejected, pPending, votesQuery]);
      
      const stats = {
          totalApproved: resApp.count || 0,
          totalRejected: resRej.count || 0,
          totalPending: resPend.count || 0,
          totalVotesCast: resVotes.count || 0,
          distinctVoters
      };
      logPerfMetrics('getElectionStats', performance.now() - t0, stats);
      return stats;
  }

  async updateElectionSettings(adminId: string, settings: ElectionSettings, electionId?: string): Promise<ElectionSettings> {
    const targetId = electionId || settings.electionId || DEFAULT_ELECTION_ID;
    const { error } = await supabase.from('settings').upsert({
      id: 1,
      start_date: settings.startDate,
      end_date: settings.endDate,
      is_voting_enabled: settings.isVotingEnabled,
      election_id: targetId
    });
    if (error) throw new Error(error.message);
    this.logAudit(adminId, UserRole.ADMIN, 'settings_updated', 'Updated election settings', undefined, targetId);
    return settings;
  }

  async getDepartments(): Promise<string[]> {
    try {
        const { data, error } = await supabase.from('departments').select('name');
        if (error || !data) return seedDepartments;
        return data.map((d: any) => d.name);
    } catch (e) {
        console.warn("Using fallback departments due to DB error", e);
        return seedDepartments;
    }
  }

  async addDepartment(adminId: string, name: string): Promise<string> {
    const { error } = await supabase.from('departments').insert({ name });
    if (error) throw new Error(error.message);
    return name;
  }

  async removeDepartment(adminId: string, name: string): Promise<void> {
    await supabase.from('departments').delete().eq('name', name);
  }

  async getPositions(electionId?: string): Promise<Position[]> {
    const t0 = performance.now();
    const targetId = electionId || DEFAULT_ELECTION_ID;
    let query = supabase.from('positions').select('name, price, eligible_level, election_id');
    
    const { data, error } = await query;
    if (error) {
      logPerfMetrics('getPositions', performance.now() - t0, []);
      return [];
    }
    const filtered = (data || []).filter((d: any) => !d.election_id || d.election_id === targetId);
    const mapped = filtered.map((d: any) => ({
        name: d.name,
        price: Number(d.price) || 0,
        eligibleLevel: d.eligible_level || 'All',
        electionId: d.election_id || targetId
    }));
    logPerfMetrics('getPositions', performance.now() - t0, mapped);
    return mapped;
  }

  async addPosition(adminId: string, name: string, price: number, level: string, electionId?: string): Promise<Position> {
    const targetId = electionId || DEFAULT_ELECTION_ID;
    const { error } = await supabase.from('positions').insert({ 
         name, 
         price, 
         eligible_level: level,
         election_id: targetId
     });
    if (error) throw new Error(error.message);
    return { name, price, eligibleLevel: level, electionId: targetId };
  }

  async removePosition(adminId: string, name: string, electionId?: string): Promise<void> {
    const targetId = electionId || DEFAULT_ELECTION_ID;
    await supabase.from('positions').delete().eq('name', name).eq('election_id', targetId);
  }

  async login(matricNo: string, password: string): Promise<User> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('matric_no', matricNo).single();
      
      if ((error || !data) && matricNo === 'admin' && password === 'admin123') {
          console.log("Admin account not found. Attempting to create default admin...");
          const { data: newAdmin, error: createError } = await supabase.from('users').insert({
            full_name: 'NACOS Administrator',
            matric_no: 'admin',
            department: 'Computer Science',
            role: 'admin',
            status: 'approved',
            password_hash: 'admin123',
            created_at: Date.now()
          }).select().single();
          
          if (newAdmin) {
              return this.mapUser(newAdmin);
          } else {
             if (createError) throw new Error(`DB Error: ${createError.message}.`);
          }
      }

      if (error || !data) throw new Error('Invalid credentials (User not found)');
      if (data.password_hash !== password) throw new Error('Invalid credentials (Wrong password)');
      if (data.role === UserRole.STUDENT && data.status !== ApprovalStatus.APPROVED) {
        if (data.status === ApprovalStatus.REJECTED) throw new Error(`Registration rejected: ${data.rejection_reason}`);
        throw new Error('Account pending approval');
      }
      return this.mapUser(data);
    } catch (e: any) {
        console.error("Login Error:", e);
        if (e.message && (e.message.includes("Failed to fetch") || e.message.includes("NetworkError"))) { 
            throw new Error("Network Error: Could not connect to Database. Check configuration.");
        }
        throw new Error(e.message || 'Connection failed');
    }
  }

  async register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
    const { data: existingUser } = await supabase
        .from('users').select('*').eq('matric_no', data.matricNo).single();
    
    const userPayload = {
      full_name: data.fullName,
      matric_no: data.matricNo,
      department: data.department,
      level: data.level,
      password_hash: data.passwordHash,
      id_card_url: data.idCardUrl,
      role: UserRole.STUDENT,
      status: ApprovalStatus.PENDING,
      created_at: Date.now(),
      rejection_reason: null
    };

    if (existingUser) {
        if (existingUser.status === ApprovalStatus.REJECTED) {
            const { data: updated, error: updateError } = await supabase
                .from('users').update(userPayload).eq('matric_no', data.matricNo).select().single();
            if (updateError) throw new Error(updateError.message);
            await sendEmail('admins@nacos.edu.ng', 'Re-Registration', `User ${data.fullName} re-registered`);
            return this.mapUser(updated);
        } else {
            throw new Error('Matric number already registered');
        }
    }

    const { data: inserted, error } = await supabase.from('users').insert(userPayload).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Matric number already registered');
      throw new Error(error.message);
    }
    await sendEmail('admins@nacos.edu.ng', 'New Reg', `User ${data.fullName}`);
    return this.mapUser(inserted);
  }

  async getPendingUsers(): Promise<User[]> {
    const { data } = await supabase.from('users').select('*').eq('status', ApprovalStatus.PENDING);
    return (data || []).map(this.mapUser);
  }

  async processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void> {
    const status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    await supabase.from('users').update({ status, rejection_reason: reason }).eq('id', userId);
    
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (user) {
       await sendEmail(user.email || 'student', approved ? 'Approved' : 'Rejected', 'Status update');
       this.logAudit(adminId, UserRole.ADMIN, approved ? 'approve_user' : 'reject_user', `User ${user.matric_no}`, userId);
    }
  }

  // --- ASPIRANT METHODS (Supabase) ---
  async registerAspirant(data: Omit<Aspirant, 'id' | 'status' | 'createdAt' | 'paymentStatus'>, electionId?: string): Promise<Aspirant> {
    const targetId = electionId || DEFAULT_ELECTION_ID;
    const { data: existing } = await supabase.from('aspirants')
      .select('*')
      .eq('matric_no', data.matricNo)
      .eq('election_id', targetId)
      .maybeSingle();

    if (existing) throw new Error("You have already applied for this election.");

    const payload = {
        full_name: data.fullName,
        matric_no: data.matricNo,
        department: data.department,
        level: data.level,
        position: data.position,
        cgpa: data.cgpa,
        manifesto: data.manifesto,
        passport_url: data.passportUrl,
        result_url: data.resultUrl,
        address: data.address,
        phone: data.phone,
        status: ApprovalStatus.PENDING,
        payment_status: PaymentStatus.UNPAID,
        election_id: targetId,
        created_at: Date.now()
    };

    const { data: inserted, error } = await supabase.from('aspirants').insert(payload).select().single();
    if (error) {
        throw new Error(error.message);
    }
    return this.mapAspirant(inserted);
  }

  async registerAspirantUser(data: {
      fullName: string, matricNo: string, department: string, level: string, passwordHash: string, idCardUrl: string,
      position: string, cgpa: string, manifesto: string, passportUrl: string, resultUrl: string, address: string, phone: string
  }, electionId?: string): Promise<void> {
      await this.register({
          fullName: data.fullName,
          matricNo: data.matricNo,
          department: data.department,
          level: data.level,
          passwordHash: data.passwordHash,
          idCardUrl: data.idCardUrl
      });
      
      await this.registerAspirant({
          fullName: data.fullName,
          matricNo: data.matricNo,
          department: data.department,
          level: data.level,
          position: data.position,
          cgpa: data.cgpa,
          manifesto: data.manifesto,
          passportUrl: data.passportUrl,
          resultUrl: data.resultUrl,
          address: data.address,
          phone: data.phone
      }, electionId);
  }

  async getAspirants(electionId?: string): Promise<Aspirant[]> {
      const t0 = performance.now();
      const targetId = electionId || DEFAULT_ELECTION_ID;
      const { data, error } = await supabase.from('aspirants').select('*');
      if (error) {
        logPerfMetrics('getAspirants', performance.now() - t0, []);
        return [];
      }
      const filtered = (data || []).filter((a: any) => !a.election_id || a.election_id === targetId);
      const mapped = filtered.map(this.mapAspirant);
      logPerfMetrics('getAspirants', performance.now() - t0, mapped);
      return mapped;
  }

  async getMyAspirantProfile(matricNo: string, electionId?: string): Promise<Aspirant | null> {
      const t0 = performance.now();
      const targetId = electionId || DEFAULT_ELECTION_ID;
      const { data, error } = await supabase
        .from('aspirants')
        .select('*')
        .ilike('matric_no', matricNo)
        .maybeSingle();

      if (error || !data) {
        logPerfMetrics('getMyAspirantProfile', performance.now() - t0, null);
        return null;
      }
      const mapped = this.mapAspirant(data);
      logPerfMetrics('getMyAspirantProfile', performance.now() - t0, mapped);
      return mapped;
  }

  async markPaymentAsPending(aspirantId: string, receiptBase64?: string): Promise<void> {
      const updateData: any = { payment_status: PaymentStatus.PENDING };
      if (receiptBase64) {
          updateData.payment_receipt_url = receiptBase64;
      }
      const { error } = await supabase.from('aspirants').update(updateData).eq('id', aspirantId);
      if (error) throw new Error(error.message);
  }

  async verifyPayment(adminId: string, aspirantId: string): Promise<void> {
      await supabase.from('aspirants').update({ payment_status: PaymentStatus.PAID }).eq('id', aspirantId);
      this.logAudit(adminId, UserRole.ADMIN, 'payment_verified', 'Verified aspirant payment', aspirantId);
  }

  async processAspirant(adminId: string, aspirantId: string, approved: boolean): Promise<void> {
      const status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
      
      if (approved) {
          const { data: asp } = await supabase.from('aspirants').select('*').eq('id', aspirantId).single();
          if (asp && asp.payment_status !== PaymentStatus.PAID) {
              throw new Error("Cannot approve aspirant. Payment has not been verified.");
          }
          const electionId = asp?.election_id || DEFAULT_ELECTION_ID;
          const { data: existingCand } = await supabase.from('candidates')
            .select('id')
            .eq('matric_no', asp.matric_no)
            .eq('election_id', electionId)
            .maybeSingle();

          if (existingCand) {
               await supabase.from('aspirants').update({ status: ApprovalStatus.APPROVED }).eq('id', aspirantId);
               return;
          }
      }

      const { data: aspirant, error } = await supabase
        .from('aspirants')
        .update({ status })
        .eq('id', aspirantId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      if (approved && aspirant) {
           const targetElectionId = aspirant.election_id || DEFAULT_ELECTION_ID;
           await this.addCandidate(adminId, {
            name: aspirant.full_name,
            matricNo: aspirant.matric_no,
            department: aspirant.department,
            position: aspirant.position,
            manifesto: aspirant.manifesto,
            photoUrl: aspirant.passport_url,
            level: aspirant.level,
            cgpa: aspirant.cgpa,
            resultUrl: aspirant.result_url,
            electionId: targetElectionId
           }, targetElectionId);

           await supabase
            .from('users')
            .update({ status: ApprovalStatus.APPROVED })
            .eq('matric_no', aspirant.matric_no);
      }
      this.logAudit(adminId, UserRole.ADMIN, approved ? 'approve_aspirant' : 'reject_aspirant', `Processed aspirant ${aspirant?.full_name}`, aspirantId);
  }

  private mapAspirant(a: any): Aspirant {
      return {
          id: a.id,
          fullName: a.full_name,
          matricNo: a.matric_no,
          department: a.department,
          level: a.level,
          position: a.position,
          cgpa: a.cgpa,
          manifesto: a.manifesto,
          passportUrl: a.passport_url,
          resultUrl: a.result_url,
          address: a.address,
          phone: a.phone,
          status: a.status,
          paymentStatus: a.payment_status || PaymentStatus.UNPAID,
          paymentReceiptUrl: a.payment_receipt_url,
          electionId: a.election_id || DEFAULT_ELECTION_ID,
          createdAt: Number(a.created_at)
      };
  }

  // --- CANDIDATES & VOTING ---
  async getCandidates(electionId?: string): Promise<Candidate[]> {
    const t0 = performance.now();
    const targetId = electionId || DEFAULT_ELECTION_ID;
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, matric_no, department, position, manifesto, photo_url, level, cgpa, election_id');
    
    if (error) {
      logPerfMetrics('getCandidates', performance.now() - t0, []);
      return [];
    }
    const filtered = (data || []).filter((c: any) => !c.election_id || c.election_id === targetId);
    const mapped = filtered.map((c: any) => ({
      id: c.id,
      name: c.name,
      matricNo: c.matric_no,
      department: c.department,
      position: c.position,
      manifesto: c.manifesto || '',
      photoUrl: c.photo_url || '',
      level: c.level,
      cgpa: c.cgpa,
      electionId: c.election_id || targetId
    }));
    logPerfMetrics('getCandidates', performance.now() - t0, mapped);
    return mapped;
  }

  async getVotingCandidates(electionId?: string): Promise<Candidate[]> {
    const t0 = performance.now();
    const targetId = electionId || DEFAULT_ELECTION_ID;
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, matric_no, department, position, manifesto, photo_url, level, election_id');
    
    if (error) {
      console.error("Supabase getVotingCandidates error:", error);
      logPerfMetrics('getVotingCandidates', performance.now() - t0, []);
      return [];
    }
    const filtered = (data || []).filter((c: any) => !c.election_id || c.election_id === targetId);
    const mapped = filtered.map((c: any) => ({
      id: c.id,
      name: c.name,
      matricNo: c.matric_no,
      department: c.department,
      position: c.position,
      manifesto: c.manifesto || '',
      photoUrl: c.photo_url || '',
      level: c.level,
      electionId: c.election_id || targetId
    }));
    logPerfMetrics('getVotingCandidates', performance.now() - t0, mapped);
    return mapped;
  }

  async addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>, electionId?: string): Promise<Candidate> {
    const targetId = electionId || candidate.electionId || DEFAULT_ELECTION_ID;
    const { data: existing } = await supabase.from('candidates')
      .select('id')
      .eq('matric_no', candidate.matricNo)
      .eq('election_id', targetId)
      .maybeSingle();

    if (existing) {
        throw new Error(`Candidate with Matric No ${candidate.matricNo} already exists in this election.`);
    }

    const dbCand = {
      name: candidate.name,
      matric_no: candidate.matricNo,
      department: candidate.department,
      position: candidate.position,
      manifesto: candidate.manifesto,
      photo_url: candidate.photoUrl,
      level: candidate.level,
      cgpa: candidate.cgpa,
      result_url: candidate.resultUrl,
      election_id: targetId
    };

    const { data, error } = await supabase.from('candidates').insert(dbCand).select().single();
    if (error) throw new Error(error.message);
    this.logAudit(adminId, UserRole.ADMIN, 'add_candidate', `Added ${candidate.name}`, data.id, targetId);
    return { ...candidate, id: data.id, electionId: targetId };
  }

  async updateCandidate(adminId: string, candidate: Candidate, electionId?: string): Promise<Candidate> {
    const targetId = electionId || candidate.electionId || DEFAULT_ELECTION_ID;
    const { error } = await supabase.from('candidates').update({ 
       name: candidate.name,
       matric_no: candidate.matricNo,
       department: candidate.department,
       position: candidate.position,
       manifesto: candidate.manifesto,
       photo_url: candidate.photoUrl,
       election_id: targetId
    }).eq('id', candidate.id);
    if (error) throw new Error(error.message);
    return candidate;
  }

  async removeCandidate(adminId: string, candidateId: string, electionId?: string): Promise<void> {
    await supabase.from('candidates').delete().eq('id', candidateId);
  }

  async castVote(studentId: string, candidateId: string, position: string, electionId?: string): Promise<Vote> {
    const targetId = electionId || DEFAULT_ELECTION_ID;
    const settings = await this.getElectionSettings(targetId);
    if (!settings.isVotingEnabled) throw new Error('Voting is closed');

    // Database check for duplicate vote within this election
    const { data: existing } = await supabase.from('votes')
      .select('id')
      .eq('student_id', studentId)
      .eq('position', position)
      .eq('election_id', targetId)
      .maybeSingle();

    if (existing) throw new Error('Already voted for this position in this election');

    const voteData = {
      student_id: studentId,
      candidate_id: candidateId,
      position: position,
      election_id: targetId,
      timestamp: Date.now()
    };

    const { data, error } = await supabase.from('votes').insert(voteData).select().single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      studentId: data.student_id,
      candidateId: data.candidate_id,
      position: data.position,
      electionId: data.election_id || targetId,
      timestamp: Number(data.timestamp)
    };
  }

  async getMyVotes(studentId: string, electionId?: string): Promise<Vote[]> {
    const t0 = performance.now();
    const targetId = electionId || DEFAULT_ELECTION_ID;
    let query = supabase.from('votes').select('*').eq('student_id', studentId);
    if (electionId) {
      query = query.eq('election_id', targetId);
    }
    const { data, error } = await query;
    if (error) {
      logPerfMetrics('getMyVotes', performance.now() - t0, []);
      return [];
    }
    const mapped = (data || []).map((v: any) => ({
      id: v.id,
      studentId: v.student_id,
      candidateId: v.candidate_id,
      position: v.position,
      electionId: v.election_id || targetId,
      timestamp: Number(v.timestamp)
    }));
    logPerfMetrics('getMyVotes', performance.now() - t0, mapped);
    return mapped;
  }

  async getResults(electionId?: string): Promise<{candidateId: string, count: number}[]> {
    const t0 = performance.now();
    const targetId = electionId || DEFAULT_ELECTION_ID;
    
    // Fetch candidates for this election
    const candidates = await this.getCandidates(targetId);
    
    const counts = await Promise.all((candidates || []).map(async (c) => {
      let query = supabase.from('votes').select('id', { count: 'exact', head: true }).eq('candidate_id', c.id);
      if (electionId) {
        query = query.eq('election_id', targetId);
      }
      const { count } = await query;
      return { candidateId: c.id, count: count || 0 };
    }));
    logPerfMetrics('getResults', performance.now() - t0, counts);
    return counts;
  }

  async getCandidateVoteCount(candidateId: string, electionId?: string): Promise<number> {
      const t0 = performance.now();
      const targetId = electionId || DEFAULT_ELECTION_ID;
      let query = supabase.from('votes').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId);
      if (electionId) {
        query = query.eq('election_id', targetId);
      }
      const { count, error } = await query;
      if (error) {
          console.error("Supabase getCandidateVoteCount error:", error);
      }
      logPerfMetrics('getCandidateVoteCount', performance.now() - t0, count);
      return count || 0;
  }

  async getAuditLogs(adminId: string, electionId?: string): Promise<AuditLog[]> {
    let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (electionId) {
      query = query.eq('election_id', electionId);
    }
    const { data } = await query;
    return (data || []).map((l: any) => ({
      id: l.id,
      actorId: l.actor_id,
      actorRole: l.actor_role as UserRole,
      actionType: l.action_type,
      details: l.details,
      electionId: l.election_id,
      timestamp: Number(l.timestamp)
    }));
  }

  async getDepartmentStats(electionId?: string): Promise<{name: string, count: number}[]> {
     const { data } = await supabase.from('users').select('department');
     const counts: Record<string, number> = {};
     (data || []).forEach((u: any) => {
         counts[u.department] = (counts[u.department] || 0) + 1;
     });
     return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  async getVoterBreakdown(electionId?: string): Promise<{
      byLevel: {name: string, count: number}[],
      byDepartment: {name: string, count: number}[]
  }> {
      const targetId = electionId || DEFAULT_ELECTION_ID;
      const { data: users } = await supabase.from('users').select('id, level, department');
      
      let allStudentIds: string[] = [];
      let page = 0;
      const limit = 1000;
      while (true) {
        let pageQuery = supabase.from('votes').select('student_id');
        if (electionId) {
          pageQuery = pageQuery.eq('election_id', targetId);
        }
        const { data, error } = await pageQuery.range(page * limit, (page + 1) * limit - 1);
        if (error || !data) break;
        allStudentIds = allStudentIds.concat(data.map((v: any) => v.student_id));
        if (data.length < limit) break;
        page++;
      }
      
      const votingStudentIds = new Set(allStudentIds);
      const levelCounts: Record<string, number> = {};
      const deptCounts: Record<string, number> = {};
      (users || []).forEach((u: any) => {
          if (votingStudentIds.has(u.id)) {
              const level = u.level || 'Unknown';
              levelCounts[level] = (levelCounts[level] || 0) + 1;
              deptCounts[u.department] = (deptCounts[u.department] || 0) + 1;
          }
      });
      return {
          byLevel: Object.entries(levelCounts).map(([name, count]) => ({name, count})),
          byDepartment: Object.entries(deptCounts).map(([name, count]) => ({name, count}))
      };
  }

  private mapUser(u: any): User {
    return {
      id: u.id,
      fullName: u.full_name,
      matricNo: u.matric_no,
      department: u.department,
      level: u.level,
      role: u.role as UserRole,
      status: u.status as ApprovalStatus,
      passwordHash: u.password_hash,
      idCardUrl: u.id_card_url,
      createdAt: Number(u.created_at)
    };
  }

  private async logAudit(actorId: string, role: UserRole, type: string, details: string, targetId?: string, electionId?: string) {
    try {
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: role,
        action_type: type,
        details: details,
        target_id: targetId,
        election_id: electionId || DEFAULT_ELECTION_ID,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn("Could not write audit log:", e);
    }
  }

  // --- OUTGOING EXECUTIVES ---
  async getOutgoingExecutives(): Promise<OutgoingExecutive[]> {
      const { data, error } = await supabase.from('outgoing_executives').select('*');
      if (error) {
          console.warn("outgoing_executives table fallback:", error);
          return seedExecutives;
      }
      return (data || []).map((e: any) => ({
          id: e.id,
          fullName: e.full_name,
          position: e.position,
          session: e.session,
          startDate: e.start_date,
          endDate: e.end_date,
          biography: e.biography,
          achievements: e.achievements,
          appreciationMessage: e.appreciation_message,
          quote: e.quote,
          profileImage: e.profile_image,
          status: e.status as ExecutiveStatus,
          createdAt: Number(e.created_at)
      }));
  }

  async addOutgoingExecutive(adminId: string, exec: Omit<OutgoingExecutive, 'id' | 'createdAt'>): Promise<OutgoingExecutive> {
      const payload = {
          full_name: exec.fullName,
          position: exec.position,
          session: exec.session,
          start_date: exec.startDate,
          end_date: exec.endDate,
          biography: exec.biography,
          achievements: exec.achievements,
          appreciation_message: exec.appreciationMessage,
          quote: exec.quote,
          profile_image: exec.profileImage,
          status: exec.status,
          created_at: Date.now()
      };
      const { data, error } = await supabase.from('outgoing_executives').insert(payload).select().single();
      if (error) {
          throw new Error('Database Error: Unable to add executive. ' + error.message);
      }
      this.logAudit(adminId, UserRole.ADMIN, 'add_executive', `Added executive ${exec.fullName}`);
      return { ...exec, id: data.id, createdAt: data.created_at };
  }

  async updateOutgoingExecutive(adminId: string, exec: OutgoingExecutive): Promise<OutgoingExecutive> {
      const payload = {
          full_name: exec.fullName,
          position: exec.position,
          session: exec.session,
          start_date: exec.startDate,
          end_date: exec.endDate,
          biography: exec.biography,
          achievements: exec.achievements,
          appreciation_message: exec.appreciationMessage,
          quote: exec.quote,
          profile_image: exec.profileImage,
          status: exec.status
      };
      const { error } = await supabase.from('outgoing_executives').update(payload).eq('id', exec.id);
      if (error) throw new Error(error.message);
      this.logAudit(adminId, UserRole.ADMIN, 'update_executive', `Updated executive ${exec.fullName}`);
      return exec;
  }

  async deleteOutgoingExecutive(adminId: string, execId: string): Promise<void> {
      await supabase.from('outgoing_executives').delete().eq('id', execId);
      this.logAudit(adminId, UserRole.ADMIN, 'delete_executive', `Deleted an executive record`);
  }
}

export const db = USE_MOCK_DB ? new MockDB() : new SupabaseDB();
