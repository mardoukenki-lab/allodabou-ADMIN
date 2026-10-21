import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const SUPER_ADMIN_EMAILS = ['mardoukeni@gmail.com', 'mardoukenki@gmail.com'];

/**
 * H3: Envoi automatique de notification push FCM lors d'une nouvelle candidature chauffeur.
 * Déclenché en arrière-plan dès la création d'un document dans users/{uid}.
 */
export const onNewDriverApplication = onDocumentCreated('users/{uid}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const isDriverPending = data.role === 'driver_pending' || data.applicationStatus === 'pending';

  if (!isDriverPending) {
    return;
  }

  const driverName = data.displayName || 'Nouveau Chauffeur';
  const vehicleType = data.vehicleType === 'voiture' ? 'Voiture' : 'Moto (Gnango)';
  const phone = data.phone || data.phoneNumber || 'Non renseigné';

  // 1. Récupération de l'ensemble des jetons FCM des administrateurs
  const adminsSnap = await db.collection('admins').get();
  const allTokens: string[] = [];
  const tokenToAdminDocMap: Map<string, FirebaseFirestore.DocumentReference> = new Map();

  adminsSnap.forEach((docSnap) => {
    const adminData = docSnap.data();
    if (Array.isArray(adminData.fcmTokens)) {
      adminData.fcmTokens.forEach((token: string) => {
        if (typeof token === 'string' && token.trim().length > 0) {
          allTokens.push(token);
          tokenToAdminDocMap.set(token, docSnap.ref);
        }
      });
    }
  });

  if (allTokens.length === 0) {
    console.log('[onNewDriverApplication] Aucun jeton FCM administrateur enregistré.');
    return;
  }

  // 2. Préparation du payload FCM
  const message: admin.messaging.MulticastMessage = {
    tokens: allTokens,
    notification: {
      title: '🚨 Nouvelle candidature Allô Dabou',
      body: `${driverName} (${vehicleType}) vient de s'inscrire à Dabou.`,
    },
    data: {
      driverId: event.params.uid,
      driverName: driverName,
      phone: phone,
      type: 'new_application',
      click_action: '/',
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      notification: {
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        tag: `new-application-${event.params.uid}`,
        renotify: true,
      },
    },
  };

  // 3. Envoi multicast vers tous les terminaux admin
  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`[onNewDriverApplication] Notifications envoyées : ${response.successCount} succès, ${response.failureCount} échecs`);

  // 4. Nettoyage automatique des jetons FCM obsolètes ou révoqués
  if (response.failureCount > 0) {
    const tokensToRemove: { token: string; docRef: FirebaseFirestore.DocumentReference }[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          const badToken = allTokens[idx];
          const docRef = tokenToAdminDocMap.get(badToken);
          if (docRef) {
            tokensToRemove.push({ token: badToken, docRef });
          }
        }
      }
    });

    for (const item of tokensToRemove) {
      await item.docRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(item.token),
      });
      console.log(`[onNewDriverApplication] Jeton FCM invalide retiré : ${item.token.substring(0, 10)}...`);
    }
  }
});

/**
 * H2: Tâche planifiée d'expiration automatique des cartes provisoires échues.
 * S'exécute chaque nuit à 00:00 (Fuseau horaire officiel Africa/Abidjan).
 */
export const expireProvisionalCards = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Africa/Abidjan',
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    console.log(`[expireProvisionalCards] Début du contrôle des expirations à Abidjan (${now.toDate().toISOString()})`);

    // Recherche des chauffeurs agréés ayant une carte provisoire échue
    const expiredQuery = await db
      .collection('users')
      .where('isApprovedDriver', '==', true)
      .where('cardType', '==', 'provisional_qr')
      .where('cardValidUntil', '<=', now)
      .get();

    if (expiredQuery.empty) {
      console.log('[expireProvisionalCards] Aucune carte provisoire expirée trouvée.');
      return;
    }

    console.log(`[expireProvisionalCards] ${expiredQuery.size} carte(s) provisoire(s) expirée(s) à traiter.`);

    const batch = db.batch();

    expiredQuery.forEach((docSnap) => {
      const data = docSnap.data();
      const driverId = docSnap.id;
      const cardNumber = (data.cardNumber || data.driverCode || `GNG-${driverId.substring(0, 6).toUpperCase()}`).toUpperCase();

      // Suspension du profil dans users
      batch.update(docSnap.ref, {
        applicationStatus: 'suspended',
        isApprovedDriver: false,
        approved: false,
        suspensionReason: 'Carte provisoire expirée : fin de validité réglementaire sans régularisation de permis.',
        isOnline: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mise à jour du registre public pour invalidation instantanée du QR Code
      const publicRef = db.collection('publicDrivers').doc(cardNumber);
      batch.set(
        publicRef,
        {
          status: 'suspended',
          isApprovedDriver: false,
          suspensionReason: 'Carte provisoire expirée.',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Enregistrement inaltérable dans le journal d'audit
      const logRef = db.collection('adminLogs').doc();
      batch.set(logRef, {
        driverId: driverId,
        driverName: data.displayName || 'Chauffeur Dabou',
        action: 'suspend',
        reason: 'Suspension automatique serveur : Carte d’identification provisoire QR arrivée à expiration.',
        adminId: 'system_cron_abidjan',
        adminEmail: 'system@allodabou.ci',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`[expireProvisionalCards] Fin du traitement : ${expiredQuery.size} chauffeur(s) suspendu(s) pour carte échue.`);
  }
);

/**
 * H6: Fonction appelable de révocation complète et sécurisée d'un administrateur.
 * Désactive le compte dans Firebase Auth, révoque tous les tokens de rafraîchissement
 * et retire l'administrateur de Firestore.
 */
export const revokeAdmin = onCall(async (request) => {
  // Vérification de l'authentification et des privilèges Super Admin
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour cette opération.');
  }

  const callerEmail = request.auth.token.email || '';
  const isSuper =
    request.auth.token.superAdmin === true ||
    SUPER_ADMIN_EMAILS.includes(callerEmail.toLowerCase().trim());

  if (!isSuper) {
    throw new HttpsError('permission-denied', 'Seul le Super Administrateur peut révoquer des comptes.');
  }

  const targetUid = request.data?.uid;
  if (!targetUid || typeof targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'UID de l’administrateur manquant.');
  }

  try {
    // 1. Désactivation dans Firebase Authentication et révocation de session
    await admin.auth().updateUser(targetUid, { disabled: true });
    await admin.auth().revokeRefreshTokens(targetUid);

    // 2. Suppression du document dans la collection admins
    const adminDocRef = db.collection('admins').doc(targetUid);
    const adminSnap = await adminDocRef.get();
    const adminData = adminSnap.data();

    await adminDocRef.delete();

    // 3. Journalisation d'audit serveur
    await db.collection('adminLogs').add({
      driverId: targetUid,
      driverName: adminData?.name || 'Administrateur',
      action: 'note',
      reason: `Révocation serveur et désactivation du compte Auth : ${adminData?.name} (${adminData?.email})`,
      adminId: request.auth.uid,
      adminEmail: callerEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Administrateur révoqué et désactivé avec succès.' };
  } catch (err: any) {
    console.error('[revokeAdmin] Erreur lors de la révocation:', err);
    throw new HttpsError('internal', err.message || 'Échec de la révocation.');
  }
});
