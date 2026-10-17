# Patch pour l'application « Allô Dabou Chauffeur »

Ce document contient l'ensemble des modifications à apporter dans le code source de l'application **Allô Dabou Chauffeur** afin d'assurer l'interopérabilité immédiate avec le back-office **Allô Dabou Admin**.

---

### 1. `src/types/index.ts`

Ajoutez les champs de statut administratif, de motif et d'immatriculation au type `UserProfile` :

```typescript
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  // Champs existants...
  displayName: string;
  email: string;
  phone: string;
  role: 'client' | 'driver_pending' | 'driver' | 'admin';
  isApprovedDriver: boolean;
  approved: boolean;
  vehicleType: 'moto' | 'voiture';
  vehicleNumber: string;
  photoUrl?: string;
  isOnline: boolean;
  
  // Nouveaux champs GNANGO & Admin Allô Dabou
  driverCode?: string;          // GNG-XXXXXX unique et définitif
  hasLicense?: boolean;         // Indique si le chauffeur a coché avoir un permis
  applicationStatus?: ApplicationStatus; // 'pending' | 'approved' | 'rejected' | 'suspended'
  rejectionReason?: string;     // Motif de refus renseigné par l'admin
  suspensionReason?: string;    // Motif de suspension renseigné par l'admin
  cardType?: 'provisional_qr' | 'standard';
  cardValidUntil?: any;
}
```

---

### 2. `src/context/AuthContext.tsx`

Dans la méthode `register()`, ajoutez la génération du `driverCode` avec tirage Crockford Base32, la vérification d'unicité sur `driverCodes/{code}`, et l'écriture groupée dans `writeBatch` :

```typescript
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

// Alphabet sans ambiguïté visuelle (sans 0, 1, I, O)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return `GNG-${result}`;
}

export const register = async (formData: {
  displayName: string;
  email: string;
  password: string;
  phone: string;
  vehicleType: 'moto' | 'voiture';
  vehicleNumber: string;
  hasLicense: boolean;
  photoUrl?: string;
}) => {
  // 1. Création compte Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
  const uid = cred.user.uid;

  // 2. Génération et réservation du driverCode (3 tentatives max en cas de collision)
  const MAX_ATTEMPTS = 3;
  let allocatedCode = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidateCode = generateRandomCode();
    const codeRef = doc(db, 'driverCodes', candidateCode);
    const codeSnap = await getDoc(codeRef);

    if (codeSnap.exists()) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error("Impossible de générer un code chauffeur unique. Veuillez réessayer.");
      }
      continue;
    }

    allocatedCode = candidateCode;

    // 3. Écriture atomique conjointe de driverCodes et users
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', uid);

    batch.set(codeRef, {
      uid: uid,
      createdAt: serverTimestamp(),
    });

    batch.set(userRef, {
      displayName: formData.displayName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      photoUrl: formData.photoUrl || '',
      hasLicense: Boolean(formData.hasLicense),
      driverCode: allocatedCode,
      role: 'driver_pending',
      applicationStatus: 'pending',
      isApprovedDriver: false,
      approved: false,
      isOnline: false,
      ratingAverage: 5.0,
      ratingCount: 0,
      totalRatingSum: 0,
      checklist: {
        identity: false,
        license: false,
        vehicleRegistration: false,
        insurance: false,
        technicalInspection: false,
        helmet: false,
        gpsTracker: false,
        vest: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    break;
  }

  return allocatedCode;
};
```

---

### 3. `src/App.tsx` (Gestion des statuts Refusé & Suspendu)

Actuellement, l'application Chauffeur redirige tout compte `role === 'driver_pending'` vers `PendingApprovalView`.
Mettez à jour le routage conditionnel pour afficher des écrans dédiés en cas de refus ou de suspension :

```tsx
// Dans App.tsx du Chauffeur :
if (userProfile?.role === 'driver_pending' || !userProfile?.isApprovedDriver) {
  // 1. Cas : Dossier Refusé
  if (userProfile?.applicationStatus === 'rejected') {
    return (
      <RejectedApplicationView
        reason={userProfile.rejectionReason}
        driverCode={userProfile.driverCode}
        contactPhone="+225 01 01 68 25 35"
      />
    );
  }

  // 2. Cas : Compte Suspendu
  if (userProfile?.applicationStatus === 'suspended') {
    return (
      <SuspendedAccountView
        reason={userProfile.suspensionReason}
        driverCode={userProfile.driverCode}
        contactPhone="+225 01 01 68 25 35"
      />
    );
  }

  // 3. Cas : En cours d'examen initial
  return <PendingApprovalView driverCode={userProfile?.driverCode} />;
}
```

---

### 4. Composant `src/components/PendingApprovalView.tsx`

Affichez le `driverCode` en grand format avec un bouton pour copier :

```tsx
export const PendingApprovalView: React.FC<{ driverCode?: string }> = ({ driverCode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (driverCode) {
      navigator.clipboard.writeText(driverCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold text-gray-900">Dossier en cours de validation</h1>
      <p className="text-xs text-gray-500 mt-1 max-w-sm">
        L'équipe Allô Dabou examine actuellement vos pièces justificatives.
      </p>

      {driverCode && (
        <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <span className="text-xs text-emerald-800 font-semibold block mb-1">
            Votre Code d'Immatriculation Chauffeur
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xl font-black text-[#0D631B] tracking-wider">
              {driverCode}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs font-bold px-2 py-1 bg-white border border-emerald-300 rounded-lg text-[#0D631B]"
            >
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        Une question ? Contactez le bureau de Dabou au{' '}
        <a href="tel:+2250101682535" className="font-bold text-[#0D631B] underline">
          +225 01 01 68 25 35
        </a>
      </div>
    </div>
  );
};
```

---

### 5. Composants `RejectedApplicationView` et `SuspendedAccountView`

```tsx
export const RejectedApplicationView = ({ reason, driverCode, contactPhone }: any) => (
  <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
      <XCircle className="w-8 h-8" />
    </div>
    <h1 className="text-xl font-bold text-gray-900">Candidature Non Retenue</h1>
    <p className="text-xs text-gray-500 mt-1">Code : {driverCode}</p>
    
    <div className="my-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-left max-w-sm w-full">
      <span className="font-bold text-xs text-red-900 block mb-1">Motif du refus :</span>
      <p className="text-xs text-red-800 leading-relaxed">{reason || 'Dossier incomplet ou non conforme.'}</p>
    </div>

    <a href={`tel:${contactPhone}`} className="px-5 py-3 rounded-2xl bg-[#0D631B] text-white text-xs font-bold">
      Contacter l'agence ({contactPhone})
    </a>
  </div>
);

export const SuspendedAccountView = ({ reason, driverCode, contactPhone }: any) => (
  <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
      <AlertOctagon className="w-8 h-8" />
    </div>
    <h1 className="text-xl font-bold text-gray-900">Compte Chauffeur Suspendu</h1>
    <p className="text-xs text-gray-500 mt-1">Code : {driverCode}</p>
    
    <div className="my-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left max-w-sm w-full">
      <span className="font-bold text-xs text-amber-900 block mb-1">Motif de la suspension :</span>
      <p className="text-xs text-amber-800 leading-relaxed">{reason || 'Régularisation administrative requise.'}</p>
    </div>

    <a href={`tel:${contactPhone}`} className="px-5 py-3 rounded-2xl bg-[#0D631B] text-white text-xs font-bold">
      Contacter le dispatch ({contactPhone})
    </a>
  </div>
);
```
