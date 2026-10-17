import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getAuth,
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../services/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { AdminUser } from '../types';

interface AdminProfile {
  uid: string;
  email: string | null;
  name?: string;
  role?: string;
  createdAt?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  registerSuperAdmin: (password: string, emailChoice?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  isSuperAdmin: boolean;
  
  // Gestion multi-admins (jusqu'à 5 admins créés par le Super Admin)
  adminUsers: AdminUser[];
  adminUsersLoading: boolean;
  addAdminUser: (email: string, name: string, role: 'admin' | 'dispatch', password: string) => Promise<void>;
  removeAdminUser: (uid: string) => Promise<void>;
  maxAdminsLimit: number;
}

const SUPER_ADMIN_EMAILS = ['mardoukeni@gmail.com', 'mardoukenki@gmail.com'];
const MAX_ADMINS_LIMIT = 5;

export function checkIsSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Liste des administrateurs
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setAdminProfile(null);
        setLoading(false);
        return;
      }

      const isSuper = checkIsSuperAdmin(user.email);

      try {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
          if (isSuper) {
            console.log(`[Auth] Amorçage automatique du Super Administrateur : ${user.email}`);
            try {
              await setDoc(adminRef, {
                email: user.email,
                name: 'Super Administrateur Allô Dabou',
                role: 'super_admin',
                createdAt: serverTimestamp(),
              });
            } catch (createErr) {
              console.warn('[Auth] Avertissement lors de la création du document admin:', createErr);
            }

            setCurrentUser(user);
            setAdminProfile({
              uid: user.uid,
              email: user.email,
              name: 'Super Administrateur Allô Dabou',
              role: 'super_admin',
              isSuperAdmin: true,
            });
            setAuthError(null);
          } else {
            console.warn(`[Auth] Refus d'accès : UID ${user.uid} absent de la collection admins`);
            await signOut(auth);
            setCurrentUser(null);
            setAdminProfile(null);
            setAuthError('Accès réservé aux administrateurs. Votre compte n’est pas autorisé.');
          }
        } else {
          setCurrentUser(user);
          const data = adminSnap.data();
          setAdminProfile({
            uid: user.uid,
            email: user.email,
            name: data?.name || data?.displayName || (isSuper ? 'Super Administrateur Allô Dabou' : 'Administrateur'),
            role: data?.role || (isSuper ? 'super_admin' : 'admin'),
            isSuperAdmin: isSuper || data?.role === 'super_admin',
          });
          setAuthError(null);
        }
      } catch (err: unknown) {
        if (isSuper) {
          console.warn('[Auth] Accès de secours accordé au Super Administrateur:', err);
          setCurrentUser(user);
          setAdminProfile({
            uid: user.uid,
            email: user.email,
            name: 'Super Administrateur Allô Dabou',
            role: 'super_admin',
            isSuperAdmin: true,
          });
          setAuthError(null);
        } else {
          handleFirestoreError(err, 'getDoc', `admins/${user.uid}`);
          await signOut(auth);
          setCurrentUser(null);
          setAdminProfile(null);
          setAuthError('Erreur de vérification des permissions administrateur.');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Écoute de la collection admins si l'utilisateur est connecté et admin
  useEffect(() => {
    if (!currentUser || !adminProfile) {
      setAdminUsers([]);
      setAdminUsersLoading(false);
      return;
    }

    setAdminUsersLoading(true);
    const adminsCol = collection(db, 'admins');
    const unsubscribe = onSnapshot(
      adminsCol,
      (snapshot) => {
        const list: AdminUser[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            uid: docSnap.id,
            email: d.email || '',
            name: d.name || 'Administrateur',
            role: d.role || 'admin',
            createdAt: d.createdAt || null,
            addedBy: d.addedBy || '',
            fcmTokens: d.fcmTokens || [],
          });
        });
        setAdminUsers(list);
        setAdminUsersLoading(false);
      },
      (err) => {
        handleFirestoreError(err, 'onSnapshot', 'admins');
        setAdminUsersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, adminProfile]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);
    const isSuper = checkIsSuperAdmin(email);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = cred.user;

      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        if (isSuper) {
          try {
            await setDoc(adminRef, {
              email: user.email,
              name: 'Super Administrateur Allô Dabou',
              role: 'super_admin',
              createdAt: serverTimestamp(),
            });
          } catch (writeErr) {
            console.warn('[Auth] Avertissement auto-bootstrap login:', writeErr);
          }

          setCurrentUser(user);
          setAdminProfile({
            uid: user.uid,
            email: user.email,
            name: 'Super Administrateur Allô Dabou',
            role: 'super_admin',
            isSuperAdmin: true,
          });
          setLoading(false);
          return true;
        } else {
          await signOut(auth);
          setAuthError('Accès réservé aux administrateurs. Ce compte n’est pas habilité.');
          setLoading(false);
          return false;
        }
      }

      const data = adminSnap.data();
      setCurrentUser(user);
      setAdminProfile({
        uid: user.uid,
        email: user.email,
        name: data?.name || data?.displayName || (isSuper ? 'Super Administrateur Allô Dabou' : 'Administrateur'),
        role: data?.role || (isSuper ? 'super_admin' : 'admin'),
        isSuperAdmin: isSuper || data?.role === 'super_admin',
      });
      setLoading(false);
      return true;
    } catch (err: unknown) {
      setLoading(false);
      const firebaseErr = err as { code?: string; message?: string };
      if (
        firebaseErr.code === 'auth/user-not-found' ||
        firebaseErr.code === 'auth/wrong-password' ||
        firebaseErr.code === 'auth/invalid-credential'
      ) {
        setAuthError('Email ou mot de passe incorrect.');
      } else if (firebaseErr.code === 'auth/too-many-requests') {
        setAuthError('Trop de tentatives infructueuses. Réessayez dans quelques instants.');
      } else {
        setAuthError(firebaseErr.message || 'Erreur lors de la connexion.');
      }
      return false;
    }
  };

  const registerSuperAdmin = async (password: string, emailChoice?: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);
    try {
      const email = (emailChoice || 'mardoukeni@gmail.com').toLowerCase().trim();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const adminRef = doc(db, 'admins', user.uid);
      try {
        await setDoc(adminRef, {
          email: user.email,
          name: 'Super Administrateur Allô Dabou',
          role: 'super_admin',
          fcmTokens: [],
          createdAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        });
      } catch (docErr) {
        console.warn('[Auth] Avertissement lors de la création Firestore du super admin:', docErr);
      }

      setCurrentUser(user);
      setAdminProfile({
        uid: user.uid,
        email: user.email,
        name: 'Super Administrateur Allô Dabou',
        role: 'super_admin',
        isSuperAdmin: true,
      });
      setLoading(false);
      return true;
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('Ce compte existe déjà. Connectez-vous avec votre mot de passe ou cliquez sur "Mot de passe oublié".');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Le mot de passe doit comporter au moins 6 caractères.');
      } else {
        setAuthError(err.message || 'Erreur lors de la création du compte.');
      }
      return false;
    }
  };

  /**
   * Permet au Super Admin d'ajouter jusqu'à 5 administrateurs.
   * Utilise une instance Firebase Auth secondaire pour créer le compte sans déconnecter le Super Admin actuel.
   */
  const addAdminUser = async (
    email: string,
    name: string,
    role: 'admin' | 'dispatch',
    password: string
  ): Promise<void> => {
    if (!adminProfile?.isSuperAdmin) {
      throw new Error('Seul le Super Administrateur est autorisé à ajouter des administrateurs.');
    }

    const currentNonSuperCount = adminUsers.filter((a) => a.role !== 'super_admin').length;
    if (currentNonSuperCount >= MAX_ADMINS_LIMIT) {
      throw new Error(`La limite maximale de ${MAX_ADMINS_LIMIT} administrateurs est atteinte.`);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = adminUsers.find((a) => a.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('Un administrateur existe déjà avec cette adresse email.');
    }

    // Création du compte utilisateur via instance Firebase secondaire
    const secondaryAppName = 'SecondaryAuthAdminApp';
    let secondaryApp = getApps().find((a) => a.name === secondaryAppName);
    if (!secondaryApp) {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    }
    const secondaryAuth = getAuth(secondaryApp);

    let newUid = '';
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
      newUid = cred.user.uid;
      await signOut(secondaryAuth);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        throw new Error('Cette adresse email est déjà utilisée par un compte Firebase.');
      }
      if (authErr.code === 'auth/weak-password') {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
      }
      throw new Error(authErr.message || 'Erreur lors de la création de l’identifiant.');
    }

    // Écriture du document admins/{uid}
    try {
      const adminDocRef = doc(db, 'admins', newUid);
      await setDoc(adminDocRef, {
        email: normalizedEmail,
        name: name.trim(),
        role: role,
        addedBy: adminProfile.email || 'Super Admin',
        fcmTokens: [],
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });

      // Journalisation dans adminLogs
      const logRef = collection(db, 'adminLogs');
      await addDoc(logRef, {
        driverId: newUid,
        driverName: name.trim(),
        action: 'note',
        reason: `Création du compte administrateur ${role === 'dispatch' ? 'Dispatch' : 'Admin'} : ${name.trim()} (${normalizedEmail})`,
        adminId: adminProfile.uid,
        adminEmail: adminProfile.email || 'Super Admin',
        createdAt: serverTimestamp(),
      });
    } catch (firestoreErr) {
      handleFirestoreError(firestoreErr, 'setDoc', `admins/${newUid}`);
      throw firestoreErr;
    }
  };

  /**
   * Permet au Super Admin de supprimer/révoquer un administrateur.
   */
  const removeAdminUser = async (uid: string): Promise<void> => {
    if (!adminProfile?.isSuperAdmin) {
      throw new Error('Seul le Super Administrateur peut révoquer un administrateur.');
    }

    const target = adminUsers.find((a) => a.uid === uid);
    if (!target) return;
    if (target.role === 'super_admin') {
      throw new Error('Impossible de révoquer le compte Super Administrateur principal.');
    }

    try {
      await deleteDoc(doc(db, 'admins', uid));

      // Journalisation de la révocation
      const logRef = collection(db, 'adminLogs');
      await addDoc(logRef, {
        driverId: uid,
        driverName: target.name,
        action: 'note',
        reason: `Révocation de l'accès administrateur pour : ${target.name} (${target.email})`,
        adminId: adminProfile.uid,
        adminEmail: adminProfile.email || 'Super Admin',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, 'deleteDoc', `admins/${uid}`);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAdminProfile(null);
      setAuthError(null);
    } catch (err) {
      console.error('[Auth] Erreur de déconnexion:', err);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      if (firebaseErr.code === 'auth/user-not-found') {
        throw new Error('Aucun compte administrateur trouvé avec cette adresse.');
      }
      throw new Error(firebaseErr.message || 'Erreur lors de l’envoi de l’email.');
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        adminProfile,
        loading,
        authError,
        login,
        registerSuperAdmin,
        logout,
        resetPassword,
        clearError,
        isSuperAdmin: !!adminProfile?.isSuperAdmin,
        adminUsers,
        adminUsersLoading,
        addAdminUser,
        removeAdminUser,
        maxAdminsLimit: MAX_ADMINS_LIMIT,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein d’un AuthProvider');
  }
  return context;
};
