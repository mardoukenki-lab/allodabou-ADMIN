import React from 'react';
import { UserProfile } from '../types';
import {
  Car,
  Bike,
  Phone,
  MessageSquare,
  ChevronRight,
  Clock,
  Sparkles,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

import { toJsDate } from '../utils/date';

interface DriverCardProps {
  driver: UserProfile;
  onSelect: (driver: UserProfile) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver, onSelect }) => {
  // Détecte si le chauffeur est inscrit depuis moins de 24h
  const isNew = React.useMemo(() => {
    if (!driver.createdAt) return false;
    const createdDate = toJsDate(driver.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 && diffHours >= 0;
  }, [driver.createdAt]);

  const cleanPhoneForWhatsApp = (raw: string) => {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = `225${cleaned}`;
    }
    return cleaned;
  };

  const formatDate = (val: any) => {
    if (!val) return 'Date inconnue';
    const date = val?.toDate ? val.toDate() : new Date(val?.seconds ? val.seconds * 1000 : val);
    if (isNaN(date.getTime())) return 'Date inconnue';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isPending = driver.applicationStatus === 'pending';
  const isApproved = driver.applicationStatus === 'approved';
  const isRejected = driver.applicationStatus === 'rejected';
  const isSuspended = driver.applicationStatus === 'suspended';

  const waMessage = encodeURIComponent(
    `Bonjour ${driver.displayName}, c'est l'équipe Allô Dabou au sujet de votre inscription...`
  );

  return (
    <div
      onClick={() => onSelect(driver)}
      className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        {/* Top bar with Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status Badge */}
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isPending
                  ? 'bg-amber-100 text-amber-800'
                  : isApproved
                  ? 'bg-emerald-100 text-[#0D631B]'
                  : isRejected
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isPending && 'En attente'}
              {isApproved && 'Approuvé'}
              {isRejected && 'Refusé'}
              {isSuspended && 'Suspendu'}
            </span>

            {/* Nouveau badge (< 24h) */}
            {isNew && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Nouveau</span>
              </span>
            )}
          </div>

          {/* Driver Code */}
          <span className="font-mono text-xs font-black text-[#0D631B] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/80">
            {driver.driverCode || 'GNG-XXXXXX'}
          </span>
        </div>

        {/* Chauffeur info row */}
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-emerald-700/20 bg-emerald-50 flex items-center justify-center">
              {driver.photoUrl ? (
                <img
                  src={driver.photoUrl}
                  alt={driver.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-extrabold text-base text-emerald-800">
                  {driver.displayName.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {/* Online indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                driver.isOnline ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            />
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-900 truncate group-hover:text-[#0D631B] transition-colors">
              {driver.displayName}
            </h3>

            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span className="flex items-center gap-1">
                {driver.vehicleType === 'moto' ? (
                  <Bike className="w-3 h-3 text-[#0D631B]" />
                ) : (
                  <Car className="w-3 h-3 text-[#0D631B]" />
                )}
                <span className="capitalize">{driver.vehicleType}</span>
              </span>
              <span>•</span>
              <span className="font-mono text-gray-700 font-medium">
                {driver.vehicleNumber}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
              <Clock className="w-3 h-3" />
              <span>Inscrit le {formatDate(driver.createdAt)}</span>
            </div>
          </div>

          <div className="text-gray-300 group-hover:text-[#0D631B] transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Card Footer: Quick Actions */}
      <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
          {driver.hasLicense ? (
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Permis valide</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Sans permis (provisoire)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {driver.phone && (
            <>
              <a
                href={`tel:${driver.phone}`}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                title="Appeler"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://wa.me/${cleanPhoneForWhatsApp(driver.phone)}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                title="Message WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
