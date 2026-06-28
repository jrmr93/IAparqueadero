/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface ParkingBayProps {
  isActive: boolean;
  formattedTime: string;
  accumulatedCost: number;
}

export default function ParkingBay({ isActive, formattedTime, accumulatedCost }: ParkingBayProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-between h-full relative overflow-hidden" id="parking-bay-container">
      {/* Dynamic Header Label */}
      <div className="w-full flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700 tracking-wider uppercase">Estado de Estacionamiento</h2>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${
          isActive 
            ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse" 
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-rose-500" : "bg-green-500"}`}></span>
          {isActive ? "OCUPADO" : "DISPONIBLE"}
        </div>
      </div>

      {/* Virtual Interactive Parking Slot */}
      <div className="relative w-full aspect-video md:aspect-[4/3] max-w-[320px] bg-slate-50 border-2 border-slate-200 rounded-xl p-4 flex flex-col justify-between overflow-hidden shadow-xs">
        {/* Asphalt grid lines */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-200/40 to-slate-100/20 bg-[size:20px_20px] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] pointer-events-none"></div>

        {/* Diagonal Warning Lines for empty bay, or Parking Space markings */}
        <div className="absolute left-0 right-0 top-1/4 bottom-1/4 border-y-2 border-dashed border-slate-300 pointer-events-none"></div>

        {/* Left and Right Yellow Boundary Lines */}
        <div className="absolute left-2 top-0 bottom-0 w-1 bg-yellow-400 rounded-full"></div>
        <div className="absolute right-2 top-0 bottom-0 w-1 bg-yellow-400 rounded-full"></div>

        {/* Parking Bay Slot Indicator Text */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-mono font-bold tracking-wider uppercase">
          BAHÍA #05
        </div>

        {/* Car / Empty spot illustration */}
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {isActive ? (
            /* Ocupado - Car is Parked inside the bay */
            <motion.div
              initial={{ scale: 0.8, y: -80, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="flex flex-col items-center justify-center w-full"
            >
              {/* Dynamic Ticking HUD overlaying the car */}
              <div className="mb-2 bg-slate-900/95 text-white border border-slate-800 px-3 py-1.5 rounded-lg shadow-lg flex flex-col items-center min-w-[130px] z-10 backdrop-blur-xs">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold">Estacionado</span>
                <span className="text-sm font-bold font-mono tracking-widest text-blue-400" id="bay-timer">
                  {formattedTime}
                </span>
                <span className="text-[9px] text-slate-300 font-bold mt-0.5" id="bay-cost-accumulated">
                  Gasto: ${accumulatedCost.toFixed(4)}
                </span>
              </div>

              {/* Red SUV/Compact Car SVG */}
              <svg viewBox="0 0 160 100" className="w-40 h-auto drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shadow */}
                <ellipse cx="80" cy="85" rx="55" ry="10" fill="rgba(0,0,0,0.25)" />
                {/* Mirrors */}
                <rect x="18" y="32" width="10" height="8" rx="3" fill="#991b1b" />
                <rect x="132" y="32" width="10" height="8" rx="3" fill="#991b1b" />
                {/* Wheels */}
                <rect x="22" y="70" width="16" height="15" rx="4" fill="#1e293b" />
                <rect x="122" y="70" width="16" height="15" rx="4" fill="#1e293b" />
                {/* Main Body */}
                <rect x="25" y="28" width="110" height="48" rx="16" fill="#dc2626" />
                {/* Roof/Cabin */}
                <rect x="40" y="12" width="80" height="30" rx="12" fill="#991b1b" />
                <rect x="46" y="16" width="68" height="22" rx="8" fill="#cbd5e1" /> {/* Windshield */}
                <rect x="52" y="16" width="56" height="22" rx="4" fill="#0f172a" /> {/* Window inside */}
                {/* Headlights (shining) */}
                <circle cx="38" cy="45" r="7" fill="#fef08a" className="animate-pulse" />
                <circle cx="122" cy="45" r="7" fill="#fef08a" className="animate-pulse" />
                {/* Light Beams */}
                <path d="M 38 45 L 20 80 L 56 80 Z" fill="url(#lightBeam)" opacity="0.15" />
                <path d="M 122 45 L 104 80 L 140 80 Z" fill="url(#lightBeam)" opacity="0.15" />
                {/* Grille/Details */}
                <rect x="62" y="42" width="36" height="8" rx="2" fill="#1e293b" />
                <rect x="70" y="62" width="20" height="6" rx="1" fill="#e2e8f0" /> {/* License plate */}
                <text x="80" y="67" fontSize="5" fontFamily="monospace" fontWeight="bold" fill="#0f172a" textAnchor="middle">PRK-123</text>
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="lightBeam" x1="80" y1="45" x2="80" y2="80">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          ) : (
            /* Disponible - Empty Slot with caution stripes */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center p-4 w-full"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-bold text-slate-700 tracking-tight uppercase">Espacio Disponible</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Estaciona tu vehículo presionando el botón "Registrar Entrada".
              </p>

              {/* Faded car parked outside (leaving) */}
              <div className="absolute -bottom-8 opacity-15 pointer-events-none transition-all duration-1000 transform translate-x-12 scale-75">
                <svg viewBox="0 0 160 100" className="w-32 h-auto" fill="none">
                  <rect x="25" y="28" width="110" height="48" rx="16" fill="#64748b" />
                  <rect x="40" y="12" width="80" height="30" rx="12" fill="#475569" />
                </svg>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>El sistema descuenta automáticamente cada segundo en base a la tarifa</span>
      </div>
    </div>
  );
}
