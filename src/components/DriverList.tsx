import React, { useState, useMemo } from 'react';
import { UserProfile, ApplicationStatus, VehicleType } from '../types';
import { DriverCard } from './DriverCard';
import {
  Search,
  Filter,
  Car,
  Bike,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  Ban,
  Users,
} from 'lucide-react';

interface DriverListProps {
  drivers: UserProfile[];
  loading: boolean;
  onSelectDriver: (driver: UserProfile) => void;
  initialTab?: ApplicationStatus | 'all';
}

export const DriverList: React.FC<DriverListProps> = ({
  drivers,
  loading,
  onSelectDriver,
  initialTab = 'pending',
}) => {
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Calcul des compteurs par statut
  const statusCounts = useMemo(() => {
    return {
      all: drivers.length,
      pending: drivers.filter((d) => d.applicationStatus === 'pending').length,
      approved: drivers.filter((d) => d.applicationStatus === 'approved').length,
      rejected: drivers.filter((d) => d.applicationStatus === 'rejected').length,
      suspended: drivers.filter((d) => d.applicationStatus === 'suspended').length,
    };
  }, [drivers]);

  // Filtrage et recherche complets
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      // Filtre statut
      if (activeTab !== 'all' && driver.applicationStatus !== activeTab) {
        return false;
      }

      // Filtre véhicule
      if (vehicleFilter !== 'all' && driver.vehicleType !== vehicleFilter) {
        return false;
      }

      // Filtre recherche (nom, téléphone, plaque, driverCode)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = driver.displayName.toLowerCase().includes(query);
        const phoneMatch = driver.phone.toLowerCase().includes(query);
        const plateMatch = (driver.vehicleNumber || '').toLowerCase().includes(query);
        const codeMatch = (driver.driverCode || '').toLowerCase().includes(query);
        if (!nameMatch && !phoneMatch && !plateMatch && !codeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [drivers, activeTab, vehicleFilter, searchQuery]);

  // Tri par date d'inscription
  const sortedDrivers = useMemo(() => {
    return [...filteredDrivers].sort((a, b) => {
      const getMillis = (val: any) => {
        if (!val) return 0;
        if (val.toMillis) return val.toMillis();
        if (val.seconds) return val.seconds * 1000;
        const d = new Date(val).getTime();
        return isNaN(d) ? 0 : d;
      };
      const timeA = getMillis(a.createdAt);
      const timeB = getMillis(b.createdAt);
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [filteredDrivers, sortOrder]);

  // Pagination (25 par page)
  const totalPages = Math.ceil(sortedDrivers.length / pageSize) || 1;
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDrivers.slice(start, start + pageSize);
  }, [sortedDrivers, currentPage, pageSize]);

  // Réinitialiser la page si les filtres changent
  const handleTabChange = (tab: ApplicationStatus | 'all') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleVehicleFilterChange = (type: VehicleType | 'all') => {
    setVehicleFilter(type);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* ONGLETS PAR STATUT */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleTabChange('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all ${
            activeTab === 'pending'
              ? 'bg-[#0D631B] text-white shadow-md shadow-green-950/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En attente</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {statusCounts.pending}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('approved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all ${
            activeTab === 'approved'
              ? 'bg-[#0D631B] text-white shadow-md shadow-green-950/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Approuvés</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {statusCounts.approved}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('rejected')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all ${
            activeTab === 'rejected'
              ? 'bg-[#0D631B] text-white shadow-md shadow-green-950/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Refusés</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
            }`}
          >
            {statusCounts.rejected}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('suspended')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all ${
            activeTab === 'suspended'
              ? 'bg-[#0D631B] text-white shadow-md shadow-green-950/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Suspendus</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'suspended' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {statusCounts.suspended}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all ${
            activeTab === 'all'
              ? 'bg-[#0D631B] text-white shadow-md shadow-green-950/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Tous</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {statusCounts.all}
          </span>
        </button>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Champ de recherche */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, téléphone, plaque ou code (GNG-XXXXXX)..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B] placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-400 hover:text-gray-600"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Filtres Véhicule & Tri */}
        <div className="flex items-center gap-2">
          {/* Véhicule toggle */}
          <div className="flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs">
            <button
              onClick={() => handleVehicleFilterChange('all')}
              className={`px-2.5 py-1.5 rounded-xl font-semibold transition-colors ${
                vehicleFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => handleVehicleFilterChange('moto')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold transition-colors ${
                vehicleFilter === 'moto' ? 'bg-white text-[#0D631B] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Moto</span>
            </button>
            <button
              onClick={() => handleVehicleFilterChange('voiture')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold transition-colors ${
                vehicleFilter === 'voiture' ? 'bg-white text-[#0D631B] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Voiture</span>
            </button>
          </div>

          {/* Tri par date */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-2xl border border-gray-200 transition-colors"
            title="Inverser le tri par date"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {sortOrder === 'desc' ? 'Plus récents' : 'Plus anciens'}
            </span>
          </button>
        </div>
      </div>

      {/* LISTE DES CHAUFFEURS */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100">
          <div className="w-8 h-8 border-3 border-[#0D631B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-medium">Chargement des dossiers chauffeurs...</p>
        </div>
      ) : paginatedDrivers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-gray-900 text-sm">Aucun chauffeur trouvé</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Aucun résultat pour la recherche « ${searchQuery} ». Vérifiez l'orthographe ou le code GNG.`
              : 'Aucun dossier ne correspond aux filtres sélectionnés dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedDrivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onSelect={onSelectDriver}
            />
          ))}
        </div>
      )}

      {/* PAGINATION (25 PAR PAGE) */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            Affichage de {(currentPage - 1) * pageSize + 1} à{' '}
            {Math.min(currentPage * pageSize, sortedDrivers.length)} sur {sortedDrivers.length} chauffeurs
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-gray-700 px-2">
              Page {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
