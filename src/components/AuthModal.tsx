/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Check } from "lucide-react";
import { motion } from "motion/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  onAuthSuccess: (userId: string) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUserEmail,
  onAuthSuccess,
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setSuccess("¡Cuenta creada exitosamente! Cargando tus datos de parqueo...");
        setTimeout(() => {
          onAuthSuccess(userCredential.user.uid);
          onClose();
        }, 1500);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setSuccess("¡Sesión iniciada correctamente! Sincronizando...");
        setTimeout(() => {
          onAuthSuccess(userCredential.user.uid);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let localizedError = "Ocurrió un error al autenticar. Por favor intenta de nuevo.";
      if (err.code === "auth/invalid-credential") {
        localizedError = "Correo o contraseña incorrectos.";
      } else if (err.code === "auth/email-already-in-use") {
        localizedError = "Este correo electrónico ya está registrado.";
      } else if (err.code === "auth/weak-password") {
        localizedError = "La contraseña debe tener al menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        localizedError = "El formato de correo electrónico no es válido.";
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signOut(auth);
      setSuccess("Sesión cerrada.");
      setTimeout(() => {
        // We generate a new guest ID on logout
        const newGuestId = `user-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString(36)}`;
        localStorage.setItem("parking_userId", newGuestId);
        onAuthSuccess(newGuestId);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Error al cerrar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="auth-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        id="auth-modal-card"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            {currentUserEmail ? "Tu Cuenta en la Nube" : isSignUp ? "Crear una Cuenta" : "Acceder a tu Cuenta"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            id="auth-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentUserEmail ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-2">
                <User className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Sesión activa como:</p>
                <p className="text-white font-bold text-lg tracking-tight mt-0.5">{currentUserEmail}</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Tus datos de parqueo, saldo y registros históricos están guardados de manera segura en Firestore y se sincronizarán en cualquier dispositivo donde inicies sesión.
              </p>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  id="auth-keep-using-btn"
                >
                  Continuar usando
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-rose-500/25 disabled:opacity-50"
                  id="auth-logout-btn"
                >
                  {loading ? "Cerrando..." : "Cerrar Sesión"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Regístrate o inicia sesión para guardar tu saldo, parqueo activo e historial de forma permanente en la nube y acceder desde cualquier celular o computadora.
              </p>

              {/* Status messages */}
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2 animate-shake" id="auth-error-msg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start gap-2" id="auth-success-msg">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                    id="auth-email-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500/50 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                    id="auth-password-input"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 disabled:cursor-not-allowed"
                id="auth-submit-btn"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" /> Crear Cuenta gratis
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Iniciar Sesión
                  </>
                )}
              </button>

              {/* Toggle signup/signin */}
              <div className="text-center pt-3 border-t border-slate-800/50 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                  id="auth-toggle-mode-btn"
                >
                  {isSignUp
                    ? "¿Ya tienes una cuenta? Inicia Sesión"
                    : "¿No tienes una cuenta? Regístrate gratis"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
