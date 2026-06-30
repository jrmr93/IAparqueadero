/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { ParkingState, ParkingSession } from "./types";
import WalletCard from "./components/WalletCard";
import ParkingBay from "./components/ParkingBay";
import ParkingControls from "./components/ParkingControls";
import SimulatorPanel from "./components/SimulatorPanel";
import ParkingHistory from "./components/ParkingHistory";
import { Car, AlertTriangle, CheckCircle2, User, CloudLightning, CloudOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { saveParkingStateToDb, loadParkingStateFromDb } from "./lib/db";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import AuthModal from "./components/AuthModal";

const DEFAULT_STATE: ParkingState = {
  balance: 5.0, // Preload with $5.00 for immediate testing
  isActive: false,
  currentSessionId: null,
  history: [],
  totalDeposits: 5.0,
  totalSpent: 0,
  speedMultiplier: 1,
};

export default function App() {
  const [state, setState] = useState<ParkingState>(DEFAULT_STATE);
  const [showEmptyAlert, setShowEmptyAlert] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [dbSynced, setDbSynced] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const lastUpdatedRef = useRef<number | null>(null);

  // Monitor Firebase Auth state to set active profile ID (or guest ID)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setAuthEmail(user.email);
      } else {
        let guestId = localStorage.getItem("parking_userId");
        if (!guestId) {
          guestId = `user-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString(36)}`;
          localStorage.setItem("parking_userId", guestId);
        }
        setUserId(guestId);
        setAuthEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize/Load state from database whenever active userId changes
  useEffect(() => {
    if (!userId) return;

    const loadState = async () => {
      setDbSynced(false);
      let loadedState: ParkingState | null = null;
      try {
        const dbState = await loadParkingStateFromDb(userId);
        if (dbState) {
          loadedState = dbState;
          setDbSynced(true);
        }
      } catch (err) {
        console.error("Error loading state from Firestore:", err);
      }

      // Fallback to localStorage if Firestore load failed or was empty
      if (!loadedState) {
        const savedLocal = localStorage.getItem("parking_manager_state");
        if (savedLocal) {
          try {
            loadedState = JSON.parse(savedLocal);
          } catch (e) {
            console.error("Failed to parse local storage fallback", e);
          }
        }
      }

      const parsed = loadedState || DEFAULT_STATE;

      // Handle calculating elapsed time while app was inactive
      if (parsed.isActive && parsed.currentSessionId && parsed.lastSavedTime) {
        const elapsedRealMs = Date.now() - parsed.lastSavedTime;
        if (elapsedRealMs > 0) {
          const simDeltaMs = elapsedRealMs * parsed.speedMultiplier;
          const RATE_PER_MS = 0.10 / (3600 * 1000); // $0.10 per hour
          const offlineCost = simDeltaMs * RATE_PER_MS;

          if (offlineCost >= parsed.balance) {
            const finalAffordableMs = parsed.balance / RATE_PER_MS;
            const updatedHistory = parsed.history.map((s) => {
              if (s.id === parsed.currentSessionId) {
                return {
                  ...s,
                  endTime: s.startTime + s.elapsedTimeMs + finalAffordableMs,
                  elapsedTimeMs: s.elapsedTimeMs + finalAffordableMs,
                  cost: s.cost + parsed.balance,
                  isActive: false,
                };
              }
              return s;
            });

            const finalState = {
              ...parsed,
              balance: 0,
              isActive: false,
              currentSessionId: null,
              history: updatedHistory,
              totalSpent: parsed.totalSpent + parsed.balance,
            };
            setState(finalState);
            setShowEmptyAlert(true);
            saveParkingStateToDb(userId, finalState);
          } else {
            const updatedHistory = parsed.history.map((s) => {
              if (s.id === parsed.currentSessionId) {
                return {
                  ...s,
                  elapsedTimeMs: s.elapsedTimeMs + simDeltaMs,
                  cost: s.cost + offlineCost,
                };
              }
              return s;
            });

            const finalState = {
              ...parsed,
              balance: parsed.balance - offlineCost,
              history: updatedHistory,
              totalSpent: parsed.totalSpent + offlineCost,
            };
            setState(finalState);
            saveParkingStateToDb(userId, finalState);
          }
        } else {
          setState(parsed);
        }
      } else {
        setState(parsed);
      }
    };

    loadState();
  }, [userId]);

  // Centralized local state + Firestore save helper
  const updateAndSaveState = (newState: ParkingState) => {
    setState(newState);
    
    // Save to local storage for quick offline recovery
    const stateToSave = {
      ...newState,
      lastSavedTime: Date.now(),
    };
    localStorage.setItem("parking_manager_state", JSON.stringify(stateToSave));
    
    // Save to Firestore DB
    if (userId) {
      setIsSaving(true);
      saveParkingStateToDb(userId, newState)
        .then(() => {
          setDbSynced(true);
          setIsSaving(false);
        })
        .catch((err) => {
          console.error("Firestore save failed:", err);
          setIsSaving(false);
        });
    }
  };

  // Active Session ticking logic (every 100ms)
  useEffect(() => {
    if (!state.isActive || !state.currentSessionId) {
      lastUpdatedRef.current = null;
      return;
    }

    if (lastUpdatedRef.current === null) {
      lastUpdatedRef.current = Date.now();
    }

    const timerId = setInterval(() => {
      const now = Date.now();
      const lastTime = lastUpdatedRef.current ?? now;
      const realDeltaMs = now - lastTime;
      if (realDeltaMs <= 0) return;

      lastUpdatedRef.current = now;

      const simDeltaMs = realDeltaMs * state.speedMultiplier;
      const RATE_PER_MS = 0.10 / (3600 * 1000);
      const tickCost = simDeltaMs * RATE_PER_MS;

      setState((prev) => {
        if (!prev.isActive || !prev.currentSessionId) return prev;

        // Auto-cutoff if budget exhausted during this tick
        if (tickCost >= prev.balance) {
          const finalAffordableMs = prev.balance / RATE_PER_MS;
          const finalCost = prev.balance;

          const updatedHistory = prev.history.map((s) => {
            if (s.id === prev.currentSessionId) {
              return {
                ...s,
                endTime: s.startTime + s.elapsedTimeMs + finalAffordableMs,
                elapsedTimeMs: s.elapsedTimeMs + finalAffordableMs,
                cost: s.cost + finalCost,
                isActive: false,
              };
            }
            return s;
          });

          setShowEmptyAlert(true);

          const newState = {
            ...prev,
            balance: 0,
            isActive: false,
            currentSessionId: null,
            history: updatedHistory,
            totalSpent: prev.totalSpent + finalCost,
          };

          if (userId) {
            saveParkingStateToDb(userId, newState);
          }
          return newState;
        }

        const updatedHistory = prev.history.map((s) => {
          if (s.id === prev.currentSessionId) {
            return {
              ...s,
              elapsedTimeMs: s.elapsedTimeMs + simDeltaMs,
              cost: s.cost + tickCost,
            };
          }
          return s;
        });

        const newState = {
          ...prev,
          balance: Math.max(0, prev.balance - tickCost),
          history: updatedHistory,
          totalSpent: prev.totalSpent + tickCost,
        };

        // Cache state locally on tick for fast recovery
        const stateToSave = {
          ...newState,
          lastSavedTime: Date.now(),
        };
        localStorage.setItem("parking_manager_state", JSON.stringify(stateToSave));

        return newState;
      });
    }, 100);

    return () => clearInterval(timerId);
  }, [state.isActive, state.currentSessionId, state.speedMultiplier, userId]);

  // Actions
  const handleStart = () => {
    if (state.balance <= 0) return;
    const now = Date.now();
    const sessionId = `session-${now}`;
    const newSession: ParkingSession = {
      id: sessionId,
      startTime: now,
      endTime: null,
      elapsedTimeMs: 0,
      cost: 0,
      isActive: true,
    };

    lastUpdatedRef.current = now;
    const newState = {
      ...state,
      isActive: true,
      currentSessionId: sessionId,
      history: [newSession, ...state.history],
    };
    updateAndSaveState(newState);
  };

  const handlePause = () => {
    const now = Date.now();
    if (!state.currentSessionId) return;

    const updatedHistory = state.history.map((s) => {
      if (s.id === state.currentSessionId) {
        return {
          ...s,
          endTime: now,
          isActive: false,
        };
      }
      return s;
    });

    const newState = {
      ...state,
      isActive: false,
      currentSessionId: null,
      history: updatedHistory,
    };

    updateAndSaveState(newState);
    lastUpdatedRef.current = null;
  };

  const handleRecharge = (amount: number) => {
    const newState = {
      ...state,
      balance: state.balance + amount,
      totalDeposits: state.totalDeposits + amount,
    };
    updateAndSaveState(newState);
  };

  const handleResetBalance = () => {
    let updatedHistory = state.history;
    let isActive = state.isActive;
    let currentSessionId = state.currentSessionId;
    
    if (state.isActive && state.currentSessionId) {
      const now = Date.now();
      updatedHistory = state.history.map((s) => {
        if (s.id === state.currentSessionId) {
          return {
            ...s,
            endTime: now,
            isActive: false,
          };
        }
        return s;
      });
      isActive = false;
      currentSessionId = null;
      lastUpdatedRef.current = null;
    }

    const newState = {
      ...state,
      balance: 0,
      isActive,
      currentSessionId,
      history: updatedHistory,
    };
    updateAndSaveState(newState);
  };

  const handleSetSpeed = (speed: number) => {
    const newState = {
      ...state,
      speedMultiplier: speed,
    };
    updateAndSaveState(newState);
  };

  const handleTimeSkip = (minutes: number) => {
    const skipMs = minutes * 60 * 1000;
    const RATE_PER_MS = 0.10 / (3600 * 1000);
    const skipCost = skipMs * RATE_PER_MS;

    if (!state.isActive || !state.currentSessionId) return;

    let newState: ParkingState;

    if (skipCost >= state.balance) {
      const finalAffordableMs = state.balance / RATE_PER_MS;
      const finalCost = state.balance;

      const updatedHistory = state.history.map((s) => {
        if (s.id === state.currentSessionId) {
          return {
            ...s,
            endTime: s.startTime + s.elapsedTimeMs + finalAffordableMs,
            elapsedTimeMs: s.elapsedTimeMs + finalAffordableMs,
            cost: s.cost + finalCost,
            isActive: false,
          };
        }
        return s;
      });

      setShowEmptyAlert(true);

      newState = {
        ...state,
        balance: 0,
        isActive: false,
        currentSessionId: null,
        history: updatedHistory,
        totalSpent: state.totalSpent + finalCost,
      };
    } else {
      const updatedHistory = state.history.map((s) => {
        if (s.id === state.currentSessionId) {
          return {
            ...s,
            elapsedTimeMs: s.elapsedTimeMs + skipMs,
            cost: s.cost + skipCost,
          };
        }
        return s;
      });

      newState = {
        ...state,
        balance: state.balance - skipCost,
        history: updatedHistory,
        totalSpent: state.totalSpent + skipCost,
      };
    }

    updateAndSaveState(newState);
  };

  const handleClearHistory = () => {
    const newState = {
      balance: 5.0,
      isActive: false,
      currentSessionId: null,
      history: [],
      totalDeposits: 5.0,
      totalSpent: 0,
      speedMultiplier: 1,
    };
    updateAndSaveState(newState);
    localStorage.removeItem("parking_manager_state");
  };

  // Get current active session details
  const activeSession = state.history.find((s) => s.id === state.currentSessionId);
  const currentDuration = activeSession?.elapsedTimeMs ?? 0;
  const currentCost = activeSession?.cost ?? 0;

  // Format active session time
  const getFormattedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12 font-sans" id="app-root-container">
      {/* Navigation Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b-4 border-blue-600 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-bold text-xl text-white">
              P
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">
                ParkFlow <span className="text-blue-400">Pro</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Control de Parqueo Inteligente</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-end">
            {/* Cloud/Sync Profile control */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-950 text-white rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-sm text-left group"
              id="cloud-profile-pill"
              title={authEmail ? "Administrar cuenta" : "Iniciar sesión para sincronizar"}
            >
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-all">
                <User className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  {authEmail ? (
                    <span className="text-emerald-400 font-extrabold text-[9px] uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Sincronizado</span>
                  ) : (
                    <span className="text-amber-400 font-extrabold text-[9px] uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Local / Invitado</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                  {authEmail ? authEmail : "Guardar en la Nube"}
                </p>
              </div>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Base de Datos Nube</p>
              <p className="text-xs font-semibold flex items-center gap-1.5 justify-end">
                <span className={`w-2 h-2 ${dbSynced ? "bg-emerald-500 animate-pulse" : "bg-amber-500"} rounded-full`}></span> 
                {dbSynced ? "Firestore Conectado" : "Estableciendo conexión..."}
              </p>
              {userId && (
                <p className="text-[9px] text-slate-400 font-mono tracking-tighter">
                  ID: {userId.substring(0, 16)}...
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 mt-6 space-y-6">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column Left (Interactive Parking spot + Live Controls) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 lg:h-full">
            <div className="h-full">
              <ParkingBay
                isActive={state.isActive}
                formattedTime={getFormattedTime(currentDuration)}
                accumulatedCost={currentCost}
              />
            </div>
            <div className="h-full">
              <ParkingControls
                isActive={state.isActive}
                balance={state.balance}
                onStart={handleStart}
                onPause={handlePause}
                formattedTime={getFormattedTime(currentDuration)}
                currentCost={currentCost}
                startTime={activeSession?.startTime ?? null}
              />
            </div>
          </div>

          {/* Column Right (Digital Wallet + Simulation Panel) */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 lg:h-full">
            <div className="h-full">
              <WalletCard
                balance={state.balance}
                onRecharge={handleRecharge}
                onResetBalance={handleResetBalance}
                totalDeposits={state.totalDeposits}
              />
            </div>
            <div className="h-full">
              <SimulatorPanel
                isActive={state.isActive}
                speedMultiplier={state.speedMultiplier}
                onSetSpeed={handleSetSpeed}
                onTimeSkip={handleTimeSkip}
              />
            </div>
          </div>
        </div>

        {/* Parking History and Stats Logs */}
        <div className="w-full">
          <ParkingHistory
            history={state.history}
            totalDeposits={state.totalDeposits}
            totalSpent={state.totalSpent}
            onClearHistory={handleClearHistory}
          />
        </div>
      </main>

      {/* Footer Status Bar with Professional Polish Design elements */}
      <footer className="max-w-6xl mx-auto px-6 mt-12 bg-white border border-slate-200 rounded-xl py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-800 uppercase">Tarifa Actual:</span> $0.10 / Hora
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-800 uppercase">Saldo Estimado:</span> ${state.balance.toFixed(2)} USD
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
          Última actualización: {new Date().toLocaleTimeString("es-ES")}
        </div>
      </footer>

      {/* Out of Money Dialog/Alert Modal */}
      <AnimatePresence>
        {showEmptyAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="empty-balance-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">¡Saldo Agotado!</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Tu saldo de estacionamiento ha llegado a <strong>$0.00 USD</strong>.
                La sesión de parqueo activa se ha cerrado y guardado automáticamente. Por favor, realiza una recarga en tu monedero para poder parquear de nuevo.
              </p>
              <button
                id="btn-close-empty-modal"
                onClick={() => setShowEmptyAlert(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all"
              >
                Entendido, recargar saldo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cloud Authentication Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            currentUserEmail={authEmail}
            onAuthSuccess={(newUserId) => {
              setUserId(newUserId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
