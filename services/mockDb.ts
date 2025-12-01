
import { User, Candidate, Vote, AuditLog, UserRole, ApprovalStatus, Position, ElectionSettings } from '../types';
import { sendEmail } from './emailService';

// --- CONFIGURATION ---
// Set this to false to connect to your real Flask/Python backend
// Set this to true to use the local browser storage (Demo Mode)
const USE_MOCK_DB = true; 

// Your Backend URL (e.g., http://localhost:5000/api or https://api.yourdomain.com)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ---------------------

// Constants for LocalStorage keys (Mock Mode)
const USERS_KEY = 'univote_users';
const CANDIDATES_KEY = 'univote_candidates';
const VOTES_KEY = 'univote_votes';
const AUDIT_KEY = 'univote_audit';
const POSITIONS_KEY = 'univote_positions';
const DEPARTMENTS_KEY = 'univote_departments';
const SETTINGS_KEY = 'univote_settings';

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
  },
  {
    id: 'c-3',
    name: 'Sarah Johnson',
    matricNo: 'CS/2022/112',
    department: 'Computer Science',
    position: 'General Secretary',
    manifesto: 'Effective communication is the backbone of any association. I will ensure timely dissemination of information and digitalize our secretariat.',
    photoUrl: 'https://picsum.photos/200/200?random=3'
  },
  {
    id: 'c-4',
    name: 'David Mark',
    matricNo: 'CS/2022/089',
    department: 'Computer Science',
    position: 'Director of Socials',
    manifesto: 'Tech bro no suppose boring! I will organize the biggest NACOSS dinner and tech-week ever witnessed in this campus.',
    photoUrl: 'https://picsum.photos/200/200?random=4'
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
}

// ----------------------------------------------------------------------
// 1. LOCAL MOCK DB (Browser Storage - For Demo/Prototyping)
// ----------------------------------------------------------------------

class MockDB implements IDatabaseService {
  private listeners: Record<string, Listener[]> = {};

  constructor() {
    this.init();
    
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
  }

  private getItems<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItems<T>(key: string, items: T[]) {
    localStorage.setItem(key, JSON.stringify(items));
  }
  
  private getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  private setItem<T>(key: string, item: T) {
    localStorage.setItem(key, JSON.stringify(item));
  }

  private addAudit(actorId: string, role: UserRole, action: string, details: string, targetId?: string) {
    const logs = this.getItems<AuditLog>(AUDIT_KEY);
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
  }

  async getElectionSettings(): Promise<ElectionSettings> {
    await delay(200);
    return this.getItem<ElectionSettings>(SETTINGS_KEY) || defaultSettings;
  }

  async updateElectionSettings(adminId: string, settings: ElectionSettings): Promise<ElectionSettings> {
    await delay(300);
    this.setItem(SETTINGS_KEY, settings);
    this.addAudit(adminId, UserRole.ADMIN, 'settings_updated', `Election settings updated. Enabled: ${settings.isVotingEnabled}`);
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
    this.addAudit(adminId, UserRole.ADMIN, 'department_added', `Added department: ${name}`);
    return name;
  }

  async removeDepartment(adminId: string, name: string): Promise<void> {
    let depts = this.getItems<string>(DEPARTMENTS_KEY);
    depts = depts.filter(d => d !== name);
    this.setItems(DEPARTMENTS_KEY, depts);
    this.addAudit(adminId, UserRole.ADMIN, 'department_removed', `Removed department: ${name}`);
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
    this.addAudit(adminId, UserRole.ADMIN, 'position_added', `Added position: ${name}`);
    return name;
  }

  async removePosition(adminId: string, name: string): Promise<void> {
    let positions = this.getItems<string>(POSITIONS_KEY);
    positions = positions.filter(p => p !== name);
    this.setItems(POSITIONS_KEY, positions);
    this.addAudit(adminId, UserRole.ADMIN, 'position_removed', `Removed position: ${name}`);
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
    if (users.find(u => u.matricNo === data.matricNo)) {
      throw new Error('Matric number already registered');
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
    await sendEmail('admins@nacoss.edu.ng', 'New NACOSS Registration Pending', `Name: ${newUser.fullName}\nMatric: ${newUser.matricNo}`);
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

    const studentEmail = user.email || `${user.matricNo.toLowerCase()}@student.nacoss.edu.ng`;
    await sendEmail(studentEmail, approved ? 'Approved' : 'Rejected', approved ? 'You can now login.' : `Reason: ${reason}`);
  }

  async getCandidates(): Promise<Candidate[]> {
    await delay(300);
    return this.getItems<Candidate>(CANDIDATES_KEY);
  }

  async addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
      const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
      const newCand = { ...candidate, id: `c-${Date.now()}` };
      candidates.push(newCand);
      this.setItems(CANDIDATES_KEY, candidates);
      this.addAudit(adminId, UserRole.ADMIN, 'candidate_added', `Added ${candidate.name}`, newCand.id);
      return newCand;
  }

  async updateCandidate(adminId: string, candidate: Candidate): Promise<Candidate> {
    const candidates = this.getItems<Candidate>(CANDIDATES_KEY);
    const index = candidates.findIndex(c => c.id === candidate.id);
    if (index === -1) throw new Error('Candidate not found');

    candidates[index] = candidate;
    this.setItems(CANDIDATES_KEY, candidates);
    this.addAudit(adminId, UserRole.ADMIN, 'candidate_updated', `Updated ${candidate.name}`, candidate.id);
    return candidate;
  }

  async removeCandidate(adminId: string, candidateId: string): Promise<void> {
      let candidates = this.getItems<Candidate>(CANDIDATES_KEY);
      candidates = candidates.filter(c => c.id !== candidateId);
      this.setItems(CANDIDATES_KEY, candidates);
      this.addAudit(adminId, UserRole.ADMIN, 'candidate_removed', `Removed candidate ${candidateId}`, candidateId);
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
}

// ----------------------------------------------------------------------
// 2. REAL API SERVICE (Connects to Flask/Python Backend)
// ----------------------------------------------------------------------

class ApiDB implements IDatabaseService {
  private tokenKey = 'univote_auth_token';

  // --- Real-time Subscription ---
  // In a real REST app without WebSockets, we rely on Polling for simplicity.
  // Advanced: Connect to a /events SSE endpoint here.
  public subscribe(event: string, callback: Listener): () => void {
    // Poll every 10 seconds for generic updates if needed
    const interval = setInterval(() => {
       // Optional: fetch check
    }, 10000);
    return () => clearInterval(interval);
  }

  public connectToLiveUpdates(event: string, callback: Listener): () => void {
    // For results, we poll frequently (e.g. 5 seconds)
    const interval = setInterval(async () => {
        // Trigger a refresh call on the frontend
        callback(null);
    }, 5000);
    return () => clearInterval(interval);
  }

  // --- Helpers ---
  private getToken(): string | null {
      return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string) {
      localStorage.setItem(this.tokenKey, token);
  }

  private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
      const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      };
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (err: any) {
          console.error(`API Request Failed: ${endpoint}`, err);
          throw err;
      }
  }

  // --- Settings ---
  async getElectionSettings(): Promise<ElectionSettings> {
      return this.request('GET', '/settings');
  }

  async updateElectionSettings(adminId: string, settings: ElectionSettings): Promise<ElectionSettings> {
      return this.request('PUT', '/settings', settings);
  }

  // --- Departments ---
  async getDepartments(): Promise<string[]> {
      return this.request('GET', '/departments');
  }

  async addDepartment(adminId: string, name: string): Promise<string> {
      return this.request('POST', '/departments', { name });
  }

  async removeDepartment(adminId: string, name: string): Promise<void> {
      return this.request('DELETE', `/departments/${encodeURIComponent(name)}`);
  }

  // --- Positions ---
  async getPositions(): Promise<string[]> {
      return this.request('GET', '/positions');
  }

  async addPosition(adminId: string, name: string): Promise<string> {
      return this.request('POST', '/positions', { name });
  }

  async removePosition(adminId: string, name: string): Promise<void> {
      return this.request('DELETE', `/positions/${encodeURIComponent(name)}`);
  }

  // --- Auth ---
  async login(matricNo: string, password: string): Promise<User> {
      const res = await this.request<{token: string, user: User}>('POST', '/auth/login', { matricNo, password });
      this.setToken(res.token);
      return res.user;
  }

  async register(data: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
      // Backend expects file upload separately or base64. 
      // Assuming backend accepts base64 idCardUrl as per this mock implementation.
      return this.request('POST', '/auth/register', data);
  }

  async getPendingUsers(): Promise<User[]> {
      return this.request('GET', '/admin/users/pending');
  }

  async processRegistration(adminId: string, userId: string, approved: boolean, reason?: string): Promise<void> {
      return this.request('POST', `/admin/users/${userId}/review`, { approved, reason });
  }

  // --- Candidates ---
  async getCandidates(): Promise<Candidate[]> {
      return this.request('GET', '/candidates');
  }

  async addCandidate(adminId: string, candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
      return this.request('POST', '/admin/candidates', candidate);
  }

  async updateCandidate(adminId: string, candidate: Candidate): Promise<Candidate> {
      return this.request('PUT', `/admin/candidates/${candidate.id}`, candidate);
  }

  async removeCandidate(adminId: string, candidateId: string): Promise<void> {
      return this.request('DELETE', `/admin/candidates/${candidateId}`);
  }

  // --- Voting ---
  async castVote(studentId: string, candidateId: string, position: Position): Promise<Vote> {
      return this.request('POST', '/votes', { studentId, candidateId, position });
  }

  async getMyVotes(studentId: string): Promise<Vote[]> {
      return this.request('GET', '/votes/me');
  }

  async getResults(): Promise<{candidateId: string, count: number}[]> {
      return this.request('GET', '/votes/results');
  }

  // --- Analytics ---
  async getAuditLogs(adminId: string): Promise<AuditLog[]> {
      return this.request('GET', '/admin/audit');
  }

  async getDepartmentStats(): Promise<{name: string, count: number}[]> {
      return this.request('GET', '/stats/departments');
  }
}

// Export the selected database service
export const db = USE_MOCK_DB ? new MockDB() : new ApiDB();

