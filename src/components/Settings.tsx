import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDrivers } from '../context/DriversContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AdminManagement } from './AdminManagement';
import { FCMConfigCard } from './FCMConfigCard';
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  Download,
  Bell,
  LogOut,
  Save,
  CheckCircle2,
  Smartphone,
  Shield,
  Users,
} from 'lucide-react';

type SettingsTab = 'admins' | 'notifications' | 'rules' | 'pwa';

export const Settings: React.FC = () => {
  const { adminProfile, logout, isSuperAdmin, isDispatch, adminUsers, maxAdminsLimit } = useAuth();
  const { settings, updateSettings, syncApprovedDriversToPublic } = useDrivers();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<SettingsTab>('admins');

  // État local des paramètres Dabou (settings/gnango)
  const [cardValidityMonths, setCardValidityMonths] = useState<number>(settings.cardValidityMonths || 3);
  const [licenseRequired, setLicenseRequired] = useState<boolean>(settings.licenseRequired || false);
  const [renewalAlertDays, setRenewalAlertDays] = useState<number>(settings.renewalAlertDays || 15);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncingPublic, setIsSyncingPublic] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings({
        cardValidityMonths: Number(cardValidityMonths),
        licenseRequired: Boolean(licenseRequired),
        renewalAlertDays: Number(renewalAlertDays),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Erreur de sauvegarde : ${err.message || 'Échec de la mise à jour'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const nonSuperCount = adminUsers.filter((a) => a.role !== 'super_admin').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* En-tête Général */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-[#0D631B]">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Paramètres & Administration</h2>
            <p className="text-xs text-gray-500">
              Gestion de l'équipe (5 admins), alertes push FCM et règles Dabou
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* Profil Administrateur Actif */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm ${
              isSuperAdmin ? 'bg-amber-500 text-white shadow-xs' : 'bg-emerald-700 text-white'
            }`}
          >
            {isSuperAdmin ? '★' : adminProfile?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">{adminProfile?.name}</span>
              {isSuperAdmin ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  SUPER ADMIN
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0D631B]">
                  Admin
                </span>
              )}
            </div>
            <span className="text-gray-500 font-mono text-[11px]">{adminProfile?.email}</span>
          </div>
        </div>

        <div className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
          UID : <span className="font-mono text-gray-700">{adminProfile?.uid?.substring(0, 10)}...</span>
        </div>
      </div>

      {/* Onglets de configuration */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'admins'
              ? 'bg-[#0D631B] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Équipe Admins (5 max)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'admins' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {nonSuperCount}/{maxAdminsLimit}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-[#0D631B] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications Push (FCM)</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'rules'
              ? 'bg-[#0D631B] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Règles & Validité (gnango)</span>
        </button>

        <button
          onClick={() => setActiveTab('pwa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'pwa'
              ? 'bg-[#0D631B] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Installation PWA</span>
        </button>
      </div>

      {/* CONTENU SELON ONGLET SÉLECTIONNÉ */}

      {/* 1. GESTION DES ADMINISTRATEURS (5 MAX PAR LE SUPER ADMIN) */}
      {activeTab === 'admins' && <AdminManagement />}

      {/* 2. NOTIFICATIONS PUSH FIREBASE CLOUD MESSAGING */}
      {activeTab === 'notifications' && <FCMConfigCard />}

      {/* 3. RÈGLES DE VALIDATION DABOU (settings/gnango) */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0D631B]" />
              <span>Règles d'Attribution & Validité des Cartes</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ces paramètres sont enregistrés dans <code>settings/gnango</code> et s'appliquent à tous les administrateurs.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Paramètres enregistrés avec succès dans Firestore !</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Durée de validité carte provisoire */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Validité Carte Provisoire (Mois)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  disabled={!isOnline}
                  value={cardValidityMonths}
                  onChange={(e) => setCardValidityMonths(parseInt(e.target.value) || 3)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Délai alloué au chauffeur sans permis pour régulariser son dossier (par défaut : 3 mois).
                </p>
              </div>

              {/* Seuil d'alerte renouvellement */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Alerte de renouvellement (Jours avant)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  disabled={!isOnline}
                  value={renewalAlertDays}
                  onChange={(e) => setRenewalAlertDays(parseInt(e.target.value) || 15)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Nombre de jours avant échéance pour afficher l'alerte dans "Cartes à renouveler" (par défaut : 15 jours).
                </p>
              </div>
            </div>

            {/* Permis obligatoire toggle */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isOnline}
                  checked={licenseRequired}
                  onChange={(e) => setLicenseRequired(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-lg text-[#0D631B] border-gray-300 focus:ring-[#0D631B]"
                />
                <div>
                  <span className="font-bold text-xs text-gray-900 block">
                    Exiger obligatoirement le permis de conduire à l'approbation
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5 block">
                    Si activé, l'approbation sans permis sera bloquée et aucune carte provisoire ne sera délivrée.
                  </span>
                </div>
              </label>
            </div>

            {isDispatch ? (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Accès lecture seule :</strong> La modification des règles de la plateforme Allô Dabou est réservée aux Administrateurs et Super Admin.
                </span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!isOnline || isSaving}
                className="min-h-[44px] px-6 py-3 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</span>
              </button>
            )}
          </form>

          {/* Registre public des chauffeurs (H1 Fix) */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                  Registre Public des Cartes QR (Vérification sans compte)
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Synchronise tous les chauffeurs approuvés vers la collection publique pour consultation instantanée par les forces de l’ordre et clients.
                </p>
              </div>

              {!isDispatch && (
                <button
                  type="button"
                  disabled={!isOnline || isSyncingPublic}
                  onClick={async () => {
                    setIsSyncingPublic(true);
                    try {
                      const count = await syncApprovedDriversToPublic();
                      setSyncCount(count);
                      setTimeout(() => setSyncCount(null), 4000);
                    } catch (err: any) {
                      alert(`Erreur de synchronisation : ${err.message}`);
                    } finally {
                      setIsSyncingPublic(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-2xl border border-emerald-300 text-[#0D631B] hover:bg-emerald-50 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSyncingPublic
                      ? 'Synchronisation...'
                      : syncCount !== null
                      ? `${syncCount} chauffeurs synchronisés !`
                      : 'Synchroniser le Registre Public'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. INSTALLATION PWA */}
      {activeTab === 'pwa' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-[#0D631B]" />
            <span>Application Mobile PWA (Allô Dabou Admin)</span>
          </h3>
          <p className="text-xs text-gray-500">
            Installez cette application sur votre écran d'accueil Android, iPhone ou ordinateur pour un accès instantané en
            plein écran et sans barre d'adresse.
          </p>

          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>L’application est déjà installée sur cet appareil en mode autonome.</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Installer l'application sur cet appareil</span>
            </button>
          ) : isIOS ? (
            <div>
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>Instructions d'installation sur iPhone / iPad</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Pour installer l'application, ouvrez le menu de votre navigateur (Chrome/Edge/Safari) puis choisissez «
              Ajouter à l'écran d'accueil » ou « Installer Allô Dabou Admin ».
            </p>
          )}

          {/* Modal guide iOS */}
          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
                <h4 className="text-base font-bold text-gray-900 mb-2">Installer sur iOS (Safari)</h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  1. Appuyez sur le bouton <strong>Partager</strong> <span className="text-base">⎋</span> en bas de Safari.
                  <br />
                  2. Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong>.<br />
                  3. Touchez <strong>Ajouter</strong> en haut à droite.
                </p>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-2.5 rounded-2xl bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200"
                >
                  Compris
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
