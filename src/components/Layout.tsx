import React from 'react';
import { Navigation, ActiveView } from './Navigation';
import { OfflineBanner } from './OfflineBanner';
import { ToastContainer } from './Toast';
import { useDrivers } from '../context/DriversContext';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onSelectDriverId?: (driverId: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  setActiveView,
  onSelectDriverId,
}) => {
  const { toasts, dismissToast } = useDrivers();

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-gray-900 flex flex-col antialiased">
      {/* Bandeau Hors Ligne persistant si connexion perdue */}
      <OfflineBanner />

      {/* Notifications Flottantes (Toasts avec son) */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onSelectDriver={onSelectDriverId}
      />

      {/* Navigation (Header desktop + mobile bottom bar) */}
      <Navigation activeView={activeView} setActiveView={setActiveView} />

      {/* Contenu principal avec marge adaptée pour mobile nav bar */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 mb-16 md:mb-6">
        {children}
      </main>
    </div>
  );
};
