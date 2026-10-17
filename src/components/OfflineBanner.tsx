import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-sm font-medium z-40 sticky top-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-full bg-amber-700/60 animate-pulse">
          <WifiOff className="w-4 h-4" />
        </div>
        <span>
          <strong>Mode Hors Ligne :</strong> Vous consultez le cache local. Les décisions (approbation, refus, etc.) sont temporairement désactivées.
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-700/80 px-2.5 py-1 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Lecture seule</span>
      </div>
    </div>
  );
};
