import { User, UserRole, ApprovalStatus } from '../types';

export const SESSION_KEY = 'nacos_voting_session';
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_THROTTLE_MS = 2000; // Throttle storage writes during active interactions to at most once per 2 seconds
const HEARTBEAT_INTERVAL_MS = 3000; // Check expiration every 3 seconds

export interface StoredUser {
  id: string;
  fullName: string;
  matricNo: string;
  email?: string;
  department: string;
  level?: string;
  role: UserRole;
  status: ApprovalStatus;
  idCardUrl?: string;
  rejectionReason?: string;
  createdAt: number;
}

export interface StoredSession {
  user: StoredUser;
  expiresAt: number;
  lastActive: number;
}

export type SessionChangeReason = 'login' | 'logout' | 'expired' | 'sync';
export type SessionListener = (user: User | null, reason: SessionChangeReason) => void;

class SessionManager {
  private listeners: Set<SessionListener> = new Set();
  private lastActivityThrottle: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  constructor() {
    // Session manager initialized
  }

  /**
   * Strips out sensitive fields such as passwords or password hashes.
   */
  private sanitizeUser(user: User): StoredUser {
    return {
      id: user.id,
      fullName: user.fullName,
      matricNo: user.matricNo,
      email: user.email,
      department: user.department,
      level: user.level,
      role: user.role,
      status: user.status,
      idCardUrl: user.idCardUrl,
      rejectionReason: user.rejectionReason,
      createdAt: user.createdAt
    };
  }

  /**
   * Converts a StoredUser back into the User model with an empty passwordHash.
   */
  private mapStoredToUser(stored: StoredUser): User {
    return {
      ...stored,
      passwordHash: '' // Passwords are never stored locally
    };
  }

  /**
   * Reads the raw session payload from localStorage safely.
   */
  public getStoredSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed: StoredSession = JSON.parse(raw);
      if (!parsed || !parsed.user || typeof parsed.expiresAt !== 'number') {
        return null;
      }
      return parsed;
    } catch (e) {
      console.warn('Failed to parse stored session:', e);
      return null;
    }
  }

  /**
   * Retrieves the current session only if it is strictly not expired.
   * If expired, it automatically removes the stored session and returns null.
   */
  public getValidSession(): StoredSession | null {
    const session = this.getStoredSession();
    if (!session) return null;

    const now = Date.now();
    if (now >= session.expiresAt) {
      this.clearSession(false);
      return null;
    }

    return session;
  }

  /**
   * Returns the current valid User or null.
   */
  public getValidUser(): User | null {
    const session = this.getValidSession();
    if (!session) return null;
    return this.mapStoredToUser(session.user);
  }

  /**
   * Saves a new session on successful login with a 10-minute inactivity expiration.
   */
  public saveSession(user: User): void {
    const sanitized = this.sanitizeUser(user);
    const now = Date.now();
    const session: StoredSession = {
      user: sanitized,
      expiresAt: now + INACTIVITY_TIMEOUT_MS,
      lastActive: now
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      this.lastActivityThrottle = now;
      this.notifyListeners(this.mapStoredToUser(sanitized), 'login');
    } catch (e) {
      console.error('Failed to save session to localStorage:', e);
    }
  }

  /**
   * Refreshes / extends the session inactivity timer if a valid session exists.
   * Will NOT extend if the session is already expired.
   */
  public recordActivity(): boolean {
    const now = Date.now();

    // Throttle writes to avoid localStorage overhead on every mousemove/scroll
    if (now - this.lastActivityThrottle < ACTIVITY_THROTTLE_MS) {
      return true;
    }

    const session = this.getStoredSession();
    if (!session) {
      return false;
    }

    // Do NOT automatically extend an already-expired session
    if (now >= session.expiresAt) {
      this.clearSession(true, 'expired');
      return false;
    }

    // Extend session by 10 minutes
    session.expiresAt = now + INACTIVITY_TIMEOUT_MS;
    session.lastActive = now;
    this.lastActivityThrottle = now;

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (e) {
      console.warn('Failed to update session activity timestamp:', e);
      return false;
    }
  }

  /**
   * Clears the session from localStorage and notifies listeners.
   */
  public clearSession(notify = true, reason: SessionChangeReason = 'logout'): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Failed to remove session from localStorage:', e);
    }

    if (notify) {
      this.notifyListeners(null, reason);
    }
  }

  /**
   * Checks if current session has expired. Called on heartbeat or tab focus.
   */
  public checkSessionValidity(): void {
    const session = this.getStoredSession();
    if (!session) return;

    const now = Date.now();
    if (now >= session.expiresAt) {
      this.clearSession(true, 'expired');
    }
  }

  private notifyListeners(user: User | null, reason: SessionChangeReason) {
    this.listeners.forEach((listener) => {
      try {
        listener(user, reason);
      } catch (e) {
        console.error('Error in session listener:', e);
      }
    });
  }

  /**
   * Subscribes to global session changes, multi-tab sync, and user activity.
   */
  public initSessionListener(listener: SessionListener): () => void {
    this.listeners.add(listener);

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.setupGlobalHandlers();
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private setupGlobalHandlers() {
    // 1. Multi-tab synchronization
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === SESSION_KEY) {
        if (!event.newValue) {
          // Session was removed in another tab
          this.notifyListeners(null, 'logout');
        } else {
          try {
            const parsed: StoredSession = JSON.parse(event.newValue);
            if (parsed && parsed.expiresAt > Date.now()) {
              this.notifyListeners(this.mapStoredToUser(parsed.user), 'sync');
            } else {
              this.clearSession(true, 'expired');
            }
          } catch (e) {
            this.clearSession(true, 'logout');
          }
        }
      }
    });

    // 2. Activity listeners: clicks, key presses, scrolling, mouse move, touch
    const activityHandler = () => {
      this.recordActivity();
    };

    const eventOptions: AddEventListenerOptions = { passive: true };
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, activityHandler, eventOptions);
    });

    // 3. Tab visibility / Focus change check
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.checkSessionValidity();
      }
    };

    window.addEventListener('focus', () => this.checkSessionValidity());
    document.addEventListener('visibilitychange', visibilityHandler);

    // 4. Periodic heartbeat interval to automatically trigger logout on 10 minutes of inactivity
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      this.checkSessionValidity();
    }, HEARTBEAT_INTERVAL_MS);
  }
}

export const sessionService = new SessionManager();
