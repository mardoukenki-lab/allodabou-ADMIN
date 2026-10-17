import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDrivers } from '../context/DriversContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  History,
  Settings,
  ShieldCheck,
  Radio,
  Bell,
  Sparkles,
} from 'lucide-react';

import { toJsDate } from '../utils/date';

export type ActiveView = 'dashboard' | 'drivers' | 'renewals' | 'audit' | 'settings';

interface NavigationProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const { adminProfile } = useAuth();
  const { drivers, settings, newPendingCount, resetNewPendingCount } = useDrivers();
  const isOnline = useOnlineStatus();

  // Pending count for drivers tab badge
  const pendingCount = React.useMemo(() => {
    return drivers.filter((d) => d.applicationStatus === 'pending').length;
  }, [drivers]);

  // Urgent renewals count for renewals tab badge
  const urgentRenewalsCount = React.useMemo(() => {
    const now = new Date();
    const alertMillis = (settings.renewalAlertDays || 15) * 24 * 60 * 60 * 1000;
    return drivers.filter((d) => {
      if (d.cardType !== 'provisional_qr' || !d.cardValidUntil) return false;
      const expDate = toJsDate(d.cardValidUntil);
      return expDate.getTime() - now.getTime() <= alertMillis;
    }).length;
  }, [drivers, settings.renewalAlertDays]);

  const handleDriversClick = () => {
    resetNewPendingCount();
    setActiveView('drivers');
  };

  return (
    <>
      {/* HEADER SUPÉRIEUR (DESKTOP & MOBILE) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Titre */}
          <div
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#0D631B] text-white flex items-center justify-center shadow-md shadow-green-950/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">
                  Allô Dabou
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-[#0D631B]">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
                Validation & gestion des chauffeurs • Dabou
              </p>
            </div>
          </div>

          {/* Statut En direct / Profil */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isOnline
                  ? 'bg-emerald-50 text-[#0D631B] border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                }`}
              />
              <span className="hidden sm:inline">
                {isOnline ? 'Connecté en direct' : 'Mode hors-ligne'}
              </span>
            </div>

            {/* Admin Badge */}
            <button
              onClick={() => setActiveView('settings')}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
              title="Voir les paramètres"
            >
              <div
                className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center ${
                  adminProfile?.isSuperAdmin
                    ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-xs'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                {adminProfile?.isSuperAdmin ? '★' : adminProfile?.name?.substring(0, 1).toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-semibold text-gray-700 hidden md:inline truncate max-w-[130px]">
                {adminProfile?.isSuperAdmin ? 'Super Admin' : adminProfile?.name || 'Admin'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION PRINCIPALE (DESKTOP BAR / BOTTOM NAV MOBILE) */}
      {/* Desktop Navigation Tabs */}
      <nav className="hidden md:block bg-white border-b border-gray-100 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-2 py-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
              activeView === 'dashboard'
                ? 'bg-[#0D631B] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tableau de bord</span>
          </button>

          <button
            onClick={handleDriversClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all relative ${
              activeView === 'drivers'
                ? 'bg-[#0D631B] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidatures</span>
            {pendingCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeView === 'drivers' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pendingCount}
              </span>
            )}
            {newPendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveView('renewals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
              activeView === 'renewals'
                ? 'bg-[#0D631B] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cartes à renouveler</span>
            {urgentRenewalsCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeView === 'renewals' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
                }`}
              >
                {urgentRenewalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
              activeView === 'audit'
                ? 'bg-[#0D631B] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Journal d'audit</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
              activeView === 'settings'
                ? 'bg-[#0D631B] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Fixed) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-2 py-1.5 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-[10px] font-bold transition-colors ${
              activeView === 'dashboard' ? 'text-[#0D631B]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Accueil</span>
          </button>

          <button
            onClick={handleDriversClick}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-[10px] font-bold relative transition-colors ${
              activeView === 'drivers' ? 'text-[#0D631B]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Dossiers</span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('renewals')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-[10px] font-bold relative transition-colors ${
              activeView === 'renewals' ? 'text-[#0D631B]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <CreditCard className="w-5 h-5 mb-0.5" />
            <span>Cartes</span>
            {urgentRenewalsCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            onClick={() => setActiveView('audit')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-[10px] font-bold transition-colors ${
              activeView === 'audit' ? 'text-[#0D631B]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span>Audit</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-[10px] font-bold transition-colors ${
              activeView === 'settings' ? 'text-[#0D631B]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>Réglages</span>
          </button>
        </div>
      </nav>
    </>
  );
};
