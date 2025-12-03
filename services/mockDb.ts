
import { User, Candidate, Vote, AuditLog, UserRole, ApprovalStatus, Position, ElectionSettings, Aspirant } from '../types';
import { sendEmail } from './emailService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// --- CONFIGURATION ---
// Automatically determine mode:
// If Supabase is properly configured -> Production Mode (False)
// If keys are missing or placeholder -> Demo Mode (True)
const USE_MOCK_DB = !isSupabaseConfigured(); 

// ---------------------

// Constants for LocalStorage keys (Mock Mode)
const USERS_KEY = 'univote_users';
const CANDIDATES_KEY = 'univote_candidates';
const VOTES_KEY = 'univote_votes';
const AUDIT_KEY = 'univote_audit';
const POSITIONS_KEY = 'univote_positions';
const DEPARTMENTS_KEY = 'univote_departments';
const SETTINGS_KEY = 'univote_settings';
const ASPIRANTS_KEY = 'univote_aspirants';

// Initial Seed Data (Mock Mode)
const seedAdmin: User = {
  id: 'admin-1',
  fullName: 'NACOSS Administrator',
  matricNo: 'admin',
  department: 'Computer Science',
  role: UserRole.ADMIN,
  status: ApprovalStatus.APPROVED,
  passwordHash: 'admin123',
  createdAt: Date.now()
};

const seedPositions = [
  'President', 
  'Vice President', 
  'General Secretary', 
  'Financial Secretary', 
  'Treasurer', 
  'Director of Socials', 
  'P.R.O', 
  'Director of Sports',
  'Director of Software'
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
    manifesto: 'My vision is a NACOSS that connects every student to industry opportunities. I will launch the "Code & Earn" initiative and ensure transparent dues management.',
    photoUrl: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: 'c-2',
    name: 'Ahmed Ibrahim',
    matricNo: 'CS/2021/045',
    department: 'Computer Science',
    position: 'President',
    manifesto: 'Inclusivity is key. I promise to organize more tutorials for freshers and ensure the departmental laboratory is accessible 24/7.',
    photoUrl: 'https://picsum.photos/200/200?random=2'
  }
];

const defaultSettings: ElectionSettings = {
  startDate: new Date().toISOString().split('T')[0], // Today
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  isVotingEnabled: true
};

// Helper to simulate delay for Mock Mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Listener = (data?: any) => void;

interface IDatabaseService {
  subscribe(event: string, callback: Listener): () => void;
  connectToLiveUpdates(event: string, callback: Listener): () => void;
  
  // Settings
  getElectionSettings(): Promise<ElectionSettings>;
  updateElectionSettings(adminId: string, settings: ElectionSettings): Promise<ElectionSettings>;
  
  // Departments
  getDepartments(): Promise<string[]>;
  addDepartment(adminId: string, name: string): Promise<string>;
  removeDepartment(adminId: string, name: string): Promise<void>;
  
  // Positions
  getPositions(): Promise<string[]>;
  addPosition(adminId: string, name: string): Promise<string>;
  removePosition(adminId: string, name: string): Promise<void>;
  
  // Auth
  login(matricNo: string, password: string): Promise<User>;
  register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User>;
  getPendingUsers(): Promise<User[]>;
  processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void>;
  
  // Aspirants (New)
  registerAspirant(data: Omit<Aspirant, 'id' | 'status' | 'createdAt'>): Promise<Aspirant>;
  getAspirants(): Promise<Aspirant[]>;
  processAspirant(adminId: string, aspirantId: string, approved: boolean): Promise<void>;

  // Voting
  getCandidates(): Promise<Candidate[]>;
  addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>): Promise<Candidate>;
  updateCandidate(adminId: string, candidate: Candidate): Promise<Candidate>;
  removeCandidate(adminId: string, candidateId: string): Promise<void>;
  castVote(studentId: string, candidateId: string, position: Position): Promise<Vote>;
  getMyVotes(studentId: string): Promise<Vote[]>;
  getResults(): Promise<{candidateId: string, count: number}[]>;
  
  // Analytics
  getAuditLogs(adminId: string): Promise<AuditLog[]>;
  getDepartmentStats(): Promise<{name: string, count: number}[]>;
  getVoterBreakdown(): Promise<{
      byLevel: {name: string, count: number}[],
      byDepartment: {name: string, count: number}[]
  }>;
}

// ----------------------------------------------------------------------
// 1. LOCAL MOCK DB (Browser Storage - For Demo/Prototyping)
// ----------------------------------------------------------------------

class MockDB implements IDatabaseService {
  private listeners: Record<string, Listener[]> = {};

  constructor() {
    this.init();
    console.log("MockDB Initialized (Demo Mode - LocalStorage)");
    
    // Listen for storage events to support multi-tab real-time updates
    window.addEventListener('storage', (event) => {
      if (event.key === VOTES_KEY) {
        this.emit('vote_update', null);
      }
      if (event.key === USERS_KEY) {
        this.emit('user_update', null);
      }
    });
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

  private init() {
    // Only init if keys are missing
    try {
      if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify([seedAdmin]));
      }
      if (!localStorage.getItem(POSITIONS_KEY)) {
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(seedPositions));
      }
      if (!localStorage.getItem(DEPARTMENTS_KEY)) {
        localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(seedDepartments));
      }
      if (!localStorage.getItem(CANDIDATES_KEY)) {
        localStorage.setItem(CANDIDATES_KEY, JSON.stringify(seedCandidates));
      }
      if (!localStorage.getItem(VOTES_KEY)) {
        localStorage.setItem(VOTES_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(AUDIT_KEY)) {
        localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(SETTINGS_KEY)) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      }
      if (!localStorage.getItem(ASPIRANTS_KEY)) {
        localStorage.setItem(ASPIRANTS_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.warn("Could not initialize local storage (Quota exceeded?)", e);
    }
  }

  private getItems<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItems<T>(key: string, items: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         throw new Error("Demo storage quota exceeded. Please clear some data or use smaller images.");
      }
      throw e;
    }
  }
  
  private getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  private setItem<T>(key: string, item: T) {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
         throw new Error("Demo storage quota exceeded.");
      }
      throw e;
    }
  }

  private addAudit(actorId: string, role: UserRole, action: string, details: string, targetId?: string) {
    try {
        const logs = this.getItems<AuditLog>(AUDIT_KEY);
        if (logs.length > 50) logs.pop();
        
        logs.unshift({
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            actorId,
            actorRole: role,
            actionType: action,
            details,
            targetId,
            timestamp: Date.now()
        });
        this.setItems(AUDIT_KEY, logs);
    } catch (e) {
        console.warn("Could not save audit log due to storage limits");
    }
  }

  async getElectionSettings(): Promise<ElectionSettings> {
    await delay(200);
    return this.getItem<ElectionSettings>(SETTINGS_KEY) || defaultSettings;
  }

  async updateElectionSettings(adminId: string, settings: ElectionSettings): Promise<ElectionSettings> {
    await delay(300);
    this.setItem(SETTINGS_KEY, settings);
    return settings;
  }

  async getDepartments(): Promise<string[]> {
    await delay(200);
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

  async getPositions(): Promise<string[]> {
    await delay(200);
    return this.getItems<string>(POSITIONS_KEY);
  }

  async addPosition(adminId: string, name: string): Promise<string> {
    const positions = this.getItems<string>(POSITIONS_KEY);
    if (positions.includes(name)) throw new Error("Position already exists");
    positions.push(name);
    this.setItems(POSITIONS_KEY, positions);
    return name;
  }

  async removePosition(adminId: string, name: string): Promise<void> {
    let positions = this.getItems<string>(POSITIONS_KEY);
    positions = positions.filter(p => p !== name);
    this.setItems(POSITIONS_KEY, positions);
  }

  async login(matricNo: string, password: string): Promise<User> {
    await delay(500);
    const users = this.getItems<User>(USERS_KEY);
    const user = users.find(u => u.matricNo === matricNo && u.passwordHash === password);
    
    if (!user) throw new Error('Invalid credentials');
    
    if (user.role === UserRole.STUDENT && user.status !== ApprovalStatus.APPROVED) {
        if(user.status === ApprovalStatus.REJECTED) throw new Error(`Registration rejected: ${user.rejectionReason}`);
        throw new Error('Account pending approval');
    }

    return user;
  }

  async register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
    await delay(800);
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
    await delay(300);
    return this.getItems<User>(USERS_KEY).filter(u => u.status === ApprovalStatus.PENDING);
  }

  async processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void> {
    await delay(500);
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

  // --- ASPIRANT METHODS ---
  async registerAspirant(data: Omit<Aspirant, 'id' | 'status' | 'createdAt'>): Promise<Aspirant> {
    await delay(800);
    const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
    if (aspirants.some(a => a.matricNo === data.matricNo)) throw new Error('You have already applied.');

    const newAspirant: Aspirant = {
        ...data,
        id: `asp-${Date.now()}`,
        status: ApprovalStatus.PENDING,
        createdAt: Date.now()
    };
    aspirants.push(newAspirant);
    this.setItems(ASPIRANTS_KEY, aspirants);
    this.addAudit('system', UserRole.GUEST, 'aspirant_applied', `New aspirant: ${data.fullName}`, newAspirant.id);
    return newAspirant;
  }

  async getAspirants(): Promise<Aspirant[]> {
    return this.getItems<Aspirant>(ASPIRANTS_KEY);
  }

  async processAspirant(adminId: string, aspirantId: string, approved: boolean): Promise<void> {
    const aspirants = this.getItems<Aspirant>(ASPIRANTS_KEY);
    const idx = aspirants.findIndex(a => a.id === aspirantId);
    if (idx === -1) throw new Error("Aspirant not found");

    const aspirant = aspirants[idx];
    aspirant.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    this.setItems(ASPIRANTS_KEY, aspirants);

    if (approved) {
        // Convert to Candidate
        await this.addCandidate(adminId, {
            name: aspirant.fullName,
            matricNo: aspirant.matricNo,
            department: aspirant.department,
            position: aspirant.position,
            manifesto: aspirant.manifesto,
            photoUrl: aspirant.passportUrl
        });
        this.addAudit(adminId, UserRole.ADMIN, 'aspirant_approved', `Promoted ${aspirant.fullName} to Candidate`, aspirantId);
    } else {
        this.addAudit(adminId, UserRole.ADMIN, 'aspirant_rejected', `Rejected aspirant ${aspirant.fullName}`, aspirantId);
    }
  }
  // ------------------------


  async getCandidates(): Promise<Candidate[]> {
    await delay(300);
    return this.getItems<Candidate>(CANDIDATES_KEY);
  }

  async addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
      const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
      const newCand = { ...candidate, id: `c-${Date.now()}` };
      candidates.push(newCand);
      this.setItems(CANDIDATES_KEY, candidates);
      return newCand;
  }

  async updateCandidate(adminId: string, candidate: Candidate): Promise<Candidate> {
    const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
    const index = candidates.findIndex(c => c.id === candidate.id);
    if (index === -1) throw new Error('Candidate not found');

    candidates[index] = candidate;
    this.setItems(CANDIDATES_KEY, candidates);
    return candidate;
  }

  async removeCandidate(adminId: string, candidateId: string): Promise<void> {
      let candidates = this.getItems<Candidate>(CANDIDATES_KEY);
      candidates = candidates.filter(c => c.id !== candidateId);
      this.setItems(CANDIDATES_KEY, candidates);
  }

  async castVote(studentId: string, candidateId: string, position: Position): Promise<Vote> {
    await delay(600);
    const settings = await this.getElectionSettings();
    const now = new Date();
    if (!settings.isVotingEnabled || now < new Date(settings.startDate) || now > new Date(settings.endDate + 'T23:59:59')) {
      throw new Error("Voting is currently closed or outside the scheduled time.");
    }

    const votes = this.getItems<Vote>(VOTES_KEY);
    if (votes.some(v => v.studentId === studentId && v.position === position)) throw new Error(`Already voted for ${position}`);

    const newVote: Vote = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId, candidateId, position, timestamp: Date.now()
    };
    votes.push(newVote);
    this.setItems(VOTES_KEY, votes);
    this.addAudit(studentId, UserRole.STUDENT, 'vote_cast', `Voted for ${position}`, newVote.id);
    this.emit('vote_update', newVote);
    return newVote;
  }

  async getMyVotes(studentId: string): Promise<Vote[]> {
    await delay(300);
    return this.getItems<Vote>(VOTES_KEY).filter(v => v.studentId === studentId);
  }

  async getResults(): Promise<{candidateId: string, count: number}[]> {
    await delay(300);
    const votes = this.getItems<Vote>(VOTES_KEY);
    const counts: Record<string, number> = {};
    votes.forEach(v => { counts[v.candidateId] = (counts[v.candidateId] || 0) + 1; });
    return Object.entries(counts).map(([candidateId, count]) => ({ candidateId, count }));
  }

  async getAuditLogs(adminId: string): Promise<AuditLog[]> {
      return this.getItems<AuditLog>(AUDIT_KEY);
  }

  async getDepartmentStats(): Promise<{name: string, count: number}[]> {
    await delay(300);
    const users = this.getItems<User>(USERS_KEY).filter(u => u.role === UserRole.STUDENT);
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.department] = (counts[u.department] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  async getVoterBreakdown(): Promise<{
      byLevel: {name: string, count: number}[],
      byDepartment: {name: string, count: number}[]
  }> {
      await delay(300);
      const users = this.getItems<User>(USERS_KEY);
      const votes = this.getItems<Vote>(VOTES_KEY);
      // Get unique students who voted
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
}

// ----------------------------------------------------------------------
// 2. SUPABASE DB (Real Production Database)
// ----------------------------------------------------------------------

class SupabaseDB implements IDatabaseService {
  constructor() {
    console.log("SupabaseDB Initialized (Production Mode)");
  }

  public subscribe(event: string, callback: Listener): () => void {
    // Basic Realtime for Supabase
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

  async getElectionSettings(): Promise<ElectionSettings> {
    try {
      const { data, error } = await supabase.from('settings').select('*').single();
      if (error) {
        return defaultSettings;
      }
      return {
        startDate: data.start_date,
        endDate: data.end_date,
        isVotingEnabled: data.is_voting_enabled
      };
    } catch (e) {
      console.error("Connection Error:", e);
      return defaultSettings;
    }
  }

  async updateElectionSettings(adminId: string, settings: ElectionSettings): Promise<ElectionSettings> {
    const { error } = await supabase.from('settings').upsert({
      id: 1,
      start_date: settings.startDate,
      end_date: settings.endDate,
      is_voting_enabled: settings.isVotingEnabled
    });
    if (error) throw new Error(error.message);
    this.logAudit(adminId, UserRole.ADMIN, 'settings_updated', 'Updated election settings');
    return settings;
  }

  async getDepartments(): Promise<string[]> {
    try {
        const { data, error } = await supabase.from('departments').select('name');
        if (error || !data) return [];
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

  async getPositions(): Promise<string[]> {
    const { data, error } = await supabase.from('positions').select('name');
    if (error) return [];
    return data.map((d: any) => d.name);
  }

  async addPosition(adminId: string, name: string): Promise<string> {
    const { error } = await supabase.from('positions').insert({ name });
    if (error) throw new Error(error.message);
    return name;
  }

  async removePosition(adminId: string, name: string): Promise<void> {
    await supabase.from('positions').delete().eq('name', name);
  }

  async login(matricNo: string, password: string): Promise<User> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('matric_no', matricNo).single();
      
      // AUTO-SEED ADMIN LOGIC: 
      if ((error || !data) && matricNo === 'admin' && password === 'admin123') {
          console.log("Admin account not found. Attempting to create default admin...");
          
          const { data: newAdmin, error: createError } = await supabase.from('users').insert({
            full_name: 'NACOSS Administrator',
            matric_no: 'admin',
            department: 'Computer Science',
            role: 'admin',
            status: 'approved',
            password_hash: 'admin123',
            created_at: Date.now()
          }).select().single();
          
          if (newAdmin) {
              console.log("Admin created successfully.");
              return this.mapUser(newAdmin);
          } else {
              console.error("Failed to auto-seed admin:", createError);
              // CRITICAL FIX: Propagate the DB error so user knows RLS is blocking it
              if (createError?.message) throw new Error("DB Error: " + createError.message);
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
        // FIX: Detect ERR_NAME_NOT_RESOLVED (Configuration Error)
        if (e.message && (e.message.includes("Failed to fetch") || e.message.includes("NetworkError"))) {
             throw new Error("Network Error: Could not connect to Database. Check your Vercel API URL configuration. You may have pasted the API Key into the URL field.");
        }
        throw new Error(e.message || 'Connection failed');
    }
  }

  async register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
    // 1. Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('matric_no', data.matricNo)
        .single();
    
    // Payload for insertion or update
    const userPayload = {
      full_name: data.fullName,
      matric_no: data.matricNo,
      department: data.department,
      level: data.level,
      password_hash: data.passwordHash,
      id_card_url: data.idCardUrl, // Base64 string for now
      role: UserRole.STUDENT,
      status: ApprovalStatus.PENDING,
      created_at: Date.now(),
      rejection_reason: null // Clear any previous rejection reason
    };

    if (existingUser) {
        if (existingUser.status === ApprovalStatus.REJECTED) {
            // Allow re-registration: Update the existing record
            const { data: updated, error: updateError } = await supabase
                .from('users')
                .update(userPayload)
                .eq('matric_no', data.matricNo)
                .select()
                .single();
                
            if (updateError) throw new Error(updateError.message);
            await sendEmail('admins@nacoss.edu.ng', 'Re-Registration', `User ${data.fullName} re-registered`);
            return this.mapUser(updated);
        } else {
            // Already approved or pending
            throw new Error('Matric number already registered');
        }
    }

    // New Registration
    const { data: inserted, error } = await supabase.from('users').insert(userPayload).select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Matric number already registered');
      throw new Error(error.message);
    }
    
    await sendEmail('admins@nacoss.edu.ng', 'New Reg', `User ${data.fullName}`);
    return this.mapUser(inserted);
  }

  async getPendingUsers(): Promise<User[]> {
    const { data } = await supabase.from('users').select('*').eq('status', ApprovalStatus.PENDING);
    return (data || []).map(this.mapUser);
  }

  async processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void> {
    const status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    await supabase.from('users').update({ status, rejection_reason: reason }).eq('id', userId);
    
    // Fetch user to get email/details
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (user) {
       await sendEmail(user.email || 'student', approved ? 'Approved' : 'Rejected', 'Status update');
       this.logAudit(adminId, UserRole.ADMIN, approved ? 'approve_user' : 'reject_user', `User ${user.matric_no}`, userId);
    }
  }

  // --- ASPIRANT METHODS (Supabase) ---
  async registerAspirant(data: Omit<Aspirant, 'id' | 'status' | 'createdAt'>): Promise<Aspirant> {
    const { data: existing } = await supabase.from('aspirants').select('*').eq('matric_no', data.matricNo).single();
    if (existing) throw new Error("You have already applied.");

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
        status: ApprovalStatus.PENDING,
        created_at: Date.now()
    };

    const { data: inserted, error } = await supabase.from('aspirants').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return this.mapAspirant(inserted);
  }

  async getAspirants(): Promise<Aspirant[]> {
      const { data, error } = await supabase.from('aspirants').select('*');
      if (error) return [];
      return (data || []).map(this.mapAspirant);
  }

  async processAspirant(adminId: string, aspirantId: string, approved: boolean): Promise<void> {
      const status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
      
      const { data: aspirant, error } = await supabase
        .from('aspirants')
        .update({ status })
        .eq('id', aspirantId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);

      if (approved && aspirant) {
           await this.addCandidate(adminId, {
            name: aspirant.full_name,
            matricNo: aspirant.matric_no,
            department: aspirant.department,
            position: aspirant.position,
            manifesto: aspirant.manifesto,
            photoUrl: aspirant.passport_url
        });
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
          status: a.status,
          createdAt: Number(a.created_at)
      };
  }
  // ------------------------------------

  async getCandidates(): Promise<Candidate[]> {
    const { data } = await supabase.from('candidates').select('*');
    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      matricNo: c.matric_no,
      department: c.department,
      position: c.position,
      manifesto: c.manifesto,
      photoUrl: c.photo_url
    }));
  }

  async addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
    const dbCand = {
      name: candidate.name,
      matric_no: candidate.matricNo,
      department: candidate.department,
      position: candidate.position,
      manifesto: candidate.manifesto,
      photo_url: candidate.photoUrl
    };
    const { data, error } = await supabase.from('candidates').insert(dbCand).select().single();
    if (error) throw new Error(error.message);
    
    this.logAudit(adminId, UserRole.ADMIN, 'add_candidate', `Added ${candidate.name}`, data.id);
    return { ...candidate, id: data.id };
  }

  async updateCandidate(adminId: string, candidate: Candidate): Promise<Candidate> {
    const { error } = await supabase.from('candidates').update({
       name: candidate.name,
       matric_no: candidate.matricNo,
       department: candidate.department,
       position: candidate.position,
       manifesto: candidate.manifesto,
       photo_url: candidate.photoUrl
    }).eq('id', candidate.id);
    
    if(error) throw new Error(error.message);
    return candidate;
  }

  async removeCandidate(adminId: string, candidateId: string): Promise<void> {
    await supabase.from('candidates').delete().eq('id', candidateId);
  }

  async castVote(studentId: string, candidateId: string, position: Position): Promise<Vote> {
    const settings = await this.getElectionSettings();
    if (!settings.isVotingEnabled) throw new Error('Voting is closed');

    // Check existing vote
    const { data: existing } = await supabase.from('votes')
      .select('*').eq('student_id', studentId).eq('position', position).single();
    if (existing) throw new Error('Already voted for this position');

    const voteData = {
      student_id: studentId,
      candidate_id: candidateId,
      position: position,
      timestamp: Date.now()
    };
    
    const { data, error } = await supabase.from('votes').insert(voteData).select().single();
    if (error) throw new Error(error.message);
    
    return {
      id: data.id,
      studentId: data.student_id,
      candidateId: data.candidate_id,
      position: data.position,
      timestamp: Number(data.timestamp)
    };
  }

  async getMyVotes(studentId: string): Promise<Vote[]> {
    const { data } = await supabase.from('votes').select('*').eq('student_id', studentId);
    return (data || []).map((v: any) => ({
      id: v.id,
      studentId: v.student_id,
      candidateId: v.candidate_id,
      position: v.position,
      timestamp: Number(v.timestamp)
    }));
  }

  async getResults(): Promise<{candidateId: string, count: number}[]> {
    const { data } = await supabase.from('votes').select('candidate_id');
    const counts: Record<string, number> = {};
    (data || []).forEach((v: any) => {
      counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
    });
    return Object.entries(counts).map(([id, count]) => ({ candidateId: id, count }));
  }

  async getAuditLogs(adminId: string): Promise<AuditLog[]> {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    return (data || []).map((l: any) => ({
      id: l.id,
      actorId: l.actor_id,
      actorRole: l.actor_role as UserRole,
      actionType: l.action_type,
      details: l.details,
      timestamp: Number(l.timestamp)
    }));
  }

  async getDepartmentStats(): Promise<{name: string, count: number}[]> {
     const { data } = await supabase.from('users').select('department');
     const counts: Record<string, number> = {};
     (data || []).forEach((u: any) => {
         counts[u.department] = (counts[u.department] || 0) + 1;
     });
     return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  async getVoterBreakdown(): Promise<{
      byLevel: {name: string, count: number}[],
      byDepartment: {name: string, count: number}[]
  }> {
      const { data: users } = await supabase.from('users').select('id, level, department');
      const { data: votes } = await supabase.from('votes').select('student_id');
      
      const votingStudentIds = new Set((votes || []).map((v: any) => v.student_id));
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

  private async logAudit(actorId: string, role: UserRole, type: string, details: string, targetId?: string) {
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_role: role,
      action_type: type,
      details: details,
      target_id: targetId,
      timestamp: Date.now()
    });
  }
}

// Export the selected database service
export const db = USE_MOCK_DB ? new MockDB() : new SupabaseDB();
