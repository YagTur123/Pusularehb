import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile as updateAuthProfile,
  deleteUser as deleteAuthUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  limit,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole } from '../types';
import { UserSchema } from './schemas';

const DEFAULT_AVATAR_COLORS = [
  'bg-emerald-600 text-emerald-100',
  'bg-blue-600 text-blue-100',
  'bg-indigo-600 text-indigo-100',
  'bg-violet-600 text-violet-100',
  'bg-amber-600 text-amber-100',
  'bg-rose-600 text-rose-100',
  'bg-teal-600 text-teal-100',
];

/**
 * Delete all documents in a collection in chunks of specified batchSize (e.g. 400)
 */
async function deleteSubcollectionInBatches(
  collRef: CollectionReference<DocumentData>,
  batchSize = 400
): Promise<void> {
  while (true) {
    const q = query(collRef, limit(batchSize));
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    if (snapshot.size < batchSize) break;
  }
}

export const AuthService = {
  /**
   * Listen to Firebase auth state changes. Fetches counselor profile from Firestore doc `counselors/{uid}`.
   */
  onAuthStateChange(callback: (user: User | null, rawUser: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        callback(null, null);
        return;
      }

      try {
        const counselorDocRef = doc(db, 'counselors', fbUser.uid);
        const snapshot = await getDoc(counselorDocRef);

        let userProfile: User;
        if (snapshot.exists()) {
          const data = snapshot.data();
          userProfile = {
            id: fbUser.uid,
            email: fbUser.email || data.email || '',
            name: data.name || fbUser.displayName || 'Rehberlik Danışmanı',
            role: (data.role as UserRole) || 'Rehber Öğretmen & Psikolojik Danışman',
            school: data.school || '',
            phone: data.phone || fbUser.phoneNumber || '',
            created_at: data.created_at || new Date().toISOString(),
            avatar_color: data.avatar_color || DEFAULT_AVATAR_COLORS[0],
            kvkk_accepted: !!data.kvkk_accepted,
            kvkk_accepted_at: data.kvkk_accepted_at,
          };
        } else {
          // New counselor user profile creation
          const randomColor =
            DEFAULT_AVATAR_COLORS[Math.floor(Math.random() * DEFAULT_AVATAR_COLORS.length)];
          userProfile = {
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'Rehberlik Danışmanı',
            role: 'Rehber Öğretmen & Psikolojik Danışman',
            school: '',
            phone: fbUser.phoneNumber || '',
            created_at: new Date().toISOString(),
            avatar_color: randomColor,
            kvkk_accepted: false,
          };
          // Save to Firestore
          await setDoc(counselorDocRef, userProfile, { merge: true });
        }

        callback(userProfile, fbUser);
      } catch (err) {
        console.error('Error fetching counselor profile:', err);
        // Fallback user from Firebase Auth token
        const basicUser: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || 'Rehberlik Danışmanı',
          role: 'Rehber Öğretmen & Psikolojik Danışman',
          created_at: new Date().toISOString(),
          avatar_color: DEFAULT_AVATAR_COLORS[0],
          kvkk_accepted: false,
        };
        callback(basicUser, fbUser);
      }
    });
  },

  /**
   * Sign In with Email and Password using Firebase Auth
   */
  async signInWithEmail(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const fbUser = userCredential.user;

      const counselorDocRef = doc(db, 'counselors', fbUser.uid);
      const snapshot = await getDoc(counselorDocRef);

      let userProfile: User;
      if (snapshot.exists()) {
        const data = snapshot.data();
        userProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: data.name || fbUser.displayName || 'Rehberlik Danışmanı',
          role: (data.role as UserRole) || 'Rehber Öğretmen & Psikolojik Danışman',
          school: data.school || '',
          phone: data.phone || '',
          created_at: data.created_at || new Date().toISOString(),
          avatar_color: data.avatar_color || DEFAULT_AVATAR_COLORS[0],
          kvkk_accepted: !!data.kvkk_accepted,
          kvkk_accepted_at: data.kvkk_accepted_at,
        };
      } else {
        userProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || 'Rehberlik Danışmanı',
          role: 'Rehber Öğretmen & Psikolojik Danışman',
          created_at: new Date().toISOString(),
          avatar_color: DEFAULT_AVATAR_COLORS[0],
          kvkk_accepted: false,
        };
        await setDoc(counselorDocRef, userProfile, { merge: true });
      }

      return { success: true, user: userProfile };
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      let message = 'Giriş yapılamadı.';
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
        message = 'E-posta adresi veya şifre hatalı.';
      } else if (authErr.code === 'auth/too-many-requests') {
        message = 'Çok fazla başarısız deneme yapıldı. Lütfen biraz bekleyin veya şifrenizi sıfırlayın.';
      } else if (authErr.code === 'auth/invalid-email') {
        message = 'Lütfen geçerli bir e-posta adresi giriniz.';
      } else if (authErr.message) {
        message = authErr.message;
      }
      return { success: false, error: message };
    }
  },

  /**
   * Sign Up with Email and Password using Firebase Auth and create counselor document.
   * Enforces minimum 10-character password and sends email verification.
   */
  async signUpWithEmail(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    school?: string;
    phone?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!data.password || data.password.length < 10) {
        return { success: false, error: 'Şifreniz güvenlik gereği en az 10 karakterden oluşmalıdır.' };
      }

      const trimmedEmail = data.email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, data.password);
      const fbUser = userCredential.user;

      // Update auth display name
      if (data.name.trim()) {
        try {
          await updateAuthProfile(fbUser, { displayName: data.name.trim() });
        } catch {
          // ignore display name update error
        }
      }

      // Send email verification to new user
      try {
        await sendEmailVerification(fbUser);
      } catch (verifErr) {
        console.warn('sendEmailVerification warning:', verifErr);
      }

      const randomColor =
        DEFAULT_AVATAR_COLORS[Math.floor(Math.random() * DEFAULT_AVATAR_COLORS.length)];

      const userProfile: User = {
        id: fbUser.uid,
        email: trimmedEmail,
        name: data.name.trim(),
        role: data.role,
        school: data.school?.trim() || '',
        phone: data.phone?.trim() || '',
        created_at: new Date().toISOString(),
        avatar_color: randomColor,
        kvkk_accepted: false,
      };

      // Validate with Zod
      UserSchema.parse(userProfile);

      // Save counselor document to counselors/{uid}
      const counselorDocRef = doc(db, 'counselors', fbUser.uid);
      await setDoc(counselorDocRef, userProfile);

      return { success: true, user: userProfile };
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      let message = 'Kayıt işlemi gerçekleştirilemedi.';
      if (authErr.code === 'auth/email-already-in-use') {
        message = 'Bu e-posta adresi zaten kullanımda. Lütfen giriş yapınız.';
      } else if (authErr.code === 'auth/weak-password') {
        message = 'Şifreniz en az 10 karakterden oluşmalıdır.';
      } else if (authErr.code === 'auth/invalid-email') {
        message = 'Lütfen geçerli bir e-posta adresi giriniz.';
      } else if (authErr.message) {
        message = authErr.message;
      }
      return { success: false, error: message };
    }
  },

  /**
   * Google Sign In via Firebase Popup
   */
  async signInWithGoogle(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const counselorDocRef = doc(db, 'counselors', fbUser.uid);
      const snapshot = await getDoc(counselorDocRef);

      let userProfile: User;
      if (snapshot.exists()) {
        const data = snapshot.data();
        userProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: data.name || fbUser.displayName || 'Rehberlik Danışmanı',
          role: (data.role as UserRole) || 'Rehber Öğretmen & Psikolojik Danışman',
          school: data.school || '',
          phone: data.phone || fbUser.phoneNumber || '',
          created_at: data.created_at || new Date().toISOString(),
          avatar_color: data.avatar_color || DEFAULT_AVATAR_COLORS[0],
          kvkk_accepted: !!data.kvkk_accepted,
          kvkk_accepted_at: data.kvkk_accepted_at,
        };
      } else {
        const randomColor =
          DEFAULT_AVATAR_COLORS[Math.floor(Math.random() * DEFAULT_AVATAR_COLORS.length)];
        userProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || 'Rehberlik Danışmanı',
          role: 'Rehber Öğretmen & Psikolojik Danışman',
          school: '',
          phone: fbUser.phoneNumber || '',
          created_at: new Date().toISOString(),
          avatar_color: randomColor,
          kvkk_accepted: false,
        };
        await setDoc(counselorDocRef, userProfile);
      }

      return { success: true, user: userProfile };
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      let message = 'Google ile giriş başarısız oldu.';
      if (authErr.code === 'auth/popup-closed-by-user') {
        message = 'Giriş penceresi kapatıldı.';
      } else if (authErr.code === 'auth/cancelled-popup-request') {
        message = 'Giriş isteği iptal edildi.';
      } else if (authErr.message) {
        message = authErr.message;
      }
      return { success: false, error: message };
    }
  },

  /**
   * Send Password Reset Email using Firebase sendPasswordResetEmail
   */
  async sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        return { success: false, error: 'Lütfen e-posta adresinizi giriniz.' };
      }
      await sendPasswordResetEmail(auth, trimmedEmail);
      return { success: true };
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      let message = 'Şifre sıfırlama bağlantısı gönderilemedi.';
      if (authErr.code === 'auth/user-not-found') {
        message = 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.';
      } else if (authErr.code === 'auth/invalid-email') {
        message = 'Geçerli bir e-posta adresi giriniz.';
      } else if (authErr.message) {
        message = authErr.message;
      }
      return { success: false, error: message };
    }
  },

  /**
   * Update counselor profile in Firestore
   */
  async updateProfile(userId: string, data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const counselorDocRef = doc(db, 'counselors', userId);
      const snapshot = await getDoc(counselorDocRef);
      const existing = snapshot.exists() ? snapshot.data() : {};

      const updated: User = {
        id: userId,
        email: existing.email || auth.currentUser?.email || '',
        name: data.name?.trim() || existing.name || auth.currentUser?.displayName || 'Danışman',
        role: data.role || existing.role || 'Rehber Öğretmen & Psikolojik Danışman',
        school: data.school !== undefined ? data.school.trim() : (existing.school || ''),
        phone: data.phone !== undefined ? data.phone.trim() : (existing.phone || ''),
        created_at: existing.created_at || new Date().toISOString(),
        avatar_color: existing.avatar_color || DEFAULT_AVATAR_COLORS[0],
        kvkk_accepted: data.kvkk_accepted !== undefined ? data.kvkk_accepted : !!existing.kvkk_accepted,
        kvkk_accepted_at: data.kvkk_accepted_at || existing.kvkk_accepted_at,
      };

      await setDoc(counselorDocRef, updated, { merge: true });

      if (data.name && auth.currentUser) {
        try {
          await updateAuthProfile(auth.currentUser, { displayName: data.name.trim() });
        } catch {
          // ignore
        }
      }

      return { success: true, user: updated };
    } catch (err: unknown) {
      const authErr = err as { message?: string };
      return { success: false, error: authErr.message || 'Profil güncellenemedi.' };
    }
  },

  /**
   * Mark KVKK consent accepted
   */
  async acceptKvkkConsent(userId: string): Promise<boolean> {
    try {
      const counselorDocRef = doc(db, 'counselors', userId);
      const consentTime = new Date().toISOString();
      await setDoc(
        counselorDocRef,
        {
          kvkk_accepted: true,
          kvkk_accepted_at: consentTime,
        },
        { merge: true }
      );
      // Also write to settings/kvkk
      const kvkkSettingRef = doc(db, 'counselors', userId, 'settings', 'kvkk');
      await setDoc(kvkkSettingRef, {
        accepted: true,
        accepted_at: consentTime,
        version: '1.0',
      });
      return true;
    } catch (err) {
      console.error('Failed to save KVKK consent:', err);
      return false;
    }
  },

  /**
   * KVKK Right to be Forgotten: Permanently deletes all students, sessions, settings, counselor profile and Auth user.
   * 1. Re-authenticates user first:
   *    - Google provider: reauthenticateWithPopup
   *    - Email/password provider: reauthenticateWithCredential using provided password
   * 2. Deletes subcollections in 400-item batches
   * 3. Deletes root counselor doc and legacy docs
   * 4. Calls deleteUser(currentUser) at the very end
   */
  async deleteAccountAndAllData(userId: string, password?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        return { success: false, error: 'Oturum açık değil veya kullanıcı kimliği uyuşmuyor.' };
      }

      // Step 1: Reauthenticate before destructive actions
      const isGoogleUser = currentUser.providerData.some((p) => p.providerId === 'google.com');
      if (isGoogleUser) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(currentUser, provider);
      } else {
        if (!password) {
          return { success: false, error: 'Hesabınızı ve verilerinizi silmek için mevcut şifrenizi girmelisiniz.' };
        }
        if (!currentUser.email) {
          return { success: false, error: 'Kullanıcı e-posta adresi bulunamadı.' };
        }
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
      }

      // Step 2: Delete subcollections in 400-document batches
      const studentsColl = collection(db, 'counselors', userId, 'students');
      await deleteSubcollectionInBatches(studentsColl, 400);

      const sessionsColl = collection(db, 'counselors', userId, 'sessions');
      await deleteSubcollectionInBatches(sessionsColl, 400);

      const settingsColl = collection(db, 'counselors', userId, 'settings');
      await deleteSubcollectionInBatches(settingsColl, 400);

      // Step 3: Delete root counselor document
      const counselorDocRef = doc(db, 'counselors', userId);
      await deleteDoc(counselorDocRef);

      // Also clean up any legacy documents if they exist
      try {
        await deleteDoc(doc(db, 'counselor_profiles', userId));
        await deleteDoc(doc(db, 'counselor_data', userId));
      } catch {
        // ignore
      }

      // Step 4: Finally delete Firebase Auth user
      await deleteAuthUser(currentUser);

      return { success: true };
    } catch (err: unknown) {
      console.error('Account deletion error:', err);
      const authErr = err as { code?: string; message?: string };
      let message = authErr.message || 'Hesap ve veriler silinirken bir hata oluştu.';
      if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
        message = 'Girdiğiniz mevcut şifre hatalı.';
      } else if (authErr.code === 'auth/requires-recent-login') {
        message = 'Güvenlik gereği lütfen oturumunuzu kapatıp tekrar giriş yapınız.';
      } else if (authErr.code === 'auth/popup-closed-by-user') {
        message = 'Google yeniden doğrulama penceresi kapatıldı.';
      }
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    await fbSignOut(auth);
  },

  /**
   * Get current auth user
   */
  getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  },
};
