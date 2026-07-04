/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Wallet, Plus, Coins, Clock, AlertTriangle, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WalletCardProps {
  balance: number;
  onRecharge: (amount: number) => void;
  onResetBalance: () => void;
}

export default function WalletCard({ balance, onRecharge, onResetBalance }: WalletCardProps) {
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const presets = [1.0, 3.0, 5.0, 10.0];

  const handleQuickRecharge = (amount: number) => {
    onRecharge(amount);
    triggerNotification(`¡Se han cargado $${amount.toFixed(2)} correctamente!`);
  };

  const handleCustomRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (!isNaN(amount) && amount > 0) {
      if (amount > 100) {
        triggerNotification("El monto máximo por recarga es de $100.00");
        return;
      }
      onRecharge(amount);
      triggerNotification(`¡Se han cargado $${amount.toFixed(2)} correctamente!`);
      setCustomAmount("");
      setShowCustomInput(false);
    } else {
      triggerNotification("Por favor ingresa un monto válido mayor a $0");
    }
  };

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Calculate remaining parking time
  // Rate: $0.10 per hour
  const ratePerHour = 0.1;
  const totalHoursLeft = balance / ratePerHour;
  const days = Math.floor(totalHoursLeft / 24);
  const hours = Math.floor(totalHoursLeft % 24);
  const minutes = Math.floor((totalHoursLeft * 60) % 60);

  const formatRemainingTime = () => {
    if (balance <= 0) return "Sin saldo de parqueo";
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes}m`);
    return parts.join(" ");
  };

  const isLowBalance = balance > 0 && balance < 0.1; // less than 1 hour left

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-full relative overflow-hidden" id="wallet-card-container">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 tracking-wider uppercase">Mi Monedero Digital</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Tarifa: $0.10/h</span>
        </div>

        {/* Balance Display */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Disponible</p>
            {balance > 0 && (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                title="Reiniciar saldo a 0"
                id="btn-trigger-reset-balance"
              >
                <RotateCcw className="w-3 h-3" />
                Reiniciar
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-slate-900 tracking-tight font-sans" id="wallet-balance-display">
              ${balance.toFixed(4)}
            </span>
            <span className="text-xs text-slate-400 font-bold uppercase">USD</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {balance > 0 ? (
                <>
                  Equivale a: <strong className="text-slate-900 font-bold">{formatRemainingTime()}</strong> de parqueo continuo
                </>
              ) : (
                <span className="text-rose-500 font-bold">Recarga saldo para poder parquear</span>
              )}
            </span>
          </div>

          {/* Inline confirmation removed in favor of gorgeous backdrop overlay modal */}
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {isLowBalance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs mb-4 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">¡Saldo Bajo!</p>
                <p>Te queda menos de 1 hora de estacionamiento disponible. Recarga pronto para evitar pausas.</p>
              </div>
            </motion.div>
          )}

          {balance <= 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs mb-4 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sin Saldo</p>
                <p>Tu saldo está en $0.00. No se pueden iniciar nuevas sesiones de parqueo.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Presets and Custom Recharges */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Cargar Dinero Rápido</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {presets.map((amount) => (
              <button
                key={amount}
                id={`btn-recharge-${amount}`}
                onClick={() => handleQuickRecharge(amount)}
                className="py-3 sm:py-2.5 px-1 bg-white hover:bg-blue-50 active:bg-blue-600 active:text-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-0.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3 h-3 text-slate-400" />
                ${amount.toFixed(0)}
              </button>
            ))}
          </div>

          {!showCustomInput ? (
            <div className="space-y-2">
              <button
                id="btn-show-custom-recharge"
                onClick={() => setShowCustomInput(true)}
                className="w-full py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <Coins className="w-4 h-4 text-slate-500" />
                Cargar otro monto
              </button>
              
              <button
                id="btn-reset-balance-direct"
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-3 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                Poner saldo en $0.00
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <form onSubmit={handleCustomRecharge} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    placeholder="Monto"
                    id="custom-recharge-input"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-6 pr-3 py-3 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  id="btn-submit-custom-recharge"
                  className="px-4 py-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-100 cursor-pointer"
                >
                  Cargar
                </button>
                <button
                  type="button"
                  id="btn-cancel-custom-recharge"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomAmount("");
                  }}
                  className="px-2.5 py-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm font-medium rounded-lg transition-all cursor-pointer"
                >
                  X
                </button>
              </form>

              <button
                id="btn-reset-balance-direct"
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-3 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                Poner saldo en $0.00
              </button>
            </div>
          )}
        </div>
      </div>



      {/* Floating Recharge Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-4 left-4 right-4 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs text-center font-medium shadow-md border border-slate-800"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Backdrop Overlay Modal */}
      <AnimatePresence>
        {showConfirmReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="reset-modal-overlay">
            {/* Backdrop click to cancel */}
            <div className="absolute inset-0 bg-transparent" onClick={() => setShowConfirmReset(false)}></div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-150 z-10 overflow-hidden text-left"
              id="reset-modal-content"
            >
              {/* Decorative top colored warning accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
              
              <div className="flex items-start gap-4 mt-1">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    ¿Confirmar Reinicio de Saldo?
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    ¿Estás seguro de que realmente quieres poner tu saldo en <strong className="text-slate-900 font-bold">$0.00 USD</strong>?
                  </p>
                  <div className="text-xs text-rose-700 bg-rose-50/70 border border-rose-100 p-3 rounded-xl leading-relaxed mt-2">
                    <strong>¡Atención!</strong> Esta acción vaciará completamente el saldo del monedero y detendrá de inmediato cualquier sesión de parqueo activa.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  id="btn-modal-cancel-reset"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetBalance();
                    setShowConfirmReset(false);
                    triggerNotification("Saldo reiniciado a $0.00 USD");
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-200 cursor-pointer"
                  id="btn-modal-confirm-reset"
                >
                  Sí, poner en $0.00
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
