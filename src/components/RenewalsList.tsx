import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useDrivers } from '../context/DriversContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

import { toJsDate } from '../utils/date';

interface RenewalsListProps {
  onSelectDriver: (driver: UserProfile) => void;
}

export const RenewalsList: React.FC<RenewalsListProps> = ({ onSelectDriver }) => {
  const { drivers, settings, upgradeToStandardCard } = useDrivers();
  const isOnline = useOnlineStatus();
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const now = new Date();
  const alertDays = settings.renewalAlertDays || 15;
  const alertMillis = alertDays * 24 * 60 * 60 * 1000;

  // Filtrage des chauffeurs avec carte provisoire nécessitant attention
  const renewals = React.useMemo(() => {
    return drivers
      .filter((d) => {
        if (d.cardType !== 'provisional_qr' || !d.cardValidUntil) return false;
        const expDate = toJsDate(d.cardValidUntil);
        const diffMillis = expDate.getTime() - now.getTime();
        // Inclut ceux déjà expirés OU expirant dans moins de alertDays
        return diffMillis <= alertMillis;
      })
      .map((driver) => {
        const expDate = toJsDate(driver.cardValidUntil);
        const diffMillis = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMillis / (1000 * 60 * 60 * 24));
        const isExpired = diffMillis <= 0;

        return {
          driver,
          expDate,
          diffDays,
          isExpired,
        };
      })
      .sort((a, b) => a.expDate.getTime() - b.expDate.getTime());
  }, [drivers, alertMillis]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const cleanPhoneForWhatsApp = (raw: string) => {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = `225${cleaned}`;
    }
    return cleaned;
  };

  const handleUpgrade = async (driver: UserProfile) => {
    if (!isOnline) return;
    const confirm = window.confirm(
      `Confirmez-vous que ${driver.displayName} a présenté son permis de conduire physique à Dabou ? Sa carte deviendra officielle et permanente.`
    );
    if (!confirm) return;

    setUpgradingId(driver.id);
    try {
      await upgradeToStandardCard(driver);
      setSuccessMessage(`La carte de ${driver.displayName} est désormais convertie en carte officielle permanente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Erreur : ${err.message || 'Impossible de mettre à jour le statut'}`);
    } finally {
      setUpgradingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Cartes Provisoires & Renouvellements
            </h2>
          </div>
          <p className="text-xs text-gray-500 max-w-2xl">
            Suivi des chauffeurs autorisés sans permis initial (carte provisoire QR valide {settings.cardValidityMonths} mois).
            Le seuil d’alerte est fixé à <strong>{alertDays} jours</strong> avant expiration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200">
            {renewals.length} dossier(s) à relancer
          </span>
        </div>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Liste des cartes à renouveler */}
      {renewals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-gray-900 text-sm">Toutes les cartes sont à jour</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Aucun chauffeur provisoire n'a de carte expirée ou en fin de validité pour les {alertDays} prochains jours.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {renewals.map(({ driver, expDate, diffDays, isExpired }) => {
            const waMessage = encodeURIComponent(
              `Bonjour ${driver.displayName}, votre carte provisoire Allô Dabou (${driver.driverCode}) ${
                isExpired ? 'a expiré' : `expire dans ${diffDays} jour(s)`
              }. Merci de vous présenter à l'agence pour régulariser votre dossier ou présenter votre permis de conduire.`
            );

            return (
              <div
                key={driver.id}
                className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs hover:border-amber-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Infos Chauffeur */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-50 border border-emerald-100 shrink-0 flex items-center justify-center">
                    {driver.photoUrl ? (
                      <img
                        src={driver.photoUrl}
                        alt={driver.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-bold text-emerald-800 text-base">
                        {driver.displayName.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => onSelectDriver(driver)}
                        className="font-bold text-sm text-gray-900 hover:text-[#0D631B] cursor-pointer"
                      >
                        {driver.displayName}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#0D631B] bg-emerald-50 px-2 py-0.5 rounded">
                        {driver.driverCode || 'GNG-XXXXXX'}
                      </span>

                      {/* Badge Statut validité */}
                      {isExpired ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Expirée depuis {Math.abs(diffDays)} j</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Expire dans {diffDays} j</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="capitalize">{driver.vehicleType} : {driver.vehicleNumber}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Date limite : {formatDate(expDate)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions directes */}
                <div className="flex flex-wrap items-center gap-2">
                  {driver.phone && (
                    <>
                      <a
                        href={`tel:${driver.phone}`}
                        className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        title="Appeler"
                      >
                        <Phone className="w-4 h-4 text-[#0D631B]" />
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhoneForWhatsApp(driver.phone)}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                        title="Envoyer rappel WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </>
                  )}

                  {/* Bouton Permis présenté -> carte standard */}
                  <button
                    type="button"
                    disabled={!isOnline || upgradingId === driver.id}
                    onClick={() => handleUpgrade(driver)}
                    className="min-h-[44px] px-4 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs rounded-2xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {upgradingId === driver.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>Permis présenté → Carte standard</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
