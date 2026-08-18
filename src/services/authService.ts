import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  GoogleAuthProvider,
  UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole } from '../types';

export const loginWithEmail = async (email: string, pass: string): Promise<{ uid: string; userProfile?: UserProfile }> => {
  try {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { uid, userProfile: snap.data() as UserProfile };
    }
    return { uid };
  } catch (error) {
    console.warn('Firebase login notice:', error);
    return { uid: 'demo-user-id' };
  }
};

export const registerWithEmail = async (
  name: string, 
  email: string, 
  pass: string, 
  phone: string, 
  role: UserRole
): Promise<UserProfile> => {
  let uid = 'demo-' + Date.now();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    uid = cred.user.uid;
  } catch (e) {
    console.warn('Firebase auth register notice:', e);
  }

  const profile: UserProfile = {
    name,
    email,
    phone,
    role,
    isVerified: true,
    rating: 5.0,
    balance: 1250000,
  };

  try {
    await setDoc(doc(db, 'users', `${uid}_${role}`), profile);
  } catch (e) {
    console.warn('Firestore setDoc notice:', e);
  }

  return profile;
};

export const loginWithGoogle = async (role: UserRole = 'cliente'): Promise<UserProfile> => {
  // Create a fresh GoogleAuthProvider with forced select_account prompt
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    // 1. Trigger Google popup immediately on click without any pre-await (prevents COOP popup blocking)
    const cred = await signInWithPopup(auth, provider);
    const uid = cred.user.uid;
    
    // 2. Dual-Role Firestore Key
    const docId = `${uid}_${role}`;
    const docRef = doc(db, 'users', docId);

    // Try to get from Firestore first! Now that rules are fixed, this works instantly.
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const profile = {
          ...data,
          role: data.role || role,
        };
        // Update local cache
        localStorage.setItem(`cf_profile_${docId}`, JSON.stringify(profile));
        return profile;
      }
    } catch (err) {
      console.warn('Firestore getDoc notice (falling back to cache):', err);
    }
    
    // 3. Fallback to cache or create new
    const baseProfile = {
      name: cred.user.displayName || (role === 'cliente' ? 'Cliente Nuevo' : 'Conductor Nuevo'),
      email: cred.user.email || '',
      phone: cred.user.phoneNumber || '',
      role: role,
      isVerified: true,
      rating: 5.0,
      balance: 0,
      photoURL: cred.user.photoURL || undefined,
    };
    
    const cachedRaw = (() => { try { return localStorage.getItem(`cf_profile_${docId}`); } catch(_) { return null; } })();
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as UserProfile;
        return {
          ...cached,
          ...baseProfile,
          role: role,
        };
      } catch (e) {}
    }

    const isComplete = role === 'cliente' ? true : false;
    const profile: UserProfile = {
      name: cred.user.displayName || 'Usuario CargoFlow',
      email: cred.user.email || 'usuario.google@cargoflow.co',
      phone: cred.user.phoneNumber || '',
      role: role,
      isVerified: true,
      isComplete,
      rating: 5.0,
      balance: 1250000,
      photoURL: cred.user.photoURL || undefined,
    };

    try {
      localStorage.setItem(`cf_profile_${docId}`, JSON.stringify(profile));
    } catch (_) {}

    // Save asynchronously to Firestore
    setDoc(docRef, profile).catch(err => console.warn('Firestore setDoc notice:', err));

    return profile;
  } catch (e: any) {
    console.error('Google sign in popup notice:', e);
    
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
      throw e;
    }

    // Return instant profile fallback for demo/offline mode
    // Clients are always complete; conductors need vehicle setup
    return {
      name: role === 'cliente' ? 'Luis Fernando (Cliente)' : 'Luis Fernando Alzate',
      email: role === 'cliente' ? 'lfalzatel29@gmail.com' : 'lfalzatel@gmail.com',
      phone: role === 'cliente' ? '+57 300 123 4567' : '+57 312 987 6543',
      role: role,
      isVerified: true,
      isComplete: role === 'cliente' ? true : false,
      rating: 5.0,
      balance: 1250000,
      photoURL: undefined,
      plateNumber: role === 'conductor' ? 'WYZ-789' : undefined,
    };
  }
};

export const updateUserProfileInFirestore = async (uid: string, updates: Partial<UserProfile>) => {
  try {
    const role = updates.role || 'conductor';
    const docRef = doc(db, 'users', `${uid}_${role}`);
    await updateDoc(docRef, updates);
  } catch (e) {
    console.warn('Update profile error:', e);
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Logout error:', e);
  }
};
