/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ParkingSession } from "../types";
import { History, Trash2, Calendar, Clock, DollarSign, RefreshCw } from "lucide-react";

interface ParkingHistoryProps {
  history: ParkingSession[];
  totalDeposits: number;
  totalSpent: number;
  onClearHistory: () => void;
}

export default function ParkingHistory({
  history,
  totalDeposits,
  totalSpent,
  onClearHistory,
}: ParkingHistoryProps) {
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  
  // Format milliseconds to readable string (HH:MM:SS or MM:SS)
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");

    if (hours > 0) {
      return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${pad(seconds)}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "--:--";
    const d = new Date(timestamp);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="parking-history-container">
      {/* Header and Clear action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-700 tracking-wider uppercase">Historial y Estadísticas</h2>
            <p className="text-xs text-slate-400 font-medium">Resumen de tus ingresos y egresos del parqueo</p>
          </div>
        </div>

        {history.length > 0 && (
          showConfirmReset ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-2 rounded-lg text-xs" id="confirm-reset-history-wrapper">
              <span className="text-rose-700 font-bold uppercase tracking-wider text-[10px]">¿Reiniciar todo?</span>
              <button
                id="btn-confirm-history-reset"
                onClick={() => {
                  onClearHistory();
                  setShowConfirmReset(false);
                }}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] uppercase cursor-pointer"
              >
                Sí, reiniciar
              </button>
              <button
                id="btn-cancel-history-reset"
                onClick={() => setShowConfirmReset(false)}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] uppercase cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              id="btn-clear-history"
              onClick={() => setShowConfirmReset(true)}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold transition-colors self-start sm:self-auto cursor-pointer border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reiniciar Aplicación
            </button>
          )
        )}
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Cargado</p>
            <p className="text-lg font-black text-slate-800 font-sans">${totalDeposits.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Gastado</p>
            <p className="text-lg font-black text-slate-800 font-sans">${totalSpent.toFixed(4)}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Sesiones de Parqueo</p>
            <p className="text-lg font-black text-slate-800 font-sans">{history.length}</p>
          </div>
        </div>
      </div>

      {/* Table & List Section */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {history.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-600">No hay sesiones de parqueo registradas</p>
            <p className="text-xs text-slate-400 mt-1">
              Tus entradas y salidas se guardarán automáticamente aquí para que lleves un control del dinero gastado.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <table className="hidden sm:table w-full text-left border-collapse text-xs" id="history-table">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">#</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Entrada</th>
                  <th className="p-3">Salida</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3 text-right pr-4">Costo Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {history.map((session, index) => {
                  const isCurrent = session.isActive;
                  return (
                    <tr
                      key={session.id}
                      id={`history-row-${session.id}`}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isCurrent ? "bg-rose-50/30 font-semibold text-rose-950" : ""
                      }`}
                    >
                      <td className="p-3 pl-4 font-mono text-slate-400">
                        {history.length - index}
                      </td>
                      <td className="p-3 text-slate-600 font-bold">
                        {formatDate(session.startTime)}
                      </td>
                      <td className="p-3 font-mono">{formatTime(session.startTime)}</td>
                      <td className="p-3 font-mono">
                        {session.isActive ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-sm font-bold text-[10px] uppercase tracking-wide animate-pulse">
                            Estacionado
                          </span>
                        ) : (
                          formatTime(session.endTime)
                        )}
                      </td>
                      <td className="p-3 font-mono">{formatDuration(session.elapsedTimeMs)}</td>
                      <td className="p-3 text-right pr-4 font-bold font-mono text-slate-900">
                        ${session.cost.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View Card List */}
            <div className="block sm:hidden divide-y divide-slate-100 bg-white" id="history-mobile-list">
              {history.map((session, index) => {
                const isCurrent = session.isActive;
                return (
                  <div
                    key={session.id}
                    id={`history-card-${session.id}`}
                    className={`p-4 flex flex-col gap-3 transition-colors ${
                      isCurrent ? "bg-rose-50/40 border-l-4 border-rose-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                        Sesión #{history.length - index}
                      </span>
                      <span className={`font-mono font-bold text-sm ${isCurrent ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
                        ${session.cost.toFixed(4)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Fecha</p>
                        <p className="text-slate-700 font-semibold mt-0.5">{formatDate(session.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Duración</p>
                        <p className="text-slate-700 font-mono font-bold mt-0.5">{formatDuration(session.elapsedTimeMs)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2.5 border-t border-dashed border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Hora Entrada</p>
                        <p className="text-slate-600 font-mono mt-0.5">{formatTime(session.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Hora Salida</p>
                        <div className="mt-0.5">
                          {session.isActive ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide animate-pulse">
                              Estacionado
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">{formatTime(session.endTime)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
