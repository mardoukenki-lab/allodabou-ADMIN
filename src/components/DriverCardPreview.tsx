import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../types';
import { Printer, Shield, CheckCircle, Car, Bike, Calendar, X, Award } from 'lucide-react';
import { formatFrenchDate } from '../utils/date';

interface DriverCardPreviewProps {
  driver: UserProfile;
  onClose: () => void;
}

export const DriverCardPreview: React.FC<DriverCardPreviewProps> = ({ driver, onClose }) => {
  const isProvisional = driver.cardType === 'provisional_qr' || (!driver.hasLicense && driver.cardType !== 'standard');
  const code = driver.driverCode || driver.cardNumber || `GNG-${driver.id.substring(0, 6).toUpperCase()}`;

  // URL encodée dans le QR Code (Strictement aucune donnée personnelle !)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://allodabou.ci';
  const qrUrl = `${baseUrl}/verifier/${code}`;

  const validFromStr = formatFrenchDate(driver.cardValidFrom || driver.reviewedAt || new Date(), false);
  const validUntilStr = driver.cardValidUntil ? formatFrenchDate(driver.cardValidUntil, false) : 'Permanente';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 my-6">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between gap-4 mb-5 print:hidden">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Carte Professionnelle Chauffeur</h3>
            <p className="text-xs text-gray-500">Aperçu officiel et format d’impression</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0D631B] text-white font-semibold text-xs shadow-md hover:bg-[#0a4d15] transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CARD CONTAINER */}
        <div className="printable-driver-card w-full max-w-md mx-auto rounded-3xl overflow-hidden border-2 border-emerald-900 shadow-xl bg-white">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#0D631B] to-[#083E11] text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                <Shield className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h4 className="font-black text-sm tracking-wider uppercase text-white">ALLÔ DABOU</h4>
                <p className="text-[10px] text-emerald-200 uppercase font-semibold tracking-widest">
                  {isProvisional ? 'CARTE CHAUFFEUR PROVISOIRE' : 'CARTE CHAUFFEUR OFFICIELLE'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                DABOU (CI)
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="flex gap-4">
              {/* Photo */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-24 h-28 rounded-2xl overflow-hidden border-2 border-emerald-700 bg-emerald-50 shadow-inner flex items-center justify-center">
                  {driver.photoUrl ? (
                    <img
                      src={driver.photoUrl}
                      alt={driver.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-emerald-800">
                      <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-lg">
                        {driver.displayName.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    {code}
                  </span>
                </div>
              </div>

              {/* Driver Details */}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-extrabold text-gray-900 leading-tight uppercase truncate">
                  {driver.displayName}
                </h2>

                <div className="mt-2 space-y-1.5 text-xs text-gray-700">
                  <div className="flex items-center gap-1.5 font-medium">
                    {driver.vehicleType === 'moto' ? (
                      <Bike className="w-3.5 h-3.5 text-[#0D631B]" />
                    ) : (
                      <Car className="w-3.5 h-3.5 text-[#0D631B]" />
                    )}
                    <span className="capitalize">{driver.vehicleType}</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                      {driver.vehicleNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Délivrée : {validFromStr}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-gray-700">Validité :</span>
                    <span
                      className={`font-bold ${
                        isProvisional ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {isProvisional ? `Jusqu'au ${validUntilStr}` : 'Permanente'}
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-[#0D631B] text-[11px] font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Chauffeur Agrée</span>
                </div>
              </div>
            </div>

            {/* Bottom Section : QR Code or Standard Seal */}
            <div className="mt-4 pt-3.5 border-t border-gray-200/80 flex items-center justify-between">
              {isProvisional ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="p-1.5 bg-white border border-gray-200 rounded-xl shadow-xs shrink-0">
                    <QRCodeSVG
                      value={qrUrl}
                      size={64}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-[10px] text-gray-600 leading-tight">
                    <p className="font-bold text-gray-900">QR Code de Contrôle Public</p>
                    <p className="mt-0.5 text-gray-500">
                      Scannable par les clients & autorités de Dabou pour vérifier le statut actif du chauffeur.
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-emerald-800 truncate">
                      {qrUrl}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-gray-900">CARTE OFFICIELLE PERMANENTE</p>
                      <p className="text-[10px] text-gray-500">Permis de conduire vérifié • Titulaire Allô Dabou</p>
                    </div>
                  </div>
                  <div className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                    CI-DABOU
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Explanatory note */}
        <p className="text-center text-xs text-gray-400 mt-4 print:hidden">
          Conseil : Vous pouvez plastifier ce badge ou le remettre au chauffeur en format numérique.
        </p>
      </div>
    </div>
  );
};
