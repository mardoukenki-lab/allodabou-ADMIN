import React, { useState } from 'react';
import { UserProfile, AdminAction } from '../types';
import { useDrivers } from '../context/DriversContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { formatFrenchDate } from '../utils/date';
import { Checklist } from './Checklist';
import { DecisionModal } from './DecisionModal';
import { DriverCardPreview } from './DriverCardPreview';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Shield,
  CreditCard,
  Car,
  Bike,
  Star,
  Clock,
  History,
  FileEdit,
  CheckCircle,
  XCircle,
  AlertOctagon,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Save,
  Radio,
} from 'lucide-react';

interface DriverDetailProps {
  driver: UserProfile;
  onBack: () => void;
}

export const DriverDetail: React.FC<DriverDetailProps> = ({ driver, onBack }) => {
  const isOnline = useOnlineStatus();
  const {
    approveDriver,
    rejectDriver,
    suspendDriver,
    reactivateDriver,
    updateChecklist,
    updateAdminNote,
    updateDriverLicenseStatus,
    settings,
    logs,
  } = useDrivers();
  const { isDispatch } = useAuth();

  // Modales
  const [modalAction, setModalAction] = useState<AdminAction | null>(null);
  const [showCardPreview, setShowCardPreview] = useState<boolean>(false);

  // Note interne
  const [noteText, setNoteText] = useState<string>(driver.adminNote || '');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<boolean>(false);

  // Permis présenté local
  const [hasLicense, setHasLicense] = useState<boolean>(driver.hasLicense ?? false);

  // Filtrer les logs pour ce chauffeur
  const driverLogs = logs.filter((l) => l.driverId === driver.id);

  const formatDate = (val: any) => formatFrenchDate(val, true);

  const cleanPhoneForWhatsApp = (raw: string) => {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = `225${cleaned}`;
    }
    return cleaned;
  };

  const handleSaveNote = async () => {
    if (!isOnline) return;
    setIsSavingNote(true);
    try {
      await updateAdminNote(driver.id, noteText);
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2500);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleToggleLicense = async (val: boolean) => {
    if (!isOnline) return;
    setHasLicense(val);
    await updateDriverLicenseStatus(driver.id, val);
  };

  const getWhatsAppMessage = () => {
    const code = driver.driverCode || 'AD';
    if (driver.applicationStatus === 'rejected') {
      return `Bonjour ${driver.displayName}, l'équipe Allô Dabou (+225 01 01 68 25 35) vous informe que votre candidature (code ${code}) a été refusée pour le motif : "${driver.rejectionReason}". Contactez-nous pour régulariser votre dossier.`;
    }
    if (driver.applicationStatus === 'suspended') {
      return `Bonjour ${driver.displayName}, votre compte chauffeur Allô Dabou (code ${code}) a été suspendu pour le motif suivant : "${driver.suspensionReason}". Merci de contacter le bureau Allô Dabou au +225 01 01 68 25 35.`;
    }
    if (driver.applicationStatus === 'approved') {
      return `Bonjour ${driver.displayName}, l'équipe Allô Dabou vous contacte concernant votre activité chauffeur (code ${code}).`;
    }
    return `Bonjour ${driver.displayName}, c'est l'équipe administrative Allô Dabou (+225 01 01 68 25 35). Concernant votre candidature chauffeur Dabou (code ${code})...`;
  };

  const waMessage = encodeURIComponent(getWhatsAppMessage());

  const isPending = driver.applicationStatus === 'pending';
  const isApproved = driver.applicationStatus === 'approved';
  const isRejected = driver.applicationStatus === 'rejected';
  const isSuspended = driver.applicationStatus === 'suspended';

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Bouton Retour & Titre */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#0D631B] px-3 py-2 rounded-2xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste</span>
        </button>

        <div className="flex items-center gap-2">
          {isApproved && (
            <button
              onClick={() => setShowCardPreview(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 text-[#0D631B] font-semibold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Voir la Carte Chauffeur</span>
            </button>
          )}
        </div>
      </div>

      {/* CARTE D'EN-TÊTE CHAUFFEUR */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {/* Photo */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-emerald-700 bg-emerald-50 flex items-center justify-center shadow-md">
              {driver.photoUrl ? (
                <img
                  src={driver.photoUrl}
                  alt={driver.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-800 font-extrabold text-2xl">
                  {driver.displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {/* Statut En ligne */}
            <div
              className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border-2 border-white flex items-center gap-1 ${
                driver.isOnline
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-400 text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${driver.isOnline ? 'bg-white animate-pulse' : 'bg-gray-200'}`} />
              <span>{driver.isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          </div>

          {/* Informations principales */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {driver.displayName}
              </h1>

              {/* Statut badge */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPending
                    ? 'bg-amber-100 text-amber-800'
                    : isApproved
                    ? 'bg-emerald-100 text-[#0D631B]'
                    : isRejected
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {isPending && 'En attente'}
                {isApproved && 'Approuvé'}
                {isRejected && 'Refusé'}
                {isSuspended && 'Suspendu'}
              </span>
            </div>

            {/* DRIVER CODE EN GRAND */}
            <div className="flex items-center gap-2 my-2">
              <span className="text-xs text-gray-500 font-medium">Code Chauffeur :</span>
              <span className="font-mono text-base font-extrabold text-[#0D631B] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 tracking-wider">
                {driver.driverCode || 'NON ATTRIBUÉ'}
              </span>
            </div>

            {/* Téléphone & Véhicule */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 mt-2 font-medium">
              <div className="flex items-center gap-1.5">
                {driver.vehicleType === 'moto' ? (
                  <Bike className="w-4 h-4 text-[#0D631B]" />
                ) : (
                  <Car className="w-4 h-4 text-[#0D631B]" />
                )}
                <span className="capitalize">{driver.vehicleType}</span>
                <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  {driver.vehicleNumber}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>
                  {driver.ratingAverage ? driver.ratingAverage.toFixed(1) : '5.0'}
                  {driver.ratingCount ? ` (${driver.ratingCount} courses)` : ' (Nouveau)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Inscrit le {formatDate(driver.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action rapides Contact (Appeler / WhatsApp) */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2.5">
          {driver.phone && (
            <>
              <a
                href={`tel:${driver.phone}`}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors"
              >
                <Phone className="w-4 h-4 text-[#0D631B]" />
                <span>Appeler ({driver.phone})</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhoneForWhatsApp(driver.phone)}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Écrire sur WhatsApp</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* RAISON DE REFUS OU SUSPENSION SI APPLICABLE */}
      {(driver.rejectionReason || driver.suspensionReason) && (
        <div
          className={`p-4 rounded-3xl border ${
            driver.rejectionReason
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <h4 className="font-bold text-sm">
                {driver.rejectionReason ? 'Motif du refus :' : 'Motif de la suspension :'}
              </h4>
              <p className="text-xs mt-1 leading-relaxed">
                {driver.rejectionReason || driver.suspensionReason}
              </p>
              {driver.reviewedAt && (
                <p className="text-[11px] text-gray-500 mt-2">
                  Décision prise le {formatDate(driver.reviewedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CASE PERMIS PRÉSENTÉ AVANT APPROBATION */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-2xl bg-emerald-50 text-[#0D631B] shrink-0 mt-0.5">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">
              Contrôle du Permis de Conduire
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {hasLicense
                ? 'Le chauffeur a présenté un permis valide → Carte standard permanente.'
                : `Pas de permis présenté → Carte provisoire QR (${settings.cardValidityMonths} mois max).`}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            disabled={!isOnline}
            checked={hasLicense}
            onChange={(e) => handleToggleLicense(e.target.checked)}
            className="w-5 h-5 rounded-lg text-[#0D631B] border-gray-300 focus:ring-[#0D631B]"
          />
          <span className="text-xs font-bold text-gray-900">Permis présenté</span>
        </label>
      </div>

      {/* CHECKLIST DE CONFORMITÉ */}
      <Checklist
        checklist={driver.checklist || {
          identity: false,
          license: false,
          vehicleRegistration: false,
          insurance: false,
          technicalInspection: false,
          helmet: false,
          gpsTracker: false,
          vest: false,
        }}
        onChange={(updated) => updateChecklist(driver.id, updated)}
      />

      {/* NOTE ADMINISTRATIVE INTERNE */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-[#0D631B]" />
            <span>Note interne pour ce chauffeur</span>
          </h3>
          <span className="text-xs text-gray-400">{noteText.length}/1000</span>
        </div>

        <textarea
          value={noteText}
          disabled={!isOnline}
          onChange={(e) => setNoteText(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="Remarques confidentielles de l’administration Allô Dabou (ex: rendez-vous physique, pièces à relancer)..."
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-emerald-700 font-medium">
            {noteSavedFeedback && '✓ Note interne enregistrée avec succès.'}
          </span>
          <button
            type="button"
            disabled={!isOnline || isSavingNote}
            onClick={handleSaveNote}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingNote ? 'Sauvegarde...' : 'Enregistrer la note'}</span>
          </button>
        </div>
      </div>

      {/* BARRE DE DÉCISION ADMINISTRATIVE */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-lg sticky bottom-4 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-900 text-sm">
              Décision administrative Allô Dabou
            </h4>
            <p className="text-xs text-gray-500">
              {!isOnline
                ? 'Mode hors-ligne : les actions sont verrouillées'
                : 'Mise à jour en temps réel synchronisée avec l’app Chauffeur'}
            </p>
          </div>

          {isDispatch ? (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3 max-w-md">
              <Shield className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-blue-950">Profil Dispatch (Consultation)</p>
                <p className="text-blue-800 text-[11px] mt-0.5 leading-relaxed">
                  Votre rôle permet la consultation et le contact terrain. Les décisions administratives officielles (approbation, refus, suspension) sont réservées aux Administrateurs.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Si En attente : Approuver OU Refuser */}
              {isPending && (
                <>
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => setModalAction('reject')}
                    className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-red-300 text-red-700 hover:bg-red-50 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Refuser le dossier</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => setModalAction('approve')}
                    className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approuver le chauffeur</span>
                  </button>
                </>
              )}

              {/* Si Approuvé : Suspendre */}
              {isApproved && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => setModalAction('suspend')}
                  className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Suspendre le compte</span>
                </button>
              )}

              {/* Si Refusé : Possibilité de Réexaminer / Approuver */}
              {isRejected && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => setModalAction('approve')}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Reconsidérer et Approuver</span>
                </button>
              )}

              {/* Si Suspendu : Réactiver */}
              {isSuspended && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => setModalAction('reactivate')}
                  className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Réactiver le chauffeur</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HISTORIQUE DES DÉCISIONS (ADMIN LOGS) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-[#0D631B]" />
          <span>Historique des décisions et modifications</span>
        </h3>

        {driverLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">
            Aucune action administrative enregistrée pour ce chauffeur pour l'instant.
          </p>
        ) : (
          <div className="space-y-3">
            {driverLogs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/70 text-xs flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {log.action === 'approve' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  {log.action === 'reject' && <XCircle className="w-4 h-4 text-red-600" />}
                  {log.action === 'suspend' && <AlertOctagon className="w-4 h-4 text-amber-600" />}
                  {log.action === 'reactivate' && <RefreshCw className="w-4 h-4 text-blue-600" />}
                  {log.action === 'card_standard' && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  {log.action === 'note' && <FileEdit className="w-4 h-4 text-gray-600" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                      {log.action === 'approve' && 'Approbation'}
                      {log.action === 'reject' && 'Refus'}
                      {log.action === 'suspend' && 'Suspension'}
                      {log.action === 'reactivate' && 'Réactivation'}
                      {log.action === 'card_standard' && 'Passage Carte Standard'}
                      {log.action === 'note' && 'Note administrative'}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(log.createdAt)}</span>
                  </div>
                  {log.reason && <p className="text-gray-700 mt-1 leading-relaxed">{log.reason}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Par : {log.adminEmail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALE DE DÉCISION */}
      {modalAction && (
        <DecisionModal
          isOpen={!!modalAction}
          onClose={() => setModalAction(null)}
          driver={driver}
          actionType={modalAction}
          onConfirmApprove={(license, note) => approveDriver(driver, license, note)}
          onConfirmReject={(reason) => rejectDriver(driver, reason)}
          onConfirmSuspend={(reason) => suspendDriver(driver, reason)}
          onConfirmReactivate={(license, note) => reactivateDriver(driver, license, note)}
          cardValidityMonths={settings.cardValidityMonths}
        />
      )}

      {/* APERÇU DE LA CARTE IMPRIMABLE */}
      {showCardPreview && (
        <DriverCardPreview
          driver={driver}
          onClose={() => setShowCardPreview(false)}
        />
      )}
    </div>
  );
};
