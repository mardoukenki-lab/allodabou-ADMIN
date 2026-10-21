import React, { useState } from 'react';
import { UserProfile, AdminAction } from '../types';
import {
  CheckCircle,
  XCircle,
  AlertOctagon,
  RefreshCw,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

import { useDrivers } from '../context/DriversContext';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: UserProfile | null;
  actionType: AdminAction;
  onConfirmApprove: (hasLicense: boolean, adminNote?: string) => Promise<void>;
  onConfirmReject: (reason: string) => Promise<void>;
  onConfirmSuspend: (reason: string) => Promise<void>;
  onConfirmReactivate: (hasLicense?: boolean, adminNote?: string) => Promise<void>;
  cardValidityMonths: number;
}

const PRESET_REASONS = {
  reject: [
    'Dossier incomplet : pièce d’identité illisible ou expirée.',
    'Véhicule non conforme aux normes Allô Dabou.',
    'Défaut d’assurance valide pour le transport de personnes.',
    'Non-présentation au contrôle de conformité à Dabou.',
  ],
  suspend: [
    'Plainte récurrente pour conduite dangereuse à Dabou.',
    'Non-respect de la charte de tarification Allô Dabou.',
    'Assurance ou visite technique arrivée à expiration.',
    'Carte d’identification provisoire expirée sans renouvellement.',
    'Inactivité prolongée ou indisponibilité répétée.',
  ],
};

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  driver,
  actionType,
  onConfirmApprove,
  onConfirmReject,
  onConfirmSuspend,
  onConfirmReactivate,
  cardValidityMonths,
}) => {
  const isOnline = useOnlineStatus();
  const { settings } = useDrivers();
  const [reason, setReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [hasLicense, setHasLicense] = useState<boolean>(driver?.hasLicense ?? false);
  const [confirmActiveRideOverride, setConfirmActiveRideOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRideInfo, setActiveRideInfo] = useState<{ id: string; status: string } | null>(null);

  // Synchronise l'état hasLicense et vérifie si une course active est en cours
  React.useEffect(() => {
    if (driver) {
      setHasLicense(driver.hasLicense ?? false);
      setReason('');
      setAdminNote('');
      setError(null);
      setActiveRideInfo(null);

      // Si suspension demandée, vérifier l'existence d'une course active
      if (actionType === 'suspend') {
        const checkActiveRides = async () => {
          try {
            const ridesRef = collection(db, 'rides');
            const q = query(
              ridesRef,
              where('driverId', '==', driver.id),
              where('status', 'in', ['accepted', 'arrived', 'in_progress'])
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const rDoc = snap.docs[0];
              setActiveRideInfo({
                id: rDoc.id,
                status: rDoc.data().status,
              });
            }
          } catch (err) {
            console.warn('[DecisionModal] Erreur vérification course active:', err);
          }
        };
        checkActiveRides();
      }
    }
  }, [driver, actionType]);

  if (!isOpen || !driver) return null;

  const isReject = actionType === 'reject';
  const isSuspend = actionType === 'suspend';
  const isApprove = actionType === 'approve';
  const isReactivate = actionType === 'reactivate';

  const handleConfirm = async () => {
    if (!isOnline) {
      setError('Impossible d’effectuer cette action en mode hors ligne.');
      return;
    }

    if ((isReject || isSuspend) && reason.trim().length < 10) {
      setError('Le motif est obligatoire et doit comporter au moins 10 caractères.');
      return;
    }

    if (isApprove && settings.licenseRequired && !hasLicense) {
      setError('Conformément aux paramètres d’Allô Dabou, le permis de conduire est obligatoire. Vous ne pouvez pas approuver sans permis.');
      return;
    }

    if (isSuspend && activeRideInfo && !confirmActiveRideOverride) {
      setError('Veuillez cocher la case de confirmation expresse pour suspendre le chauffeur avec course en cours.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isApprove) {
        await onConfirmApprove(hasLicense, adminNote);
      } else if (isReject) {
        await onConfirmReject(reason);
      } else if (isSuspend) {
        await onConfirmSuspend(reason);
      } else if (isReactivate) {
        await onConfirmReactivate(hasLicense, adminNote);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l’opération.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl animate-scale-in my-8 border border-gray-100">
        {/* Header de la modale */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className={`p-3.5 rounded-2xl shrink-0 ${
              isApprove
                ? 'bg-emerald-100 text-emerald-800'
                : isReject
                ? 'bg-red-100 text-red-800'
                : isSuspend
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {isApprove && <CheckCircle className="w-7 h-7" />}
            {isReject && <XCircle className="w-7 h-7" />}
            {isSuspend && <AlertOctagon className="w-7 h-7" />}
            {isReactivate && <RefreshCw className="w-7 h-7" />}
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 leading-snug">
              {isApprove && 'Approuver la candidature'}
              {isReject && 'Refuser la candidature'}
              {isSuspend && 'Suspendre le chauffeur'}
              {isReactivate && 'Réactiver le compte chauffeur'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Chauffeur : <strong className="text-gray-900">{driver.displayName}</strong>{' '}
              {driver.driverCode && (
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 ml-1">
                  {driver.driverCode}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* CONTENU SPÉCIFIQUE : APPROBATION / RÉACTIVATION */}
        {(isApprove || isReactivate) && (
          <div className="space-y-4 mb-5">
            {/* Case Permis présenté */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasLicense}
                  onChange={(e) => setHasLicense(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-lg text-[#0D631B] border-gray-300 focus:ring-[#0D631B]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">
                      Permis de conduire présenté et vérifié
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#0D631B]" />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cochez cette case si le chauffeur a présenté un permis de conduire valide.
                  </p>
                </div>
              </label>
            </div>

            {/* Alerte si le permis est configuré obligatoire */}
            {settings.licenseRequired && !hasLicense && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Règle stricte Dabou :</strong> Le permis de conduire est actuellement obligatoire dans les paramètres de la plateforme. Vous devez impérativement vérifier et cocher « Permis de conduire présenté » pour approuver ce chauffeur.
                </span>
              </div>
            )}

            {/* Carte d'identification qui sera délivrée */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#0D631B] shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <p className="font-bold">
                  {hasLicense ? 'Type de carte : Standard Permanente' : `Type de carte : Provisoire QR (${cardValidityMonths} mois)`}
                </p>
                <p className="mt-1 text-emerald-800 leading-relaxed">
                  {hasLicense
                    ? 'Le chauffeur recevra une carte d’identification standard sans limite d’expiration automatique.'
                    : `Le chauffeur sans permis recevra une carte temporaire avec QR Code de vérification, valable ${cardValidityMonths} mois. Une alerte de renouvellement sera déclenchée avant échéance.`}
                </p>
              </div>
            </div>

            {/* Note administrative optionnelle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Note interne pour le dossier (optionnel)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value.slice(0, 1000))}
                rows={2}
                placeholder="Ex : Documents originaux contrôlés en agence Dabou."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
              />
            </div>
          </div>
        )}

        {/* CONTENU SPÉCIFIQUE : REFUS / SUSPENSION (MOTIF OBLIGATOIRE) */}
        {(isReject || isSuspend) && (
          <div className="space-y-4 mb-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Motif de {isReject ? 'refus' : 'suspension'} <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {reason.length}/300 car. (min 10)
                </span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 300))}
                required
                rows={3}
                placeholder={
                  isReject
                    ? 'Expliquez pourquoi le dossier est rejeté (visible par le chauffeur)...'
                    : 'Précisez la raison de la mise hors-service...'
                }
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Raccourcis de motifs prédéfinis */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Suggestions rapides Dabou :</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(isReject ? PRESET_REASONS.reject : PRESET_REASONS.suspend).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-left text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {isSuspend && activeRideInfo && (
              <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1 text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Avertissement : Course active en cours</span>
                </div>
                <p className="leading-relaxed">
                  Ce chauffeur a actuellement une course en cours (statut : <strong className="uppercase">{activeRideInfo.status}</strong>, réf : <code className="bg-white px-1 py-0.5 rounded border">{activeRideInfo.id.substring(0, 8)}</code>).
                </p>
                <p className="mt-1 text-[11px] text-red-700">
                  La suspension prendra effet immédiatement pour les futures courses mais <strong>ne coupera pas la course actuelle</strong> afin de garantir la sécurité et la prise en charge du client Allô Dabou.
                </p>
                <label className="flex items-start gap-2.5 mt-2.5 pt-2 border-t border-red-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmActiveRideOverride}
                    onChange={(e) => setConfirmActiveRideOverride(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-[11px] font-bold text-red-900 select-none">
                    Je confirme la suspension immédiate du chauffeur malgré la course active en cours.
                  </span>
                </label>
              </div>
            )}

            {isSuspend && !activeRideInfo && (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ La suspension désactivera immédiatement la visibilité du chauffeur dans l'application Chauffeur et le passera hors ligne.
              </p>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isSubmitting ||
              !isOnline ||
              ((isReject || isSuspend) && reason.trim().length < 10) ||
              (isApprove && settings.licenseRequired && !hasLicense) ||
              (isSuspend && activeRideInfo !== null && !confirmActiveRideOverride)
            }
            className={`flex-1 min-h-[44px] py-3 px-4 rounded-2xl font-semibold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
              isApprove
                ? 'bg-[#0D631B] hover:bg-[#0a4d15]'
                : isReject
                ? 'bg-red-600 hover:bg-red-700'
                : isSuspend
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>
                {isApprove && 'Confirmer l’approbation'}
                {isReject && 'Confirmer le refus'}
                {isSuspend && 'Confirmer la suspension'}
                {isReactivate && 'Confirmer la réactivation'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
