import { User, UserRole } from '../types';
import { StorageService } from './storage';

interface StoredUserAccount extends User {
  password_hash: string;
}

const AUTH_KEYS = {
  CURRENT_USER: 'pusula_auth_current_user_v1',
  USERS_DB: 'pusula_auth_users_db_v1',
};

const DEFAULT_AVATAR_COLORS = [
  'bg-emerald-600 text-emerald-100',
  'bg-blue-600 text-blue-100',
  'bg-indigo-600 text-indigo-100',
  'bg-violet-600 text-violet-100',
  'bg-amber-600 text-amber-100',
  'bg-rose-600 text-rose-100',
  'bg-teal-600 text-teal-100',
];

const SEED_USERS: StoredUserAccount[] = [
  {
    id: 'usr_counselor_1',
    email: 'rehberlik@okul.k12.tr',
    password_hash: 'rehberlik123',
    name: 'Uzm. Psk. Dan. Yağız Efe',
    role: 'Rehber Öğretmen & Psikolojik Danışman',
    school: 'Atatürk Anadolu Lisesi',
    phone: '905324182914',
    created_at: '2026-01-15T08:30:00.000Z',
    avatar_color: 'bg-emerald-600 text-emerald-100',
  },
  {
    id: 'usr_coach_2',
    email: 'koc@pusula.edu',
    password_hash: 'koc123',
    name: 'Merve Aydın (YKS Koçu)',
    role: 'YKS / LGS Öğrenci Koçu',
    school: 'Hedef Bireysel Akademi',
    phone: '905438201945',
    created_at: '2026-02-10T10:00:00.000Z',
    avatar_color: 'bg-indigo-600 text-indigo-100',
  },
];

export const AuthService = {
  getUsers(): StoredUserAccount[] {
    try {
      const data = localStorage.getItem(AUTH_KEYS.USERS_DB);
      if (!data) {
        localStorage.setItem(AUTH_KEYS.USERS_DB, JSON.stringify(SEED_USERS));
        return SEED_USERS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_USERS;
    }
  },

  saveUsers(users: StoredUserAccount[]) {
    localStorage.setItem(AUTH_KEYS.USERS_DB, JSON.stringify(users));
  },

  getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(AUTH_KEYS.CURRENT_USER);
      if (!data) {
        // Return default seed counselor as initial logged-in user so existing experience isn't interrupted
        const defaultUser: User = {
          id: SEED_USERS[0].id,
          email: SEED_USERS[0].email,
          name: StorageService.getCounselorName() || SEED_USERS[0].name,
          role: SEED_USERS[0].role,
          school: SEED_USERS[0].school,
          phone: SEED_USERS[0].phone,
          created_at: SEED_USERS[0].created_at,
          avatar_color: SEED_USERS[0].avatar_color,
        };
        localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
        return defaultUser;
      }
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(AUTH_KEYS.CURRENT_USER, JSON.stringify(user));
      StorageService.setCounselorName(user.name);
    } else {
      localStorage.removeItem(AUTH_KEYS.CURRENT_USER);
    }
  },

  signIn(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const account = users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!account) {
      return { success: false, error: 'Bu e-posta adresiyle kayıtlı danışman hesabı bulunamadı.' };
    }

    if (account.password_hash !== password) {
      return { success: false, error: 'Girdiğiniz şifre hatalı. Lütfen tekrar deneyiniz.' };
    }

    const publicUser: User = {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      school: account.school,
      phone: account.phone,
      created_at: account.created_at,
      avatar_color: account.avatar_color,
    };

    this.setCurrentUser(publicUser);
    return { success: true, user: publicUser };
  },

  signUp(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    school?: string;
    phone?: string;
  }): { success: boolean; user?: User; error?: string } {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail || !data.password || !data.name.trim()) {
      return { success: false, error: 'Lütfen tüm zorunlu alanları doldurunuz.' };
    }

    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'Bu e-posta adresi zaten kullanımda. Giriş yapabilirsiniz.' };
    }

    const randomColor =
      DEFAULT_AVATAR_COLORS[Math.floor(Math.random() * DEFAULT_AVATAR_COLORS.length)];

    const newUserAccount: StoredUserAccount = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      email: trimmedEmail,
      password_hash: data.password,
      name: data.name.trim(),
      role: data.role,
      school: data.school?.trim() || 'Rehberlik Servisi',
      phone: data.phone?.trim() || '',
      created_at: new Date().toISOString(),
      avatar_color: randomColor,
    };

    users.push(newUserAccount);
    this.saveUsers(users);

    const publicUser: User = {
      id: newUserAccount.id,
      email: newUserAccount.email,
      name: newUserAccount.name,
      role: newUserAccount.role,
      school: newUserAccount.school,
      phone: newUserAccount.phone,
      created_at: newUserAccount.created_at,
      avatar_color: newUserAccount.avatar_color,
    };

    this.setCurrentUser(publicUser);
    return { success: true, user: publicUser };
  },

  updateProfile(data: Partial<User>): User | null {
    const current = this.getCurrentUser();
    if (!current) return null;

    const updated: User = {
      ...current,
      ...data,
      name: data.name ? data.name.trim() : current.name,
    };

    // Update in users database
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === current.id);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...data,
        name: updated.name,
      };
      this.saveUsers(users);
    }

    this.setCurrentUser(updated);
    return updated;
  },

  signOut() {
    this.setCurrentUser(null);
  },

  resetPassword(email: string, newPassword: string): { success: boolean; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);

    if (idx === -1) {
      return { success: false, error: 'Bu e-posta adresiyle eşleşen hesap bulunamadı.' };
    }

    users[idx].password_hash = newPassword;
    this.saveUsers(users);
    return { success: true };
  },

  quickDemoLogin(roleType: 'counselor' | 'coach'): User {
    const seed = roleType === 'counselor' ? SEED_USERS[0] : SEED_USERS[1];
    const publicUser: User = {
      id: seed.id,
      email: seed.email,
      name: seed.name,
      role: seed.role,
      school: seed.school,
      phone: seed.phone,
      created_at: seed.created_at,
      avatar_color: seed.avatar_color,
    };
    this.setCurrentUser(publicUser);
    return publicUser;
  },
};
