import React, { useState, useMemo } from 'react';
import { useDrivers } from '../context/DriversContext';
import { AdminAction } from '../types';
import {
  History,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertOctagon,
  RefreshCw,
  ShieldCheck,
  FileEdit,
  Clock,
  User,
} from 'lucide-react';

export const AuditLog: React.FC = () => {
  const { logs, logsLoading } = useDrivers();
  const [actionFilter, setActionFilter] = useState<AdminAction | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatDate = (val: any) => {
    if (!val) return 'Date inconnue';
    const date = val?.toDate ? val.toDate() : new Date(val?.seconds ? val.seconds * 1000 : val);
    if (isNaN(date.getTime())) return 'Date inconnue';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const driverMatch = (log.driverName || '').toLowerCase().includes(q);
        const adminMatch = (log.adminEmail || '').toLowerCase().includes(q);
        const reasonMatch = (log.reason || '').toLowerCase().includes(q);
        if (!driverMatch && !adminMatch && !reasonMatch) {
          return false;
        }
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#0D631B]">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Journal d'Audit Administratif</h2>
          </div>
          <p className="text-xs text-gray-500">
            Historique inaltérable (append-only) de toutes les décisions prises sur la plateforme Allô Dabou.
          </p>
        </div>

        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {filteredLogs.length} entrée(s) trouvée(s)
        </span>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par chauffeur, motif ou e-mail admin..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
          />
        </div>

        {/* Filtre Action */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              actionFilter === 'all'
                ? 'bg-[#0D631B] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setActionFilter('approve')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              actionFilter === 'approve'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Approbations
          </button>
          <button
            onClick={() => setActionFilter('reject')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              actionFilter === 'reject'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            Refus
          </button>
          <button
            onClick={() => setActionFilter('suspend')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              actionFilter === 'suspend'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Suspensions
          </button>
          <button
            onClick={() => setActionFilter('card_standard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              actionFilter === 'card_standard'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Cartes Standard
          </button>
        </div>
      </div>

      {/* Liste des logs */}
      {logsLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100">
          <div className="w-8 h-8 border-3 border-[#0D631B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-medium">Chargement du journal d'audit...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 text-sm">Aucun événement trouvé</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Aucun log d'action administrative ne correspond à vos critères de recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, index) => {
            const isApprove = log.action === 'approve';
            const isReject = log.action === 'reject';
            const isSuspend = log.action === 'suspend';
            const isReactivate = log.action === 'reactivate';
            const isCardStandard = log.action === 'card_standard';

            return (
              <div
                key={log.id || index}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                      isApprove
                        ? 'bg-emerald-100 text-emerald-800'
                        : isReject
                        ? 'bg-red-100 text-red-800'
                        : isSuspend
                        ? 'bg-amber-100 text-amber-800'
                        : isCardStandard
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isApprove && <CheckCircle className="w-5 h-5" />}
                    {isReject && <XCircle className="w-5 h-5" />}
                    {isSuspend && <AlertOctagon className="w-5 h-5" />}
                    {isReactivate && <RefreshCw className="w-5 h-5" />}
                    {isCardStandard && <ShieldCheck className="w-5 h-5" />}
                    {log.action === 'note' && <FileEdit className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs uppercase tracking-wider text-gray-900">
                        {isApprove && 'APPROBATION'}
                        {isReject && 'REFUS'}
                        {isSuspend && 'SUSPENSION'}
                        {isReactivate && 'RÉACTIVATION'}
                        {isCardStandard && 'CARTE STANDARD DÉLIVRÉE'}
                        {log.action === 'note' && 'NOTE AJOUTÉE'}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="font-bold text-xs text-emerald-950">
                        {log.driverName}
                      </span>
                    </div>

                    {log.reason && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {log.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{log.adminEmail}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(log.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
