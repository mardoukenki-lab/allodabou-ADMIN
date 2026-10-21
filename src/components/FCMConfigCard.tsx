import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  getFCMDiagnostic,
  requestNotificationPermissionAndGetToken,
  showLocalNotification,
  OFFICIAL_VAPID_KEY,
  type FCMDiagnostic,
} from '../services/fcm';
import { playNotificationSound } from '../services/audio';
import {
  Bell,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Code2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const FCMConfigCard: React.FC = () => {
  const { adminProfile, currentUser, adminUsers } = useAuth();
  const isOnline = useOnlineStatus();

  const [diagnostic, setDiagnostic] = useState<FCMDiagnostic | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [showFullToken, setShowFullToken] = useState<boolean>(false);
  const [showCloudFunctionGuide, setShowCloudFunctionGuide] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Charger le statut FCM
  const refreshDiagnostic = async () => {
    setLoading(true);
    const diag = await getFCMDiagnostic();
    setDiagnostic(diag);
    setLoading(false);
  };

  useEffect(() => {
    refreshDiagnostic();
  }, []);

  // Activer ou réactualiser la permission FCM
  const handleEnableNotifications = async () => {
    setRequesting(true);
    setStatusMessage(null);
    try {
      const token = await requestNotificationPermissionAndGetToken(adminProfile?.uid || currentUser?.uid);
      await refreshDiagnostic();
      if (token) {
        setStatusMessage('Notifications push configurées et synchronisées avec succès !');
        // Tester directement
        showLocalNotification('Allô Dabou Admin', {
          body: 'Notifications push opérationnelles pour les candidatures chauffeurs.',
        });
      } else {
        setStatusMessage('Permission non accordée ou bloquée dans les paramètres du navigateur.');
      }
    } catch (err: any) {
      setStatusMessage(`Erreur de configuration : ${err.message || 'Échec d’obtention du jeton'}`);
    } finally {
      setRequesting(false);
    }
  };

  // Test de la notification push
  const handleTestNotification = () => {
    playNotificationSound();
    showLocalNotification('Notification de test Allô Dabou', {
      body: 'Le système d’alerte push FCM et le carillon sont opérationnels sur ce terminal.',
      tag: 'test-driver-alert',
    });
    setStatusMessage('Carillon audio joué et notification push envoyée !');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleCopyToken = () => {
    if (!diagnostic?.token) return;
    navigator.clipboard.writeText(diagnostic.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  // Total des tokens enregistrés dans l'équipe
  const totalTeamTokens = adminUsers.reduce((sum, u) => sum + (u.fcmTokens?.length || 0), 0);

  const cloudFunctionCode = `/**
 * Firebase Cloud Function pour alerter automatiquement les administrateurs Allô Dabou
 * Déclenchement automatique dès qu'un chauffeur soumet sa candidature
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const onNewDriverApplication = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return null;

    // Alerter uniquement pour les nouvelles candidatures chauffeurs
    if (data.role === 'driver_pending' || data.applicationStatus === 'pending') {
      const driverName = data.displayName || 'Nouveau chauffeur';
      const vehicle = data.vehicleType === 'voiture' ? 'Voiture' : 'Moto';

      // 1. Récupération de tous les jetons FCM des administrateurs
      const adminsSnap = await admin.firestore().collection('admins').get();
      const tokens: string[] = [];
      adminsSnap.forEach((doc) => {
        const adminData = doc.data();
        if (Array.isArray(adminData.fcmTokens)) {
          tokens.push(...adminData.fcmTokens);
        }
      });

      if (tokens.length === 0) {
        console.log('Aucun jeton FCM admin enregistré.');
        return null;
      }

      // 2. Diffusion de la notification push FCM
      const payload: admin.messaging.MulticastMessage = {
        tokens: Array.from(new Set(tokens)),
        notification: {
          title: '🚨 Allô Dabou : Nouvelle candidature chauffeur !',
          body: \`\${driverName} (\${vehicle}) vient de soumettre son dossier.\`,
        },
        data: {
          driverId: context.params.userId,
          url: '/',
          click_action: '/',
        },
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(\`Notification envoyée : \${response.successCount} succès / \${response.failureCount} échecs\`);
    }

    return null;
  });`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cloudFunctionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const isGranted = diagnostic?.permission === 'granted';
  const hasToken = !!diagnostic?.token;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-[#0D631B]">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">
                Notifications Push & Alertes Candidatures (FCM)
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isGranted && hasToken
                    ? 'bg-emerald-100 text-[#0D631B] border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isGranted && hasToken ? 'FCM Actif' : 'Configuration requise'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Alerte en temps réel les administrateurs dès qu'une inscription chauffeur est envoyée depuis l'app Chauffeur
            </p>
          </div>
        </div>

        <button
          onClick={refreshDiagnostic}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold text-xs border border-gray-200 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser l'état</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Grille de diagnostic technique */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Support Navigateur */}
        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
          <span className="text-gray-400 block mb-1 font-medium">Support Web Push</span>
          <div className="flex items-center gap-1.5">
            {diagnostic?.supported ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#0D631B]" />
                <span className="font-bold text-gray-900">Compatible FCM</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-gray-700">Non supporté</span>
              </>
            )}
          </div>
        </div>

        {/* Permission Système */}
        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
          <span className="text-gray-400 block mb-1 font-medium">Autorisation du navigateur</span>
          <div className="flex items-center gap-1.5">
            {isGranted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#0D631B]" />
                <span className="font-bold text-[#0D631B]">Autorisée</span>
              </>
            ) : diagnostic?.permission === 'denied' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-bold text-red-600">Bloquée (Modifier dans réglages)</span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-amber-700">En attente d'activation</span>
              </>
            )}
          </div>
        </div>

        {/* Jetons dans l'équipe */}
        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
          <span className="text-gray-400 block mb-1 font-medium">Appareils Équipe Enregistrés</span>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#0D631B]" />
            <span className="font-bold text-gray-900">{totalTeamTokens} appareil(s) synchronisé(s)</span>
          </div>
        </div>
      </div>

      {/* Jeton FCM de cet appareil */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#0D631B]" />
            <span>Jeton FCM (Device Registration Token)</span>
          </span>
          {diagnostic?.token && (
            <button
              onClick={() => setShowFullToken(!showFullToken)}
              className="text-[11px] font-semibold text-[#0D631B] hover:underline"
            >
              {showFullToken ? 'Masquer' : 'Afficher en entier'}
            </button>
          )}
        </div>

        {diagnostic?.token ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-white rounded-xl border border-gray-200 font-mono text-xs text-gray-700 break-all select-all">
              {showFullToken
                ? diagnostic.token
                : `${diagnostic.token.substring(0, 24)}...${diagnostic.token.substring(diagnostic.token.length - 12)}`}
            </div>
            <button
              onClick={handleCopyToken}
              className="p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors shrink-0"
              title="Copier le jeton FCM"
            >
              {copiedToken ? <Check className="w-4 h-4 text-[#0D631B]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Aucun jeton généré sur cet appareil. Cliquez sur le bouton vert ci-dessous pour activer les alertes push.
          </p>
        )}
      </div>

      {/* Boutons d'actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleEnableNotifications}
          disabled={!isOnline || requesting}
          className="flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
        >
          {requesting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          <span>{hasToken ? 'Réactualiser mon jeton FCM' : 'Activer les notifications push sur cet appareil'}</span>
        </button>

        <button
          onClick={handleTestNotification}
          className="flex items-center gap-2 min-h-[44px] px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors"
        >
          <Volume2 className="w-4 h-4 text-[#0D631B]" />
          <span>Tester l'alerte sonore et visuelle</span>
        </button>
      </div>

      {/* Accordéon : Architecture Backend & Cloud Functions */}
      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={() => setShowCloudFunctionGuide(!showCloudFunctionGuide)}
          className="w-full flex items-center justify-between text-left py-2 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#0D631B]" />
            <span>Comment fonctionne l'alerte automatique entre Chauffeur et Admin ?</span>
          </div>
          {showCloudFunctionGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCloudFunctionGuide && (
          <div className="mt-3 space-y-4 animate-scale-in">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-gray-700 space-y-2 leading-relaxed">
              <p>
                <strong>1. Écoute en direct (App ouverte) :</strong> Lorsque vous êtes sur Allô Dabou Admin, Firestore
                déclenche instantanément un carillon sonore Dabou, un toast vert et un badge rouge dès qu'un chauffeur soumet
                son formulaire.
              </p>
              <p>
                <strong>2. Notification push (Smartphone en veille / App fermée) :</strong> Le jeton FCM généré ci-dessus
                est automatiquement enregistré dans votre document <code>admins/{'{uid}'}.fcmTokens</code>. Une Cloud
                Function Firebase envoie alors le message push qui réveille l'écran du smartphone.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-300 rounded-t-2xl text-[11px] font-mono">
                <span>functions/src/index.ts (Cloud Function prête au déploiement)</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-sans"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copié !' : 'Copier le code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-gray-950 text-gray-200 rounded-b-2xl font-mono text-[11px] overflow-x-auto max-h-64 border border-t-0 border-gray-800">
                {cloudFunctionCode}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
