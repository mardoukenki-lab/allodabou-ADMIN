import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  writeBatch,
  serverTimestamp,
  deleteField,
  getDoc,
  setDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../services/firebase';
import { useAuth } from './AuthContext';
import {
  UserProfile,
  AdminLog,
  GnangoSettings,
  DriverChecklist,
  ToastMessage,
  ApplicationStatus,
} from '../types';
import { playNotificationSound } from '../services/audio';
import { showLocalNotification, setupFCMForegroundListener } from '../services/fcm';

interface DriversContextType {
  drivers: UserProfile[];
  loading: boolean;
  settings: GnangoSettings;
  updateSettings: (newSettings: Partial<GnangoSettings>) => Promise<void>;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  newPendingCount: number;
  resetNewPendingCount: () => void;
  
  // Actions de validation
  approveDriver: (driver: UserProfile, hasLicense: boolean, adminNote?: string) => Promise<void>;
  rejectDriver: (driver: UserProfile, reason: string) => Promise<void>;
  suspendDriver: (driver: UserProfile, reason: string) => Promise<void>;
  reactivateDriver: (driver: UserProfile, hasLicense?: boolean, adminNote?: string) => Promise<void>;
  upgradeToStandardCard: (driver: UserProfile) => Promise<void>;
  updateChecklist: (driverId: string, checklist: DriverChecklist) => Promise<void>;
  updateAdminNote: (driverId: string, note: string) => Promise<void>;
  updateDriverLicenseStatus: (driverId: string, hasLicense: boolean) => Promise<void>;

  // Journal d'audit
  logs: AdminLog[];
  logsLoading: boolean;
}

const defaultSettings: GnangoSettings = {
  cardValidityMonths: 3,
  licenseRequired: false,
  renewalAlertDays: 15,
};

const DriversContext = createContext<DriversContextType | undefined>(undefined);

export const DriversProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminProfile, currentUser } = useAuth();
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<GnangoSettings>(defaultSettings);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [newPendingCount, setNewPendingCount] = useState<number>(0);

  const isInitialSnapshotRef = useRef<boolean>(true);

  // Helper pour normaliser le statut effectif
  const getEffectiveStatus = (docData: any): ApplicationStatus => {
    if (docData.applicationStatus) return docData.applicationStatus as ApplicationStatus;
    if (docData.role === 'driver') return 'approved';
    return 'pending';
  };

  // 1. Écoute en temps réel des chauffeurs (driver_pending & driver)
  useEffect(() => {
    if (!currentUser || !adminProfile) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    isInitialSnapshotRef.current = true;

    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('role', 'in', ['driver_pending', 'driver']));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const effectiveStatus = getEffectiveStatus(data);
          list.push({
            id: docSnap.id,
            uid: docSnap.id,
            displayName: data.displayName || 'Chauffeur sans nom',
            email: data.email || '',
            phone: data.phone || '',
            role: data.role || 'driver_pending',
            isApprovedDriver: !!data.isApprovedDriver,
            approved: !!data.approved,
            vehicleType: data.vehicleType || 'moto',
            vehicleNumber: data.vehicleNumber || 'Non renseigné',
            photoUrl: data.photoUrl || '',
            isOnline: !!data.isOnline,
            lastSeenAt: data.lastSeenAt || null,
            ratingAverage: typeof data.ratingAverage === 'number' ? data.ratingAverage : undefined,
            ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : undefined,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
            driverCode: data.driverCode || '',
            hasLicense: typeof data.hasLicense === 'boolean' ? data.hasLicense : false,
            applicationStatus: effectiveStatus,
            rejectionReason: data.rejectionReason,
            suspensionReason: data.suspensionReason,
            reviewedBy: data.reviewedBy,
            reviewedAt: data.reviewedAt,
            adminNote: data.adminNote || '',
            checklist: data.checklist || {
              identity: false,
              license: false,
              vehicleRegistration: false,
              insurance: false,
              technicalInspection: false,
              helmet: false,
              gpsTracker: false,
              vest: false,
            },
            cardType: data.cardType,
            cardNumber: data.cardNumber || data.driverCode,
            cardValidFrom: data.cardValidFrom,
            cardValidUntil: data.cardValidUntil,
          });
        });

        // Détection des nouveaux ajouts APRES le premier snapshot
        if (!isInitialSnapshotRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const newData = change.doc.data();
              const status = getEffectiveStatus(newData);
              if (status === 'pending' || newData.role === 'driver_pending') {
                const driverName = newData.displayName || 'Nouveau chauffeur';
                playNotificationSound();
                setNewPendingCount((prev) => prev + 1);

                const toastId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                setToasts((prev) => [
                  ...prev,
                  {
                    id: toastId,
                    title: 'Nouvelle candidature reçue',
                    message: `Nouveau chauffeur : ${driverName}`,
                    type: 'info',
                    driverId: change.doc.id,
                  },
                ]);

                showLocalNotification('Allô Dabou Admin', {
                  body: `Nouvelle candidature chauffeur : ${driverName}`,
                });
              }
            }
          });
        }

        isInitialSnapshotRef.current = false;
        setDrivers(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, 'onSnapshot', 'users (driver_pending, driver)');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, adminProfile]);

  // Écoute des notifications push reçues au premier plan via FCM
  useEffect(() => {
    if (!currentUser || !adminProfile) return;

    const cleanup = setupFCMForegroundListener((payload) => {
      const toastId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          title: payload.title,
          message: payload.body,
          type: 'info',
          driverId: payload.driverId,
        },
      ]);
      setNewPendingCount((prev) => prev + 1);
    });

    return () => cleanup();
  }, [currentUser, adminProfile]);

  // Alerte visuelle dans le titre de l'onglet lors d'une nouvelle candidature
  useEffect(() => {
    if (newPendingCount > 0) {
      document.title = `(${newPendingCount}) Nouvelle candidature ! • Allô Dabou Admin`;
    } else {
      document.title = 'Allô Dabou Admin';
    }
  }, [newPendingCount]);

  useEffect(() => {
    const handleFocus = () => {
      if (document.title.startsWith('(')) {
        document.title = 'Allô Dabou Admin';
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 2. Écoute des paramètres settings/gnango
  useEffect(() => {
    if (!currentUser || !adminProfile) return;

    const settingsRef = doc(db, 'settings', 'gnango');
    const unsubscribe = onSnapshot(
      settingsRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            cardValidityMonths: data.cardValidityMonths ?? defaultSettings.cardValidityMonths,
            licenseRequired: data.licenseRequired ?? defaultSettings.licenseRequired,
            renewalAlertDays: data.renewalAlertDays ?? defaultSettings.renewalAlertDays,
          });
        } else {
          // Initialisation du document s'il n'existe pas encore
          try {
            await setDoc(settingsRef, defaultSettings);
          } catch (err) {
            handleFirestoreError(err, 'setDoc', 'settings/gnango');
          }
        }
      },
      (err) => {
        handleFirestoreError(err, 'onSnapshot', 'settings/gnango');
      }
    );

    return () => unsubscribe();
  }, [currentUser, adminProfile]);

  // 3. Écoute du journal d'audit adminLogs
  useEffect(() => {
    if (!currentUser || !adminProfile) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }

    setLogsLoading(true);
    const logsCol = collection(db, 'adminLogs');
    const q = query(logsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetchedLogs: AdminLog[] = [];
        snap.forEach((d) => {
          const lData = d.data();
          fetchedLogs.push({
            id: d.id,
            driverId: lData.driverId,
            driverName: lData.driverName || 'Chauffeur',
            action: lData.action,
            reason: lData.reason,
            adminId: lData.adminId,
            adminEmail: lData.adminEmail,
            createdAt: lData.createdAt,
          });
        });
        setLogs(fetchedLogs);
        setLogsLoading(false);
      },
      (err) => {
        handleFirestoreError(err, 'onSnapshot', 'adminLogs');
        setLogsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, adminProfile]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const resetNewPendingCount = () => {
    setNewPendingCount(0);
  };

  const updateSettings = async (newSettings: Partial<GnangoSettings>): Promise<void> => {
    try {
      const settingsRef = doc(db, 'settings', 'gnango');
      const updated = { ...settings, ...newSettings };
      await setDoc(settingsRef, updated, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'setDoc/updateSettings', 'settings/gnango');
      throw err;
    }
  };

  // ACTIONS CHAUFFEURS VIA WRITE BATCH

  const approveDriver = async (
    driver: UserProfile,
    hasLicense: boolean,
    adminNote?: string
  ): Promise<void> => {
    if (!adminProfile) throw new Error('Non authentifié');
    const batch = writeBatch(db);

    const userRef = doc(db, 'users', driver.id);
    const logRef = doc(collection(db, 'adminLogs'));

    const now = new Date();
    const cardType = hasLicense ? 'standard' : 'provisional_qr';
    const cardNumber = driver.driverCode || driver.cardNumber || `GNG-${driver.id.substring(0, 6).toUpperCase()}`;

    // Calcul de l'expiration pour provisional_qr
    let cardValidUntilVal: any = deleteField();
    if (!hasLicense) {
      const expirationDate = new Date(now);
      expirationDate.setMonth(expirationDate.getMonth() + (settings.cardValidityMonths || 3));
      cardValidUntilVal = Timestamp.fromDate(expirationDate);
    }

    const updates: Record<string, any> = {
      role: 'driver',
      isApprovedDriver: true,
      approved: true,
      applicationStatus: 'approved',
      rejectionReason: deleteField(),
      suspensionReason: deleteField(),
      hasLicense: hasLicense,
      cardType: cardType,
      cardNumber: cardNumber,
      cardValidFrom: serverTimestamp(),
      cardValidUntil: cardValidUntilVal,
      reviewedBy: adminProfile.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (adminNote !== undefined) {
      updates.adminNote = adminNote;
    }

    batch.update(userRef, updates);

    // Journal d'audit obligatoire
    batch.set(logRef, {
      driverId: driver.id,
      driverName: driver.displayName,
      action: 'approve',
      reason: adminNote || (hasLicense ? 'Approuvé avec permis (carte standard)' : 'Approuvé sans permis (carte provisoire QR)'),
      adminId: adminProfile.uid,
      adminEmail: adminProfile.email || 'admin@allodabou.ci',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'writeBatch/approve', `users/${driver.id}`);
      throw err;
    }
  };

  const rejectDriver = async (driver: UserProfile, reason: string): Promise<void> => {
    if (!adminProfile) throw new Error('Non authentifié');
    if (!reason || reason.trim().length < 10) {
      throw new Error('Le motif de refus est obligatoire et doit faire au moins 10 caractères.');
    }

    const batch = writeBatch(db);
    const userRef = doc(db, 'users', driver.id);
    const logRef = doc(collection(db, 'adminLogs'));

    batch.update(userRef, {
      role: 'driver_pending',
      isApprovedDriver: false,
      approved: false,
      applicationStatus: 'rejected',
      rejectionReason: reason.trim().slice(0, 300),
      reviewedBy: adminProfile.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(logRef, {
      driverId: driver.id,
      driverName: driver.displayName,
      action: 'reject',
      reason: reason.trim().slice(0, 300),
      adminId: adminProfile.uid,
      adminEmail: adminProfile.email || 'admin@allodabou.ci',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'writeBatch/reject', `users/${driver.id}`);
      throw err;
    }
  };

  const suspendDriver = async (driver: UserProfile, reason: string): Promise<void> => {
    if (!adminProfile) throw new Error('Non authentifié');
    if (!reason || reason.trim().length < 10) {
      throw new Error('Le motif de suspension est obligatoire et doit comporter au moins 10 caractères.');
    }

    const batch = writeBatch(db);
    const userRef = doc(db, 'users', driver.id);
    const logRef = doc(collection(db, 'adminLogs'));

    batch.update(userRef, {
      role: 'driver_pending',
      isApprovedDriver: false,
      approved: false,
      applicationStatus: 'suspended',
      suspensionReason: reason.trim().slice(0, 300),
      isOnline: false,
      reviewedBy: adminProfile.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(logRef, {
      driverId: driver.id,
      driverName: driver.displayName,
      action: 'suspend',
      reason: reason.trim().slice(0, 300),
      adminId: adminProfile.uid,
      adminEmail: adminProfile.email || 'admin@allodabou.ci',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'writeBatch/suspend', `users/${driver.id}`);
      throw err;
    }
  };

  const reactivateDriver = async (
    driver: UserProfile,
    hasLicense?: boolean,
    adminNote?: string
  ): Promise<void> => {
    if (!adminProfile) throw new Error('Non authentifié');
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', driver.id);
    const logRef = doc(collection(db, 'adminLogs'));

    const effectiveLicense = hasLicense ?? driver.hasLicense ?? false;
    const cardType = effectiveLicense ? 'standard' : 'provisional_qr';
    const cardNumber = driver.driverCode || driver.cardNumber || `GNG-${driver.id.substring(0, 6).toUpperCase()}`;

    let cardValidUntilVal: any = deleteField();
    if (!effectiveLicense) {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + (settings.cardValidityMonths || 3));
      cardValidUntilVal = Timestamp.fromDate(expirationDate);
    }

    const updates: Record<string, any> = {
      role: 'driver',
      isApprovedDriver: true,
      approved: true,
      applicationStatus: 'approved',
      suspensionReason: deleteField(),
      rejectionReason: deleteField(),
      hasLicense: effectiveLicense,
      cardType: cardType,
      cardNumber: cardNumber,
      cardValidFrom: serverTimestamp(),
      cardValidUntil: cardValidUntilVal,
      reviewedBy: adminProfile.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (adminNote !== undefined) {
      updates.adminNote = adminNote;
    }

    batch.update(userRef, updates);

    batch.set(logRef, {
      driverId: driver.id,
      driverName: driver.displayName,
      action: 'reactivate',
      reason: adminNote || 'Réactivation du compte chauffeur',
      adminId: adminProfile.uid,
      adminEmail: adminProfile.email || 'admin@allodabou.ci',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'writeBatch/reactivate', `users/${driver.id}`);
      throw err;
    }
  };

  const upgradeToStandardCard = async (driver: UserProfile): Promise<void> => {
    if (!adminProfile) throw new Error('Non authentifié');
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', driver.id);
    const logRef = doc(collection(db, 'adminLogs'));

    batch.update(userRef, {
      hasLicense: true,
      cardType: 'standard',
      cardValidUntil: deleteField(),
      updatedAt: serverTimestamp(),
    });

    batch.set(logRef, {
      driverId: driver.id,
      driverName: driver.displayName,
      action: 'card_standard',
      reason: 'Permis de conduire physique présenté. Passage en carte officielle standard permanente.',
      adminId: adminProfile.uid,
      adminEmail: adminProfile.email || 'admin@allodabou.ci',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'writeBatch/upgradeToStandardCard', `users/${driver.id}`);
      throw err;
    }
  };

  const updateChecklist = async (driverId: string, checklist: DriverChecklist): Promise<void> => {
    try {
      const userRef = doc(db, 'users', driverId);
      const batch = writeBatch(db);
      batch.update(userRef, {
        checklist: checklist,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'updateChecklist', `users/${driverId}`);
      throw err;
    }
  };

  const updateAdminNote = async (driverId: string, note: string): Promise<void> => {
    if (!adminProfile) return;
    try {
      const userRef = doc(db, 'users', driverId);
      const batch = writeBatch(db);
      batch.update(userRef, {
        adminNote: note.slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'updateAdminNote', `users/${driverId}`);
      throw err;
    }
  };

  const updateDriverLicenseStatus = async (driverId: string, hasLicense: boolean): Promise<void> => {
    try {
      const userRef = doc(db, 'users', driverId);
      const batch = writeBatch(db);
      batch.update(userRef, {
        hasLicense: hasLicense,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'updateDriverLicenseStatus', `users/${driverId}`);
      throw err;
    }
  };

  return (
    <DriversContext.Provider
      value={{
        drivers,
        loading,
        settings,
        updateSettings,
        toasts,
        dismissToast,
        newPendingCount,
        resetNewPendingCount,
        approveDriver,
        rejectDriver,
        suspendDriver,
        reactivateDriver,
        upgradeToStandardCard,
        updateChecklist,
        updateAdminNote,
        updateDriverLicenseStatus,
        logs,
        logsLoading,
      }}
    >
      {children}
    </DriversContext.Provider>
  );
};

export const useDrivers = () => {
  const context = useContext(DriversContext);
  if (!context) {
    throw new Error('useDrivers doit être utilisé au sein d’un DriversProvider');
  }
  return context;
};
