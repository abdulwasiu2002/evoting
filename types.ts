
export enum UserRole {
  GUEST = 'guest',
  STUDENT = 'student',
  ADMIN = 'admin'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export type Position = string;

export interface User {
  id: string;
  fullName: string;
  matricNo: string; // Used as login for students
  email?: string;
  department: string;
  role: UserRole;
  status: ApprovalStatus;
  passwordHash: string; // In real app, hashed. Here, plain for mock.
  idCardUrl?: string; // Mock URL
  rejectionReason?: string;
  createdAt: number;
}

export interface Candidate {
  id: string;
  name: string;
  matricNo: string;
  department: string;
  position: Position;
  manifesto: string;
  photoUrl: string;
}

export interface Aspirant {
  id: string;
  fullName: string;
  matricNo: string;
  department: string;
  level: string;
  position: Position;
  cgpa: string;
  manifesto: string;
  passportUrl: string; // For the candidate card
  resultUrl: string; // For admin verification of CGPA
  status: ApprovalStatus;
  createdAt: number;
}

export interface Vote {
  id: string;
  studentId: string;
  candidateId: string;
  position: Position;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  actionType: string;
  targetId?: string;
  details: string;
  timestamp: number;
}

export interface ElectionSettings {
  startDate: string; // ISO string
  endDate: string; // ISO string
  isVotingEnabled: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
