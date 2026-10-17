import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldCheck, AlertTriangle, CheckCircle, Car, Bike, Calendar, ArrowLeft } from 'lucide-react';

interface DriverPublicInfo {
  displayName: string;
  driverCode: string;
  vehicleType: string;
  vehicleNumber: string;
  cardType: string;
  cardValidUntil: any;
  isApprovedDriver: boolean;
  applicationStatus?: string;
  photoUrl?: string;
}

export const PublicVerifier: React.FC<{ code: string }> = ({ code }) => {
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<DriverPublicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyDriver() {
      setLoading(true);
      setError(null);
      try {
        // Recherche dans users par driverCode
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('driverCode', '==', code.toUpperCase()));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const data = snap.docs[0].data();
          setDriver({
            displayName: data.displayName || 'Chauffeur',
            driverCode: data.driverCode || code,
            vehicleType: data.vehicleType || 'moto',
            vehicleNumber: data.vehicleNumber || 'Non renseigné',
            cardType: data.cardType || 'provisional_qr',
            cardValidUntil: data.cardValidUntil,
            isApprovedDriver: !!data.isApprovedDriver,
            applicationStatus: data.applicationStatus,
            photoUrl: data.photoUrl,
          });
        } else {
          // Tentative de résolution par driverCodes/{code}
          const codeRef = doc(db, 'driverCodes', code.toUpperCase());
          const codeSnap = await getDoc(codeRef);
          if (codeSnap.exists() && codeSnap.data()?.uid) {
            const userSnap = await getDoc(doc(db, 'users', codeSnap.data().uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              setDriver({
                displayName: uData.displayName || 'Chauffeur',
                driverCode: uData.driverCode || code,
                vehicleType: uData.vehicleType || 'moto',
                vehicleNumber: uData.vehicleNumber || 'Non renseigné',
                cardType: uData.cardType || 'provisional_qr',
                cardValidUntil: uData.cardValidUntil,
                isApprovedDriver: !!uData.isApprovedDriver,
                applicationStatus: uData.applicationStatus,
                photoUrl: uData.photoUrl,
              });
            } else {
              setError('Profil chauffeur introuvable.');
            }
          } else {
            setError('Ce code chauffeur n’existe pas dans le registre officiel Allô Dabou.');
          }
        }
      } catch (err) {
        console.error('Erreur vérification:', err);
        setError('Impossible de joindre le serveur de vérification.');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      verifyDriver();
    }
  }, [code]);

  const now = new Date();
  let isValid = false;
  let isExpired = false;
  let expDateStr = 'Non renseignée';

  if (driver) {
    if (driver.isApprovedDriver && driver.applicationStatus === 'approved') {
      if (driver.cardType === 'standard') {
        isValid = true;
        expDateStr = 'Permanente';
      } else if (driver.cardValidUntil) {
        const d = driver.cardValidUntil?.toDate
          ? driver.cardValidUntil.toDate()
          : new Date(
              driver.cardValidUntil?.seconds
                ? driver.cardValidUntil.seconds * 1000
                : driver.cardValidUntil
            );
        if (d.getTime() > now.getTime()) {
          isValid = true;
        } else {
          isExpired = true;
        }
        expDateStr = d.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      } else {
        isValid = true;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-gray-100 text-center">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0D631B] text-white flex items-center justify-center shadow-lg shadow-green-950/20 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            Contrôle Officiel Allô Dabou
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registre public des chauffeurs agréés • Dabou (Côte d'Ivoire)
          </p>
        </div>

        {loading ? (
          <div className="py-12">
            <div className="w-8 h-8 border-3 border-[#0D631B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500 font-medium">Vérification dans le registre...</p>
          </div>
        ) : error || !driver ? (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-900">
            <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <h3 className="font-bold text-sm">Chauffeur Non Reconnu</h3>
            <p className="text-xs mt-1 text-red-700">{error || 'Code invalide.'}</p>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {/* Statut Banner */}
            <div
              className={`p-4 rounded-2xl border text-center ${
                isValid
                  ? 'bg-emerald-50 border-emerald-300 text-[#0D631B]'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {isValid ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-black text-base uppercase">
                  {isValid ? 'CHAUFFEUR AGRÉÉ ET EN RÈGLE' : 'CARTE NON VALIDE OU EXPIRÉE'}
                </span>
              </div>
              <p className="text-xs">
                {isValid
                  ? 'Ce chauffeur est officiellement autorisé sur le réseau Allô Dabou.'
                  : 'Ce chauffeur n’est pas autorisé à transporter des clients actuellement.'}
              </p>
            </div>

            {/* Infos chauffeur */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Nom du chauffeur :</span>
                <span className="font-bold text-gray-900">{driver.displayName}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Code Unique :</span>
                <span className="font-mono font-black text-[#0D631B]">{driver.driverCode}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Véhicule :</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {driver.vehicleType} • {driver.vehicleNumber}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Validité de la carte :</span>
                <span className={`font-bold ${isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                  {expDateStr}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D631B] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Accès au portail d'administration</span>
          </a>
        </div>
      </div>
    </div>
  );
};
