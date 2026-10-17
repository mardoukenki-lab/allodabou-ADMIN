import React from 'react';
import { DriverChecklist } from '../types';
import {
  IdCard,
  CreditCard,
  FileCheck2,
  ShieldCheck,
  Wrench,
  HardHat,
  Radio,
  Shirt,
  CheckCircle2,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ChecklistProps {
  checklist: DriverChecklist;
  onChange: (updated: DriverChecklist) => void;
}

interface ChecklistItemMeta {
  key: keyof DriverChecklist;
  label: string;
  description: string;
  icon: React.ElementType;
}

const CHECKLIST_ITEMS: ChecklistItemMeta[] = [
  {
    key: 'identity',
    label: 'Pièce d’identité officielle',
    description: 'CNI, Passeport ou Attestation d’identité en cours de validité',
    icon: IdCard,
  },
  {
    key: 'license',
    label: 'Permis de conduire',
    description: 'Permis catégorie A (moto) ou B (véhicule léger)',
    icon: CreditCard,
  },
  {
    key: 'vehicleRegistration',
    label: 'Carte grise du véhicule',
    description: 'Certificat d’immatriculation officiel et conforme',
    icon: FileCheck2,
  },
  {
    key: 'insurance',
    label: 'Attestation d’assurance valide',
    description: 'Couverture responsabilité civile transport de personnes',
    icon: ShieldCheck,
  },
  {
    key: 'technicalInspection',
    label: 'Visite technique à jour',
    description: 'Vignette SICTA ou contrôle technique en cours de validité',
    icon: Wrench,
  },
  {
    key: 'helmet',
    label: 'Casque réglementaire',
    description: 'Pour motos : casque homologué pour le conducteur et passager',
    icon: HardHat,
  },
  {
    key: 'gpsTracker',
    label: 'Traceur GPS / Smartphone',
    description: 'Positionnement géographique actif pour la répartition des courses',
    icon: Radio,
  },
  {
    key: 'vest',
    label: 'Gilet officiel Allô Dabou',
    description: 'Gilet haute visibilité floqué aux couleurs du réseau Allô Dabou',
    icon: Shirt,
  },
];

export const Checklist: React.FC<ChecklistProps> = ({ checklist, onChange }) => {
  const isOnline = useOnlineStatus();

  const handleToggle = (key: keyof DriverChecklist) => {
    if (!isOnline) return;
    const updated: DriverChecklist = {
      ...checklist,
      [key]: !checklist[key],
    };
    onChange(updated);
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
      {/* Header avec barre de progression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <span>Points de contrôle de conformité</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0D631B] font-semibold">
              {completedCount} / {totalCount} validés
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Vérification physique des pièces et matériels avant ou après validation
          </p>
        </div>

        <div className="w-full sm:w-36 bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressPercent === 100 ? 'bg-[#0D631B]' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Grille des items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = !!checklist[item.key];
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.key}
              disabled={!isOnline}
              onClick={() => handleToggle(item.key)}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                isChecked
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950'
                  : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 text-gray-700'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isChecked
                    ? 'bg-[#0D631B] text-white shadow-sm'
                    : 'border-2 border-gray-300 bg-white text-transparent'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-900">
                  <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
