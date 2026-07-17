/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FastForward, Clock, Zap, ArrowRightLeft } from "lucide-react";

interface SimulatorPanelProps {
  isActive: boolean;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
  onTimeSkip: (minutes: number) => void;
  hourlyRate?: number;
}

export default function SimulatorPanel({
  isActive,
  speedMultiplier,
  onSetSpeed,
  onTimeSkip,
  hourlyRate = 0.10,
}: SimulatorPanelProps) {
  const speeds = [
    { value: 1, label: "1x (Tiempo Real)" },
    { value: 10, label: "10x" },
    { value: 60, label: "60x (1s = 1m)" },
    { value: 3600, label: "3600x (1s = 1h)" },
  ];

  const skips = [
    { minutes: 5, label: "+5m" },
    { minutes: 15, label: "+15m" },
    { minutes: 30, label: "+30m" },
    { minutes: 60, label: "+1h" },
    { minutes: 300, label: "+5h" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-full" id="simulator-panel-container">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 tracking-wider uppercase">Panel de Simulación</h2>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-800 font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
            Herramientas
          </span>
        </div>

        {/* Speed Multiplier Grid */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
            <FastForward className="w-3.5 h-3.5" />
            Velocidad del Tiempo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {speeds.map((speed) => (
              <button
                key={speed.value}
                id={`btn-speed-${speed.value}`}
                onClick={() => onSetSpeed(speed.value)}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all border ${
                  speedMultiplier === speed.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {speed.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fast Travel / Time Travel */}
        <div>
          <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            Saltar Tiempo (Adelantar)
          </p>
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {skips.map((skip) => (
              <button
                key={skip.minutes}
                id={`btn-skip-${skip.minutes}`}
                disabled={!isActive}
                onClick={() => onTimeSkip(skip.minutes)}
                className={`py-2 text-xs font-bold rounded-lg transition-all border text-center ${
                  isActive
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 cursor-pointer"
                    : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                }`}
              >
                {skip.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            {isActive
              ? "Suma minutos simulados de inmediato al parqueo actual para probar la deducción de saldo rápida."
              : "⚠️ Debes tener una sesión de parqueo activa para poder adelantar tiempo."}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-150 pt-4 mt-4">
        <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-500 flex items-start gap-1.5 leading-relaxed border border-slate-200/50">
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            La velocidad multiplica el paso de los milisegundos reales. A 3600x, un segundo en la vida real descuenta el equivalente a una hora de parqueo (${hourlyRate.toFixed(2)} USD).
          </span>
        </div>
      </div>
    </div>
  );
}
