import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AdminUser } from '../types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Lock,
  Mail,
  User,
  Radio,
  Share2,
} from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const {
    adminProfile,
    isSuperAdmin,
    adminUsers,
    adminUsersLoading,
    addAdminUser,
    removeAdminUser,
    maxAdminsLimit,
    resetPassword,
  } = useAuth();
  const isOnline = useOnlineStatus();

  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'dispatch'>('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success summary modal
  const [createdAdminData, setCreatedAdminData] = useState<{
    name: string;
    email: string;
    role: string;
    password: string;
  } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);

  // Revoke confirmation modal
  const [adminToRevoke, setAdminToRevoke] = useState<AdminUser | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Filtrer les comptes non super-admin pour compter les 5 places allouées
  const nonSuperAdmins = adminUsers.filter((a) => a.role !== 'super_admin');
  const slotsUsed = nonSuperAdmins.length;
  const remainingSlots = Math.max(0, maxAdminsLimit - slotsUsed);

  // Générateur de mot de passe fort
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(array[i] % chars.length);
    }
    setPassword(generated);
    setConfirmPassword(generated);
  };

  const handleOpenAddModal = () => {
    setName('');
    setEmail('');
    setRole('admin');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password.length < 8) {
      setFormError('Pour la sécurité de la plateforme, le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await addAdminUser(email, name, role, password);
      setCreatedAdminData({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role === 'admin' ? 'Administrateur' : 'Agent Dispatch',
        password: password,
      });
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Impossible de créer le compte administrateur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!adminToRevoke) return;
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await removeAdminUser(adminToRevoke.uid);
      setAdminToRevoke(null);
    } catch (err: any) {
      setRevokeError(err.message || 'Échec de la révocation de l’accès.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdAdminData) return;
    const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://allodabou.ci';
    const message = `*Accès Allô Dabou Admin*\n\nBonjour ${createdAdminData.name},\nVoici vos identifiants pour accéder à l'application d'administration Allô Dabou :\n\n- *Lien de l'app* : ${currentHost}\n- *Identifiant e-mail* : ${createdAdminData.email}\n- *Mot de passe* : ${createdAdminData.password}\n- *Rôle* : ${createdAdminData.role}\n\nConservez ces accès en lieu sûr.`;

    navigator.clipboard.writeText(message);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-[#0D631B]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Gestion de l'Équipe Administrative</h3>
              <p className="text-xs text-gray-500">
                Autorisez jusqu'à {maxAdminsLimit} administrateurs pour valider et superviser les chauffeurs Dabou
              </p>
            </div>
          </div>
        </div>

        {/* Compteur de places */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold flex items-center gap-2">
            <span className="text-gray-500">Places utilisées :</span>
            <span
              className={`font-black ${
                slotsUsed >= maxAdminsLimit ? 'text-amber-600' : 'text-[#0D631B]'
              }`}
            >
              {slotsUsed} / {maxAdminsLimit}
            </span>
          </div>

          {isSuperAdmin && (
            <button
              onClick={handleOpenAddModal}
              disabled={!isOnline || slotsUsed >= maxAdminsLimit}
              className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs shadow-md transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Ajouter un admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de progression des 5 slots */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
          <span>Capacité allouée au Super Admin ({maxAdminsLimit} comptes max)</span>
          <span className="font-semibold text-gray-700">
            {remainingSlots > 0 ? `${remainingSlots} place(s) disponible(s)` : 'Quota maximum atteint'}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
          {Array.from({ length: maxAdminsLimit }).map((_, index) => (
            <div
              key={index}
              className={`flex-1 border-r border-white/50 first:rounded-l-full last:rounded-r-full transition-all ${
                index < slotsUsed ? 'bg-[#0D631B]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Règle d'autorisation si non super-admin */}
      {!isSuperAdmin && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Vous êtes connecté en tant qu'administrateur. Seul le <strong>Super Administrateur</strong> (
            <code>mardoukeni@gmail.com</code>) est habilité à ajouter ou révoquer des membres d'équipe.
          </p>
        </div>
      )}

      {/* Liste des administrateurs */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Membres habilités ({adminUsers.length})
        </h4>

        {adminUsersLoading ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Chargement des administrateurs...</span>
          </div>
        ) : adminUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            Aucun administrateur enregistré dans Firestore.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adminUsers.map((admin) => {
              const isSuper = admin.role === 'super_admin' || admin.email === 'mardoukeni@gmail.com';
              const fcmCount = admin.fcmTokens ? admin.fcmTokens.length : 0;

              return (
                <div
                  key={admin.uid}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSuper
                      ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isSuper
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-emerald-100 text-[#0D631B]'
                          }`}
                        >
                          {isSuper ? '★' : admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-gray-900">{admin.name}</span>
                            {isSuper ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                SUPER ADMIN
                              </span>
                            ) : admin.role === 'dispatch' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                Dispatch
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0D631B]">
                                Administrateur
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 font-mono block mt-0.5">{admin.email}</span>
                        </div>
                      </div>

                      {/* Bouton de révocation réservé au Super Admin pour les comptes réguliers */}
                      {isSuperAdmin && !isSuper && (
                        <button
                          onClick={() => setAdminToRevoke(admin)}
                          title="Révoquer l'accès"
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {fcmCount > 0 ? (
                            <span className="text-emerald-700 font-semibold">
                              {fcmCount} appareil(s) push actif(s)
                            </span>
                          ) : (
                            'Pas d’appareil push'
                          )}
                        </span>
                      </div>

                      {admin.addedBy && (
                        <span className="truncate max-w-[140px]" title={`Ajouté par ${admin.addedBy}`}>
                          Par {admin.addedBy.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL AJOUT D'UN ADMINISTRATEUR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl animate-scale-in my-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-emerald-50 text-[#0D631B]">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ajouter un Administrateur</h3>
                <p className="text-xs text-gray-500">
                  Création d'un accès sécurisé ({slotsUsed + 1}e place sur {maxAdminsLimit})
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {/* Nom complet */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nom & Prénoms de l'administrateur
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom complet de l’administrateur"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                  />
                </div>
              </div>

              {/* Adresse e-mail */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Adresse e-mail professionnelle ou personnelle
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kouame.jean@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                  />
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Niveau d'habilitation
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === 'admin'
                        ? 'bg-emerald-50 border-[#0D631B] text-[#0D631B]'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="font-bold text-xs block">Administrateur</span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      Validation, suspension et cartes
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('dispatch')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === 'dispatch'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="font-bold text-xs block">Agent Dispatch</span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      Consultation et contact terrain
                    </span>
                  </button>
                </div>
              </div>

              {/* Mot de passe avec générateur */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mot de passe initial (min. 6 caractères)
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-[#0D631B] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Générer un mot de passe</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                  />
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                  />
                </div>
              </div>

              {/* Boutons actions */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#0D631B] text-white font-semibold text-sm hover:bg-[#0a4d15] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Créer le compte</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUCCÈS & TRANSMISSION IDENTIFIANTS */}
      {createdAdminData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#0D631B] flex items-center justify-center mb-4 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center">Compte Administrateur Activé !</h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              Transmettez ces identifiants à l'agent pour qu'il puisse se connecter immédiatement.
            </p>

            <div className="my-5 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Nom :</span>
                <span className="font-bold text-gray-900">{createdAdminData.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">E-mail :</span>
                <span className="font-mono font-bold text-gray-900">{createdAdminData.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Mot de passe :</span>
                <span className="font-mono font-bold text-[#0D631B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {createdAdminData.password}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Rôle :</span>
                <span className="font-bold text-gray-900">{createdAdminData.role}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await resetPassword(createdAdminData.email);
                    setInviteEmailSent(true);
                    setTimeout(() => setInviteEmailSent(false), 4000);
                  } catch (err: any) {
                    console.warn('[AdminManagement] Erreur reset email:', err);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-2xl border border-emerald-300 text-[#0D631B] hover:bg-emerald-50 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>
                  {inviteEmailSent
                    ? 'E-mail de réinitialisation/invitation envoyé !'
                    : 'Envoyer lien officiel de configuration par e-mail'}
                </span>
              </button>

              <button
                onClick={handleCopyCredentials}
                className="w-full py-3 px-4 rounded-2xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {copiedSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSuccess ? 'Message copié dans le presse-papiers !' : 'Copier pour WhatsApp / SMS'}</span>
              </button>

              <p className="text-[10px] text-gray-400 text-center">
                Recommandation sécurité : invitez l'administrateur à modifier son mot de passe dès sa première connexion.
              </p>

              <button
                onClick={() => setCreatedAdminData(null)}
                className="w-full py-2.5 px-4 rounded-2xl text-gray-500 hover:text-gray-800 font-semibold text-xs transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION RÉVOCATION */}
      {adminToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-gray-900 text-center">Révoquer cet administrateur ?</h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              L'accès sera immédiatement retiré pour <strong>{adminToRevoke.name}</strong> ({adminToRevoke.email}). Une
              place sur les 5 sera libérée.
            </p>

            {revokeError && (
              <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {revokeError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAdminToRevoke(null)}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-60"
              >
                {isRevoking ? 'Révocation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
