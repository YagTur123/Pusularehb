import { StorageService } from './storage';
import { AuthService } from './auth';
import { User } from '../types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

class FirebaseSyncService {
  private currentStatus: SyncStatus = 'synced';
  private lastSyncedAt: Date = new Date();
  private statusListeners: Set<(status: SyncStatus, lastSynced?: Date) => void> = new Set();
  private isSyncEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setStatus('synced', new Date());
      });
      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });
    }

    // Listen to StorageService data changes and errors
    StorageService.onChange(() => {
      this.setStatus('synced', new Date());
    });

    StorageService.onError((err) => {
      console.warn('Sync notice:', err);
      this.setStatus('error');
    });
  }

  public isEnabled(): boolean {
    return this.isSyncEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isSyncEnabled = enabled;
    if (!enabled) {
      this.setStatus('offline');
    } else {
      this.setStatus('synced', new Date());
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
    return StorageService.onChange(callback);
  }

  public setStatus(status: SyncStatus, updatedDate?: Date) {
    this.currentStatus = status;
    if (updatedDate) this.lastSyncedAt = updatedDate;
    this.statusListeners.forEach((fn) => fn(this.currentStatus, this.lastSyncedAt));
  }

  public initSyncForCounselor(counselorId?: string, _counselorName?: string) {
    if (counselorId) {
      StorageService.init(counselorId);
      this.setStatus('synced', new Date());
    } else {
      StorageService.clear();
      this.setStatus('offline');
    }
  }

  public async syncLocalToCloud(): Promise<boolean> {
    this.setStatus('syncing');
    const uid = StorageService.getStudents();
    this.setStatus('synced', new Date());
    return true;
  }

  public async syncUserProfile(user: User): Promise<void> {
    if (user.id) {
      await AuthService.updateProfile(user.id, user);
    }
  }

  public async pullFromCloud(): Promise<boolean> {
    const uid = AuthService.getCurrentFirebaseUser()?.uid;
    if (uid) {
      StorageService.init(uid);
      return true;
    }
    return false;
  }
}

export const cloudSync = new FirebaseSyncService();
