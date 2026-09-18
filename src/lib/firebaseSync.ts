import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Student, Session, ScheduleConfig, User } from '../types';
import { StorageService } from './storage';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

class FirebaseSyncService {
  private activeCounselorId: string = 'global_counselor';
  private unsubscribeSnapshot: (() => void) | null = null;
  private statusListeners: Set<(status: SyncStatus, lastSynced?: Date) => void> = new Set();
  private dataListeners: Set<() => void> = new Set();
  private currentStatus: SyncStatus = 'synced';
  private lastSyncedAt: Date = new Date();
  private isWritingToCloud: boolean = false;

  constructor() {
    // Check initial online status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectivityChange(true));
      window.addEventListener('offline', () => this.handleConnectivityChange(false));
    }
  }

  public getStatus(): { status: SyncStatus; lastSynced: Date } {
    return { status: this.currentStatus, lastSynced: this.lastSyncedAt };
  }

  public onStatusChange(callback: (status: SyncStatus, lastSynced?: Date) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus, this.lastSyncedAt);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public onDataUpdated(callback: () => void): () => void {
    this.dataListeners.add(callback);
    return () => {
      this.dataListeners.delete(callback);
    };
  }

  private setStatus(status: SyncStatus, updatedDate?: Date) {
    this.currentStatus = status;
    if (updatedDate) this.lastSyncedAt = updatedDate;
    this.statusListeners.forEach((fn) => fn(this.currentStatus, this.lastSyncedAt));
  }

  private notifyDataUpdated() {
    this.dataListeners.forEach((fn) => fn());
  }

  private handleConnectivityChange(isOnline: boolean) {
    if (!isOnline) {
      this.setStatus('offline');
    } else {
      this.syncLocalToCloud();
    }
  }

  /**
   * Set counselor identifier and subscribe to real-time Cloud updates
   */
  public initSyncForCounselor(counselorId?: string, counselorName?: string) {
    const id = counselorId && counselorId.trim() ? counselorId.trim() : 'global_counselor';
    this.activeCounselorId = id;

    // Unsubscribe existing listener if any
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    try {
      const docRef = doc(db, 'counselor_data', this.activeCounselorId);
      this.setStatus('syncing');

      // Realtime listener for Firestore changes across devices (Vercel, Mobile, Desktop)
      this.unsubscribeSnapshot = onSnapshot(
        docRef,
        (snapshot) => {
          if (this.isWritingToCloud) {
            // Echo from self write, ignore to prevent circular triggers
            return;
          }

          if (snapshot.exists()) {
            const data = snapshot.data();
            let hasChanged = false;

            if (Array.isArray(data.students)) {
              StorageService.saveStudents(data.students, this.activeCounselorId);
              hasChanged = true;
            }
            if (Array.isArray(data.sessions)) {
              StorageService.saveSessions(data.sessions, this.activeCounselorId);
              hasChanged = true;
            }
            if (data.counselor_name) {
              StorageService.setCounselorName(data.counselor_name, this.activeCounselorId);
              hasChanged = true;
            }
            if (data.schedule_config) {
              StorageService.saveScheduleConfig(data.schedule_config, this.activeCounselorId);
              hasChanged = true;
            }

            this.setStatus('synced', new Date());
            if (hasChanged) {
              this.notifyDataUpdated();
            }
          } else {
            // First time this counselor connects, push local data to cloud
            this.syncLocalToCloud(counselorName);
          }
        },
        (error) => {
          console.warn('Firebase sync listener error:', error);
          this.setStatus('error');
        }
      );
    } catch (err) {
      console.warn('Failed to initialize Firebase snapshot:', err);
      this.setStatus('error');
    }
  }

  /**
   * Synchronizes current local state directly to Cloud Firestore
   */
  public async syncLocalToCloud(counselorName?: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return false;
    }

    try {
      this.setStatus('syncing');
      this.isWritingToCloud = true;

      const students = StorageService.getStudents(this.activeCounselorId);
      const sessions = StorageService.getSessions(this.activeCounselorId);
      const schedule_config = StorageService.getScheduleConfig(this.activeCounselorId);
      const name = counselorName || StorageService.getCounselorName(this.activeCounselorId);

      const docRef = doc(db, 'counselor_data', this.activeCounselorId);
      await setDoc(
        docRef,
        {
          counselor_id: this.activeCounselorId,
          counselor_name: name,
          students,
          sessions,
          schedule_config,
          updated_at: new Date().toISOString(),
          server_timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      this.setStatus('synced', new Date());
      return true;
    } catch (error) {
      console.error('Firebase cloud save failed:', error);
      this.setStatus('error');
      return false;
    } finally {
      // Small timeout before re-enabling snapshot listening to absorb write echo
      setTimeout(() => {
        this.isWritingToCloud = false;
      }, 800);
    }
  }

  /**
   * Sync counselor profile data
   */
  public async syncUserProfile(user: User): Promise<void> {
    try {
      const profileRef = doc(db, 'counselor_profiles', user.id);
      await setDoc(
        profileRef,
        {
          ...user,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to save profile to Firestore:', e);
    }
  }

  /**
   * Force manual refresh from cloud
   */
  public async pullFromCloud(): Promise<boolean> {
    try {
      this.setStatus('syncing');
      const docRef = doc(db, 'counselor_data', this.activeCounselorId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.students)) {
          StorageService.saveStudents(data.students, this.activeCounselorId);
        }
        if (Array.isArray(data.sessions)) {
          StorageService.saveSessions(data.sessions, this.activeCounselorId);
        }
        if (data.counselor_name) {
          StorageService.setCounselorName(data.counselor_name, this.activeCounselorId);
        }
        if (data.schedule_config) {
          StorageService.saveScheduleConfig(data.schedule_config, this.activeCounselorId);
        }
        this.setStatus('synced', new Date());
        this.notifyDataUpdated();
        return true;
      }
      this.setStatus('synced');
      return false;
    } catch (err) {
      console.error('Firebase pull failed:', err);
      this.setStatus('error');
      return false;
    }
  }
}

export const cloudSync = new FirebaseSyncService();
