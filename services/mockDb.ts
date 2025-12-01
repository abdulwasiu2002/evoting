
import { User, Candidate, Vote, AuditLog, UserRole, ApprovalStatus, Position, ElectionSettings } from '../types';
import { sendEmail } from './emailService';

// Constants for LocalStorage keys
const USERS_KEY = 'univote_users';
const CANDIDATES_KEY = 'univote_candidates';
const VOTES_KEY = 'univote_votes';
const AUDIT_KEY = 'univote_audit';
const POSITIONS_KEY = 'univote_positions';
const DEPARTMENTS_KEY = 'univote_departments';
const SETTINGS_KEY = 'univote_settings';

// Initial Seed Data
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

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Listener = (data?: any) => void;

class MockDB {
  private listeners: Record<string, Listener[]> = {};

  constructor() {
    this.init();
    
    // Listen for storage events to support multi-tab real-time updates
    window.addEventListener('storage', (event) => {
      if (event.key === VOTES_KEY) {
        // null payload indicates "reload needed" or "unknown update from another tab"
        this.emit('vote_update', null);
      }
      if (event.key === USERS_KEY) {
        this.emit('user_update', null);
      }
    });
  }

  // --- Real-time Subscription Methods ---

  public subscribe(event: string, callback: Listener): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  // Semantic alias for WebSocket/SSE connection
  public connectToLiveUpdates(event: string, callback: Listener): () => void {
    return this.subscribe(event, callback);
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // --- Initialization ---

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

  // --- Settings Methods ---
  
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

  // --- Department Methods ---

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

  // --- Position Methods ---

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

  // --- Auth & User Methods ---

  async login(matricNo: string, password: string): Promise<User> {
    await delay(500);
    const users = this.getItems<User>(USERS_KEY);
    const user = users.find(u => u.matricNo === matricNo && u.passwordHash === password);
    
    if (!user) throw new Error('Invalid credentials');
    
    // Check if approved student
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
      // Mocking the file upload path (in reality, data.idCardUrl should be the path)
      // For this demo, we assume the frontend passed a base64 or blob URL in data.idCardUrl
      idCardUrl: data.idCardUrl || 'https://picsum.photos/400/300?grayscale' 
    };

    users.push(newUser);
    this.setItems(USERS_KEY, users);
    this.addAudit('system', UserRole.GUEST, 'registration_submitted', `User ${newUser.fullName} registered`, newUser.id);
    
    this.emit('user_update', newUser);

    // Notify Admins
    // In a real app, this would query all admins or send to a mailing list
    await sendEmail(
      'admins@nacoss.edu.ng', 
      'New NACOSS Registration Pending', 
      `A new student has registered and requires verification.\n\nName: ${newUser.fullName}\nMatric: ${newUser.matricNo}\nDepartment: ${newUser.department}`
    );

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
    if (!approved && reason) {
      user.rejectionReason = reason;
    }

    this.setItems(USERS_KEY, users);
    this.addAudit(
      adminId, 
      UserRole.ADMIN, 
      approved ? 'registration_approved' : 'registration_rejected', 
      `User ${user.matricNo} processed`, 
      userId
    );

    this.emit('user_update', user);

    // Notify Student
    const studentEmail = user.email || `${user.matricNo.toLowerCase()}@student.nacoss.edu.ng`;
    const subject = approved ? 'NACOSS Registration Approved' : 'NACOSS Registration Rejected';
    const body = approved 
      ? `Dear ${user.fullName},\n\nYour registration has been approved by the electoral committee. You may now log in and cast your vote.`
      : `Dear ${user.fullName},\n\nYour registration has been rejected.\nReason: ${reason || 'Details not provided.'}\n\nPlease contact the NACOSS secretariat for assistance.`;

    await sendEmail(studentEmail, subject, body);
  }

  // --- Voting Methods ---

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

    // Enforce Election Settings
    const settings = await this.getElectionSettings();
    const now = new Date();
    const start = new Date(settings.startDate);
    // Set end date to end of day
    const end = new Date(settings.endDate);
    end.setHours(23, 59, 59, 999);

    if (!settings.isVotingEnabled) {
      throw new Error("Election is currently closed by administration.");
    }
    if (now < start) {
      throw new Error(`Voting has not started yet. Starts: ${settings.startDate}`);
    }
    if (now > end) {
      throw new Error(`Voting has ended. Ended: ${settings.endDate}`);
    }

    const votes = this.getItems<Vote>(VOTES_KEY);
    
    // Check if already voted for this position
    const hasVoted = votes.some(v => v.studentId === studentId && v.position === position);
    if (hasVoted) throw new Error(`Already voted for ${position}`);

    const newVote: Vote = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId,
      candidateId,
      position,
      timestamp: Date.now()
    };

    votes.push(newVote);
    this.setItems(VOTES_KEY, votes);
    this.addAudit(studentId, UserRole.STUDENT, 'vote_cast', `Voted for ${position}`, newVote.id);
    
    // Notify subscribers (Real-time update)
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
    votes.forEach(v => {
      counts[v.candidateId] = (counts[v.candidateId] || 0) + 1;
    });
    return Object.entries(counts).map(([candidateId, count]) => ({ candidateId, count }));
  }

  async getAuditLogs(adminId: string): Promise<AuditLog[]> {
      return this.getItems<AuditLog>(AUDIT_KEY);
  }

  async getDepartmentStats(): Promise<{name: string, count: number}[]> {
    await delay(300);
    const users = this.getItems<User>(USERS_KEY).filter(u => u.role === UserRole.STUDENT);
    const counts: Record<string, number> = {};
    users.forEach(u => {
        counts[u.department] = (counts[u.department] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }
}

export const db = new MockDB();