/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Square, LogIn, LogOut, ArrowRight, ShieldCheck, History } from "lucide-react";
import { motion } from "motion/react";

interface ParkingControlsProps {
  isActive: boolean;
  balance: number;
  onStart: () => void;
  onPause: () => void;
  formattedTime: string;
  currentCost: number;
  startTime: number | null;
}

export default function ParkingControls({
  isActive,
  balance,
  onStart,
  onPause,
  formattedTime,
  currentCost,
  startTime,
}: ParkingControlsProps) {
  
  const hasNoBalance = balance <= 0;

  // Format real clock time for the start timestamp
  const formatStartTime = (timestamp: number | null) => {
    if (!timestamp) return "--:--:--";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-full" id="parking-controls-container">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Play className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 tracking-wider uppercase">Acciones y Control</h2>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-sm font-bold uppercase tracking-tighter">Tarifa Fija</span>
        </div>

        {/* Informative Rate card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-5 text-xs text-slate-600 space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tarifa por hora:</span>
            <span className="font-bold text-slate-800">$0.10 USD / hora</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tarifa por minuto:</span>
            <span className="font-mono text-slate-700 font-bold">$0.00167 USD / min</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Pausa permitida:</span>
            <span className="text-blue-600 font-bold">Sí (Sin costos mientras está fuera)</span>
          </div>
        </div>

        {/* Current Active Session HUD */}
        {isActive && (
          <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-rose-700 font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                Sesión de Parqueo Activa
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">Entrada: {formatStartTime(startTime)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tiempo transcurrido</p>
                <p className="text-2xl font-black font-mono text-slate-800 tracking-tight" id="active-duration-display">
                  {formattedTime}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Costo acumulado</p>
                <p className="text-2xl font-black font-mono text-rose-600 tracking-tight" id="active-cost-display">
                  ${currentCost.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 mb-5 text-center text-slate-500 text-xs">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 uppercase tracking-wide">Vehículo fuera del estacionamiento</p>
            <p className="mt-1 text-slate-400 font-medium">No se están generando cobros. Registra una entrada para iniciar el cobro por tiempo.</p>
          </div>
        )}
      </div>

      {/* Main Buttons */}
      <div className="space-y-3">
        {!isActive ? (
          <button
            type="button"
            id="btn-start-parking"
            disabled={hasNoBalance}
            onClick={onStart}
            className={`w-full py-3.5 px-4 font-bold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
              hasNoBalance
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:shadow-blue-100 active:scale-[0.98] cursor-pointer"
            }`}
          >
            <LogIn className="w-5 h-5 shrink-0" />
            Registrar Entrada (Entrar al Parqueo)
          </button>
        ) : (
          <button
            type="button"
            id="btn-stop-parking"
            onClick={onPause}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-base rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Pausar / Registrar Salida (Salir)
          </button>
        )}

        {hasNoBalance && !isActive && (
          <p className="text-[11px] text-rose-600 text-center font-bold">
            ⚠️ Debes recargar tu saldo en "Mi Monedero" antes de poder parquear.
          </p>
        )}
      </div>
    </div>
  );
}
