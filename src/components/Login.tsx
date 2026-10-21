import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  LogIn,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, resetPassword, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Réinitialisation
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsResetting(true);
    setResetError(null);
    setResetMessage(null);
    try {
      await resetPassword(resetEmail);
      setResetMessage('Lien de réinitialisation envoyé à votre adresse email.');
      setTimeout(() => {
        setShowResetModal(false);
        setResetMessage(null);
      }, 3500);
    } catch (err: any) {
      setResetError(err.message || 'Impossible d’envoyer le lien de réinitialisation.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-[#F8FAF8] text-gray-900">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 sm:p-8">
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0D631B] text-white flex items-center justify-center shadow-lg shadow-green-950/20 mb-4">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Allô Dabou Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Portail d'administration et validation des chauffeurs
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Dabou, Côte d'Ivoire
            </div>
          </div>
        </div>

        {/* Global Error message */}
        {authError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Erreur d'accès</p>
              <p className="mt-0.5 text-xs text-red-700">{authError}</p>
            </div>
            <button
              onClick={clearError}
              className="text-xs text-red-600 hover:text-red-800 font-semibold"
            >
              ×
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Adresse e-mail administrateur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@allodabou.ci"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B] focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}
                className="text-xs font-semibold text-[#0D631B] hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B] focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-3.5 px-4 bg-[#0D631B] hover:bg-[#0a4d15] active:scale-[0.99] text-white font-semibold rounded-2xl shadow-lg shadow-green-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            L'accès à cette interface est strictement restreint au personnel habilité Allô Dabou.
          </p>
        </div>
      </div>

      {/* Modal Réinitialisation Mot de passe */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-[#0D631B]">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Réinitialisation du mot de passe</h3>
                <p className="text-xs text-gray-500">Un lien sécurisé vous sera transmis par email</p>
              </div>
            </div>

            {resetMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetMessage}</span>
              </div>
            )}

            {resetError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Votre e-mail administrateur
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@allodabou.ci"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D631B]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !resetEmail}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#0D631B] text-white font-semibold text-sm hover:bg-[#0a4d15] disabled:opacity-60 transition-colors"
                >
                  {isResetting ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
