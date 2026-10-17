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

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PAID = 'paid'
}

export type ElectionStatus = 'draft' | 'scheduled' | 'live' | 'closed' | 'archived';

export interface Election {
  id: string;
  title: string;
  session: string; // e.g. "2024/2025" or "2025/2026"
  description: string;
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string; // ISO string or YYYY-MM-DD
  status: ElectionStatus;
  isVotingEnabled: boolean;
  eligibleLevels?: string[]; // e.g. ['ND I', 'ND II', 'HND I', 'HND II'] or ['All']
  eligibleDepartments?: string[]; // e.g. ['Computer Science'] or ['All']
  aspirantRegistrationOpen?: boolean;
  aspirantFeeRequired?: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export const DEFAULT_ELECTION_ID = 'nacos-election-2024';

export const DEFAULT_ELECTION: Election = {
  id: DEFAULT_ELECTION_ID,
  title: 'NACOS General Elections 2024/2025',
  session: '2024/2025',
  description: 'The official live executive election for the Nigeria Association of Computing Students (NACOS).',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'live',
  isVotingEnabled: true,
  eligibleLevels: ['All'],
  eligibleDepartments: ['All'],
  aspirantRegistrationOpen: true,
  aspirantFeeRequired: true,
  createdAt: 1714521600000,
  updatedAt: Date.now(),
  createdBy: 'admin-1'
};

export interface Position {
  id?: string;
  name: string;
  price: number;
  eligibleLevel: string;
  electionId?: string;
}

export interface User {
  id: string;
  fullName: string;
  matricNo: string; // Used as login for students
  email?: string;
  department: string;
  level?: string; // Added level
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
  position: string; // Just the name reference
  manifesto: string;
  photoUrl: string;
  // Extra fields from Aspirant
  level?: string;
  cgpa?: string;
  resultUrl?: string;
  electionId?: string;
}

export interface Aspirant {
  id: string;
  fullName: string;
  matricNo: string;
  department: string;
  level: string;
  position: string; // Just the name reference
  cgpa: string;
  manifesto: string;
  passportUrl: string; // For the candidate card
  resultUrl: string; // For admin verification of CGPA
  address?: string; // Added
  phone?: string; // Added
  status: ApprovalStatus;
  paymentStatus: PaymentStatus;
  paymentReceiptUrl?: string; // For the aspirant to prove payment
  electionId?: string;
  createdAt: number;
}

export interface Vote {
  id: string;
  studentId: string;
  candidateId: string;
  position: string; // Just the name reference
  electionId?: string;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  actionType: string;
  targetId?: string;
  details: string;
  electionId?: string;
  timestamp: number;
}

export interface ElectionSettings {
  startDate: string; // ISO string
  endDate: string; // ISO string
  isVotingEnabled: boolean;
  electionId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export enum ExecutiveStatus {
  ACTIVE = 'Active Executive',
  OUTGOING = 'Outgoing Executive',
  ARCHIVED = 'Archived'
}

export interface OutgoingExecutive {
  id: string;
  fullName: string;
  position: string;
  session: string;
  startDate: string;
  endDate: string;
  biography: string;
  achievements: string;
  appreciationMessage: string;
  quote: string;
  profileImage: string;
  status: ExecutiveStatus;
  createdAt: number;
}
