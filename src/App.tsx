import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DriversProvider, useDrivers } from './context/DriversContext';
import { Layout } from './components/Layout';
import { ActiveView } from './components/Navigation';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { DriverList } from './components/DriverList';
import { DriverDetail } from './components/DriverDetail';
import { RenewalsList } from './components/RenewalsList';
import { AuditLog } from './components/AuditLog';
import { Settings } from './components/Settings';
import { PublicVerifier } from './components/PublicVerifier';
import { UserProfile, ApplicationStatus } from './types';
import { ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, adminProfile, loading: authLoading } = useAuth();
  const { drivers, loading: driversLoading } = useDrivers();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedDriver, setSelectedDriver] = useState<UserProfile | null>(null);
  const [driverListTab, setDriverListTab] = useState<ApplicationStatus | 'all'>('pending');

  // Synchronise selectedDriver si la liste des chauffeurs est mise à jour en temps réel
  useEffect(() => {
    if (selectedDriver) {
      const refreshed = drivers.find((d) => d.id === selectedDriver.id);
      if (refreshed) {
        setSelectedDriver(refreshed);
      }
    }
  }, [drivers, selectedDriver?.id]);

  // Écran de chargement initial
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAF8] p-4">
        <div className="w-16 h-16 rounded-3xl bg-[#0D631B] text-white flex items-center justify-center shadow-xl shadow-green-950/20 mb-4 animate-pulse">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Allô Dabou Admin</h2>
        <p className="text-xs text-gray-500 mt-1">Connexion sécurisée en cours...</p>
      </div>
    );
  }

  // Écran de connexion si non connecté en tant qu'admin
  if (!currentUser || !adminProfile) {
    return <Login />;
  }

  // Navigation depuis le Dashboard vers les onglets spécifiques
  const handleNavigateFromDashboard = (
    tab: 'pending' | 'approved' | 'rejected' | 'suspended' | 'renewals'
  ) => {
    setSelectedDriver(null);
    if (tab === 'renewals') {
      setActiveView('renewals');
    } else {
      setDriverListTab(tab);
      setActiveView('drivers');
    }
  };

  // Sélection d'un chauffeur par ID (utilisé par les Toasts de nouvelle candidature)
  const handleSelectDriverId = (driverId: string) => {
    const found = drivers.find((d) => d.id === driverId);
    if (found) {
      setSelectedDriver(found);
    }
  };

  return (
    <Layout
      activeView={activeView}
      setActiveView={(view) => {
        setSelectedDriver(null);
        setActiveView(view);
      }}
      onSelectDriverId={handleSelectDriverId}
    >
      {/* Si un chauffeur est sélectionné, afficher sa fiche détaillée */}
      {selectedDriver ? (
        <DriverDetail
          driver={selectedDriver}
          onBack={() => setSelectedDriver(null)}
        />
      ) : (
        <>
          {activeView === 'dashboard' && (
            <Dashboard
              onNavigateToTab={handleNavigateFromDashboard}
              onSelectDriver={(driver) => setSelectedDriver(driver)}
            />
          )}

          {activeView === 'drivers' && (
            <DriverList
              drivers={drivers}
              loading={driversLoading}
              initialTab={driverListTab}
              onSelectDriver={(driver) => setSelectedDriver(driver)}
            />
          )}

          {activeView === 'renewals' && (
            <RenewalsList
              onSelectDriver={(driver) => setSelectedDriver(driver)}
            />
          )}

          {activeView === 'audit' && <AuditLog />}

          {activeView === 'settings' && <Settings />}
        </>
      )}
    </Layout>
  );
};

export default function App() {
  // Détection du mode vérification publique via URL (/verifier/<driverCode>)
  const [verifierCode, setVerifierCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/verifier/')) {
        const code = path.replace('/verifier/', '').trim();
        if (code) {
          setVerifierCode(code);
        }
      }
    }
  }, []);

  if (verifierCode) {
    return <PublicVerifier code={verifierCode} />;
  }

  return (
    <AuthProvider>
      <DriversProvider>
        <AppContent />
      </DriversProvider>
    </AuthProvider>
  );
}
