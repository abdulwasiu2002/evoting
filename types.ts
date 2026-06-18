
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

export interface Position {
  name: string;
  price: number;
  eligibleLevel: string;
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
  createdAt: number;
}

export interface Vote {
  id: string;
  studentId: string;
  candidateId: string;
  position: string; // Just the name reference
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
