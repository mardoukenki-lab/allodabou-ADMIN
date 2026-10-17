import { Timestamp } from 'firebase/firestore';

export type UserRole = 'client' | 'driver_pending' | 'driver' | 'admin';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type VehicleType = 'moto' | 'voiture';

export type CardType = 'provisional_qr' | 'standard';

export interface DriverChecklist {
  identity: boolean;            // Pièce d'identité (CNI / Passeport / Attestation)
  license: boolean;             // Permis de conduire
  vehicleRegistration: boolean; // Carte grise du véhicule
  insurance: boolean;           // Attestation d'assurance
  technicalInspection: boolean; // Visite technique à jour
  helmet: boolean;              // Casque conforme (sécurité Dabou)
  gpsTracker: boolean;          // Traceur GPS installé / actif
  vest: boolean;                // Gilet Allô Dabou
}

export interface UserProfile {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  isApprovedDriver: boolean;
  approved: boolean;
  vehicleType: VehicleType;
  vehicleNumber: string;
  photoUrl?: string;
  isOnline: boolean;
  lastSeenAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | null;
  updatedAt: Timestamp | { seconds: number; nanoseconds: number } | null;
  fcmTokens?: string[];

  // App Chauffeur registration fields
  driverCode?: string;          // GNG-XXXXXX
  hasLicense?: boolean;         // Indique si le chauffeur possède un permis

  // Admin validation fields
  applicationStatus?: ApplicationStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  adminNote?: string;
  checklist?: DriverChecklist;

  // Identification card fields
  cardType?: CardType;
  cardNumber?: string;
  cardValidFrom?: Timestamp | { seconds: number; nanoseconds: number } | null;
  cardValidUntil?: Timestamp | { seconds: number; nanoseconds: number } | null;
}

export type AdminAction = 'approve' | 'reject' | 'suspend' | 'reactivate' | 'note' | 'card_standard';

export interface AdminLog {
  id?: string;
  driverId: string;
  driverName: string;
  action: AdminAction;
  reason?: string;
  adminId: string;
  adminEmail: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | null;
}

export interface GnangoSettings {
  cardValidityMonths: number;   // Par défaut 3 mois
  licenseRequired: boolean;     // Par défaut false
  renewalAlertDays: number;     // Par défaut 15 jours
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  driverId?: string;
}

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'dispatch' | 'super_admin';
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | null;
  addedBy?: string;
  fcmTokens?: string[];
}
