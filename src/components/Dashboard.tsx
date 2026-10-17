import React from 'react';
import { UserProfile } from '../types';
import { useDrivers } from '../context/DriversContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  Clock,
  UserCheck,
  UserX,
  Ban,
  Radio,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Bike,
  Car,
  BellRing,
} from 'lucide-react';

import { toJsDate, formatFrenchDate } from '../utils/date';

interface DashboardProps {
  onNavigateToTab: (tab: 'pending' | 'approved' | 'rejected' | 'suspended' | 'renewals') => void;
  onSelectDriver: (driver: UserProfile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab, onSelectDriver }) => {
  const { drivers, loading, settings } = useDrivers();
  const isOnline = useOnlineStatus();

  // Statistiques en temps réel
  const stats = React.useMemo(() => {
    const pending = drivers.filter((d) => d.applicationStatus === 'pending');
    const approved = drivers.filter((d) => d.applicationStatus === 'approved');
    const rejected = drivers.filter((d) => d.applicationStatus === 'rejected');
    const suspended = drivers.filter((d) => d.applicationStatus === 'suspended');
    const onlineCount = drivers.filter((d) => d.isOnline).length;

    // Cartes provisoires à renouveler
    const now = new Date();
    const renewalAlertMillis = (settings.renewalAlertDays || 15) * 24 * 60 * 60 * 1000;
    const urgentRenewals = drivers.filter((d) => {
      if (d.cardType !== 'provisional_qr' || !d.cardValidUntil) return false;
      const expDate = toJsDate(d.cardValidUntil);
      return expDate.getTime() - now.getTime() <= renewalAlertMillis;
    });

    // 5 dernières candidatures
    const getMillis = (val: any) => {
      const t = toJsDate(val).getTime();
      return isNaN(t) ? 0 : t;
    };
    const latest5 = [...drivers]
      .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
      .slice(0, 5);

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      suspended: suspended.length,
      onlineCount,
      urgentRenewalsCount: urgentRenewals.length,
      latest5,
    };
  }, [drivers, settings.renewalAlertDays]);

  const formatDate = (val: any) => {
    if (!val) return 'Date inconnue';
    const date = val?.toDate ? val.toDate() : new Date(val?.seconds ? val.seconds * 1000 : val);
    if (isNaN(date.getTime())) return 'Date inconnue';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE BIENVENUE & STATUT EN DIRECT */}
      <div className="bg-gradient-to-br from-[#0D631B] to-[#083E11] rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-green-950/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
                Pôle Administratif Dabou
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isOnline ? 'Connecté en direct' : 'Hors ligne'}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tableau de bord Allô Dabou
            </h1>
            <p className="text-xs sm:text-sm text-green-100/90 mt-1 max-w-xl">
              Supervision en temps réel des chauffeurs partenaires de la commune de Dabou.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToTab('pending')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-[#0D631B] font-bold text-xs shadow-md hover:bg-green-50 active:scale-[0.98] transition-all"
            >
              <Clock className="w-4 h-4 text-[#0D631B]" />
              <span>Traiter les dossiers ({stats.pending})</span>
            </button>
          </div>
        </div>

        {/* Effet d'arrière-plan discret */}
        <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      </div>

      {/* COMPTEURS CLÉS (4 CARTES EN TEMPS RÉEL) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* En attente */}
        <div
          onClick={() => onNavigateToTab('pending')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/80 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Priorité
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-amber-700 transition-colors">
            {stats.pending}
          </div>
          <div className="text-xs font-semibold text-gray-600 mt-0.5">En attente de validation</div>
          <div className="mt-2 text-[11px] text-amber-800 font-medium flex items-center gap-1">
            <span>Examiner les dossiers</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Approuvés */}
        <div
          onClick={() => onNavigateToTab('approved')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-200/80 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0D631B] flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Actifs
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-[#0D631B] transition-colors">
            {stats.approved}
          </div>
          <div className="text-xs font-semibold text-gray-600 mt-0.5">Chauffeurs approuvés</div>
          <div className="mt-2 text-[11px] text-[#0D631B] font-medium flex items-center gap-1">
            <span>{stats.onlineCount} connectés en direct</span>
          </div>
        </div>

        {/* Refusés */}
        <div
          onClick={() => onNavigateToTab('rejected')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-red-200/80 hover:border-red-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
              <UserX className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
              Rejetés
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-red-700 transition-colors">
            {stats.rejected}
          </div>
          <div className="text-xs font-semibold text-gray-600 mt-0.5">Candidatures refusées</div>
          <div className="mt-2 text-[11px] text-red-700 font-medium flex items-center gap-1">
            <span>Voir les motifs</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Suspendus */}
        <div
          onClick={() => onNavigateToTab('suspended')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 hover:border-gray-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
              <Ban className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              Arrêt
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-gray-700 transition-colors">
            {stats.suspended}
          </div>
          <div className="text-xs font-semibold text-gray-600 mt-0.5">Comptes suspendus</div>
          <div className="mt-2 text-[11px] text-gray-600 font-medium flex items-center gap-1">
            <span>Dossiers bloqués</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ALERTE CARTES À RENOUVELER SI PRÉSENTES */}
      {stats.urgentRenewalsCount > 0 && (
        <div
          onClick={() => onNavigateToTab('renewals')}
          className="bg-amber-500 text-white rounded-3xl p-4 sm:p-5 shadow-lg shadow-amber-900/10 flex items-center justify-between gap-4 cursor-pointer hover:bg-amber-600 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/20 rounded-2xl shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                {stats.urgentRenewalsCount} carte(s) provisoire(s) expirée(s) ou en fin de validité !
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Chauffeurs ayant besoin de présenter leur permis ou de renouveler leur autorisation Dabou.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-2 rounded-2xl bg-white text-amber-900 font-bold text-xs shrink-0 shadow-xs">
            Gérer
          </span>
        </div>
      )}

      {/* 5 DERNIÈRES CANDIDATURES */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Dernières inscriptions enregistrées</h3>
            <p className="text-xs text-gray-500">Flux d'inscriptions depuis l’application Chauffeur</p>
          </div>
          <button
            onClick={() => onNavigateToTab('pending')}
            className="text-xs font-semibold text-[#0D631B] hover:underline flex items-center gap-1"
          >
            <span>Voir toutes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats.latest5.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">
            Aucun chauffeur enregistré pour l'instant.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.latest5.map((driver) => {
              const isPending = driver.applicationStatus === 'pending';
              const isApproved = driver.applicationStatus === 'approved';
              const isRejected = driver.applicationStatus === 'rejected';

              return (
                <div
                  key={driver.id}
                  onClick={() => onSelectDriver(driver)}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 px-2 rounded-2xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      {driver.photoUrl ? (
                        <img
                          src={driver.photoUrl}
                          alt={driver.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs font-bold text-emerald-800">
                          {driver.displayName.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-[#0D631B] truncate transition-colors">
                          {driver.displayName}
                        </span>
                        <span className="font-mono text-[10px] text-[#0D631B] bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                          {driver.driverCode || 'GNG-XXXXXX'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="capitalize">{driver.vehicleType}</span>
                        <span>•</span>
                        <span>{driver.vehicleNumber}</span>
                        <span>•</span>
                        <span>{formatDate(driver.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isApproved
                          ? 'bg-emerald-100 text-[#0D631B]'
                          : isRejected
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {isPending && 'En attente'}
                      {isApproved && 'Approuvé'}
                      {isRejected && 'Refusé'}
                      {driver.applicationStatus === 'suspended' && 'Suspendu'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0D631B] transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
