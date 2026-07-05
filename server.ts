/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Habilitar CORS para permitir peticiones desde cualquier origen (local u otros servidores)
  app.use(cors());
  app.use(express.json());

  // Cargar Configuración de Firebase con soporte tolerante a fallos
  let dbFirebase: any = null;
  const configPaths = [
    path.join(process.cwd(), "firebase-applet-config.json"),
    path.join(__dirname, "firebase-applet-config.json"),
    path.resolve(process.cwd(), "firebase-applet-config.json"),
    "/firebase-applet-config.json"
  ];
  
  let configPath = "";
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }
  
  if (configPath) {
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const appFirebase = initializeApp(firebaseConfig);
      dbFirebase = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);
      console.log(`Firebase inicializado correctamente en el servidor desde: ${configPath}`);
    } catch (e) {
      console.error("No se pudo cargar o parsear la configuración de Firebase:", e);
    }
  } else {
    console.warn("ADVERTENCIA: firebase-applet-config.json no existe. El servidor funcionará en modo offline local.");
  }

  // Helper para obtener y sincronizar el estado/saldo actual de Firestore (o usar valor de respaldo)
  async function getAndUpdateBalance(): Promise<number> {
    let parsedState: any = null;
    let isFromFirestore = false;

    // 1. Intentar cargar desde Firestore
    if (dbFirebase) {
      try {
        const docRef = doc(dbFirebase, "parkingStates", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          parsedState = docSnap.data();
          isFromFirestore = true;
        }
      } catch (err) {
        console.error("Error al obtener estado de Firestore:", err);
      }
    }
    
    // 2. Si no hay Firestore o falló, intentar desde el respaldo local
    const fallbackPath = path.join(process.cwd(), "local-parking-state.json");
    if (!parsedState && fs.existsSync(fallbackPath)) {
      try {
        const raw = fs.readFileSync(fallbackPath, "utf8");
        parsedState = JSON.parse(raw);
      } catch (e) {
        console.error("Error al leer archivo local-parking-state.json:", e);
      }
    }

    // 3. Si no hay estado en ningún lado, usar valores por defecto
    if (!parsedState) {
      parsedState = {
        balance: 5.0,
        isActive: false,
        currentSessionId: null,
        history: [],
        totalDeposits: 5.0,
        totalSpent: 0,
        speedMultiplier: 1,
      };
    }

    // Función auxiliar para parsear timestamps de Firestore robustamente
    const getMsFromTimestamp = (val: any): number => {
      if (!val) return 0;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = Date.parse(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      if (typeof val.toMillis === "function") {
        return val.toMillis();
      }
      if (typeof val.seconds === "number") {
        return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
      }
      if (val instanceof Date) {
        return val.getTime();
      }
      return 0;
    };

    // 4. Procesar catch-up de tiempo transcurrido si está estacionado (isActive === true)
    if (parsedState.isActive && parsedState.currentSessionId && parsedState.lastSavedTime) {
      const lastSavedMs = getMsFromTimestamp(parsedState.lastSavedTime);
      const elapsedRealMs = Date.now() - lastSavedMs;
      if (elapsedRealMs > 0) {
        const speed = parsedState.speedMultiplier || 1;
        const simDeltaMs = elapsedRealMs * speed;
        const RATE_PER_MS = 0.10 / (3600 * 1000); // $0.10 por hora
        const offlineCost = simDeltaMs * RATE_PER_MS;

        let finalState = { ...parsedState };

        if (offlineCost >= parsedState.balance) {
          const finalAffordableMs = parsedState.balance / RATE_PER_MS;
          const updatedHistory = (parsedState.history || []).map((s: any) => {
            if (s.id === parsedState.currentSessionId) {
              return {
                ...s,
                endTime: s.startTime + s.elapsedTimeMs + finalAffordableMs,
                elapsedTimeMs: s.elapsedTimeMs + finalAffordableMs,
                cost: s.cost + parsedState.balance,
                isActive: false,
              };
            }
            return s;
          });

          finalState = {
            ...parsedState,
            balance: 0,
            isActive: false,
            currentSessionId: null,
            history: updatedHistory,
            totalSpent: (parsedState.totalSpent || 0) + parsedState.balance,
            lastSavedTime: Date.now(),
          };
        } else {
          const updatedHistory = (parsedState.history || []).map((s: any) => {
            if (s.id === parsedState.currentSessionId) {
              return {
                ...s,
                elapsedTimeMs: s.elapsedTimeMs + simDeltaMs,
                cost: s.cost + offlineCost,
              };
            }
            return s;
          });

          finalState = {
            ...parsedState,
            balance: parsedState.balance - offlineCost,
            history: updatedHistory,
            totalSpent: (parsedState.totalSpent || 0) + offlineCost,
            lastSavedTime: Date.now(),
          };
        }

        parsedState = finalState;

        // 5. Guardar el estado actualizado de vuelta a la base de datos o archivo local
        if (isFromFirestore && dbFirebase) {
          try {
            const docRef = doc(dbFirebase, "parkingStates", "global");
            await setDoc(docRef, parsedState);
            console.log("Estado de estacionamiento catch-up guardado en Firestore.");
          } catch (err) {
            console.error("Error al guardar estado catch-up en Firestore:", err);
          }
        }
        
        // Guardar siempre una copia local por seguridad
        try {
          fs.writeFileSync(fallbackPath, JSON.stringify(parsedState, null, 2), "utf8");
        } catch (e) {
          console.error("Error al guardar respaldo de estado local:", e);
        }
      }
    }

    return parsedState.balance;
  }

  // Endpoint 1: Retorna un JSON con el saldo y su formato (o texto plano si se especifica ?text=true)
  app.get("/saldo", async (req, res) => {
    try {
      const balance = await getAndUpdateBalance();
      if (req.query.text !== undefined) {
        res.setHeader("Content-Type", "text/plain");
        return res.status(200).send(balance.toFixed(2));
      }
      res.status(200).json({
        balance: parseFloat(balance.toFixed(2)),
        formatted: `$${balance.toFixed(2)}`,
        status: "success",
        timestamp: Date.now()
      });
    } catch (err) {
      res.status(500).json({ error: "Error al obtener el saldo", status: "error" });
    }
  });

  // Endpoint 2: API estructurada en formato JSON
  app.get("/api/saldo", async (req, res) => {
    try {
      const balance = await getAndUpdateBalance();
      res.status(200).json({ 
        balance: parseFloat(balance.toFixed(2)), 
        formatted: `$${balance.toFixed(2)}`,
        status: "success",
        timestamp: Date.now()
      });
    } catch (err) {
      res.status(500).json({ error: "Error al obtener el saldo", status: "error" });
    }
  });

  // Endpoint para establecer saldo e iniciar sesión de parqueo automáticamente
  const handleSetSaldoRequest = async (req: express.Request, res: express.Response) => {
    try {
      const saldoParam = req.params.saldo || req.query.saldo || req.query.value;
      
      const isNewMessage = (saldoParam !== undefined && String(saldoParam).toLowerCase() === "new") ||
                           (req.query.msg && String(req.query.msg).toLowerCase() === "new") ||
                           (req.query.message && String(req.query.message).toLowerCase() === "new") ||
                           req.path.endsWith("/new");

      if (saldoParam === undefined && !isNewMessage) {
        return res.status(400).json({
          status: "error",
          message: "Debe proporcionar un valor de saldo, ej. ?saldo=10 o /set-saldo/10 o enviar un comando 'new'"
        });
      }

      // 1. Cargar estado actual
      let parsedState: any = null;
      let isFromFirestore = false;

      if (dbFirebase) {
        try {
          const docRef = doc(dbFirebase, "parkingStates", "global");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            parsedState = docSnap.data();
            isFromFirestore = true;
          }
        } catch (err) {
          console.error("Error al obtener estado de Firestore en set-saldo:", err);
        }
      }

      const fallbackPath = path.join(process.cwd(), "local-parking-state.json");
      if (!parsedState && fs.existsSync(fallbackPath)) {
        try {
          const raw = fs.readFileSync(fallbackPath, "utf8");
          parsedState = JSON.parse(raw);
        } catch (e) {
          console.error("Error al leer archivo local-parking-state.json:", e);
        }
      }

      if (!parsedState) {
        parsedState = {
          balance: 0,
          isActive: false,
          currentSessionId: null,
          history: [],
          totalDeposits: 0,
          totalSpent: 0,
          speedMultiplier: 1,
        };
      }

      const now = Date.now();

      // Función auxiliar interna para parsear timestamps
      const getMsFromTimestamp = (val: any): number => {
        if (!val) return 0;
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = Date.parse(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        if (typeof val.toMillis === "function") {
          return val.toMillis();
        }
        if (typeof val.seconds === "number") {
          return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
        }
        if (val instanceof Date) {
          return val.getTime();
        }
        return 0;
      };

      if (isNewMessage) {
        // Cancelar / pausar la sesión de parqueo actual
        if (parsedState.isActive && parsedState.currentSessionId) {
          const lastSavedMs = getMsFromTimestamp(parsedState.lastSavedTime || now);
          const elapsedRealMs = now - lastSavedMs;
          const speed = parsedState.speedMultiplier || 1;
          const simDeltaMs = elapsedRealMs > 0 ? elapsedRealMs * speed : 0;
          const RATE_PER_MS = 0.10 / (3600 * 1000);
          const sessionCost = simDeltaMs * RATE_PER_MS;

          // Descontar costo del saldo
          parsedState.balance = Math.max(0, (parsedState.balance || 0) - sessionCost);

          parsedState.history = (parsedState.history || []).map((s: any) => {
            if (s.id === parsedState.currentSessionId) {
              return {
                ...s,
                endTime: now,
                elapsedTimeMs: s.elapsedTimeMs + simDeltaMs,
                cost: s.cost + sessionCost,
                isActive: false
              };
            }
            return s;
          });
          parsedState.totalSpent = (parsedState.totalSpent || 0) + sessionCost;
          parsedState.isActive = false;
          parsedState.currentSessionId = null;
        }

        parsedState.lastSavedTime = now;

        // Guardar
        if (isFromFirestore && dbFirebase) {
          try {
            const docRef = doc(dbFirebase, "parkingStates", "global");
            await setDoc(docRef, parsedState);
          } catch (err) {
            console.error("Error al guardar en Firestore para comando 'new':", err);
          }
        }
        try {
          fs.writeFileSync(fallbackPath, JSON.stringify(parsedState, null, 2), "utf8");
        } catch (e) {
          console.error("Error al guardar local-parking-state.json para comando 'new':", e);
        }

        return res.status(200).json({
          status: "success",
          message: "Sesión de parqueo cancelada con éxito mediante mensaje 'new'.",
          data: {
            balance: parseFloat(parsedState.balance.toFixed(2)),
            isActive: parsedState.isActive,
            currentSessionId: parsedState.currentSessionId,
            timestamp: now
          }
        });
      }

      const newBalance = parseFloat(String(saldoParam));
      if (isNaN(newBalance) || newBalance < 0) {
        return res.status(400).json({
          status: "error",
          message: "El saldo proporcionado debe ser un número válido mayor o igual a 0, o enviar 'new' para cancelar la sesión."
        });
      }

      // 2. Si hay una sesión activa, finalizarla primero calculando la diferencia acumulada
      if (parsedState.isActive && parsedState.currentSessionId && parsedState.lastSavedTime) {
        const lastSavedMs = getMsFromTimestamp(parsedState.lastSavedTime);
        const elapsedRealMs = now - lastSavedMs;
        const speed = parsedState.speedMultiplier || 1;
        const simDeltaMs = elapsedRealMs > 0 ? elapsedRealMs * speed : 0;
        const RATE_PER_MS = 0.10 / (3600 * 1000);
        const sessionCost = simDeltaMs * RATE_PER_MS;

        parsedState.history = (parsedState.history || []).map((s: any) => {
          if (s.id === parsedState.currentSessionId) {
            return {
              ...s,
              endTime: now,
              elapsedTimeMs: s.elapsedTimeMs + simDeltaMs,
              cost: s.cost + sessionCost,
              isActive: false
            };
          }
          return s;
        });
        parsedState.totalSpent = (parsedState.totalSpent || 0) + sessionCost;
      }

      // 3. Establecer el nuevo saldo y actualizar los depósitos totales
      const diff = newBalance - parsedState.balance;
      if (diff > 0) {
        parsedState.totalDeposits = (parsedState.totalDeposits || 0) + diff;
      }
      parsedState.balance = newBalance;

      // 4. Iniciar automáticamente la nueva sesión de parqueo si el saldo es mayor a 0
      if (newBalance > 0) {
        const sessionId = `session-${now}`;
        const newSession = {
          id: sessionId,
          startTime: now,
          endTime: null,
          elapsedTimeMs: 0,
          cost: 0,
          isActive: true
        };

        parsedState.isActive = true;
        parsedState.currentSessionId = sessionId;
        parsedState.history = [newSession, ...(parsedState.history || [])];
      } else {
        parsedState.isActive = false;
        parsedState.currentSessionId = null;
      }

      parsedState.lastSavedTime = now;

      // 5. Guardar estado actualizado en Firestore y archivo local de respaldo
      if (isFromFirestore && dbFirebase) {
        try {
          const docRef = doc(dbFirebase, "parkingStates", "global");
          await setDoc(docRef, parsedState);
          console.log("Nuevo saldo y sesión activa guardados en Firestore correctamente.");
        } catch (err) {
          console.error("Error al guardar nuevo estado en Firestore:", err);
        }
      }

      try {
        fs.writeFileSync(fallbackPath, JSON.stringify(parsedState, null, 2), "utf8");
      } catch (e) {
        console.error("Error al guardar respaldo local del nuevo estado:", e);
      }

      // Devolver respuesta estructurada
      return res.status(200).json({
        status: "success",
        message: newBalance > 0 
          ? `Saldo establecido en $${newBalance.toFixed(2)} USD y nueva sesión de parqueo iniciada automáticamente.`
          : `Saldo establecido en $${newBalance.toFixed(2)} USD (sesiones desactivadas por saldo cero).`,
        data: {
          balance: parseFloat(parsedState.balance.toFixed(2)),
          isActive: parsedState.isActive,
          currentSessionId: parsedState.currentSessionId,
          timestamp: now
        }
      });

    } catch (err) {
      console.error("Error en handleSetSaldoRequest:", err);
      return res.status(500).json({
        status: "error",
        message: "Error interno del servidor al establecer el saldo e iniciar la sesión."
      });
    }
  };

  // Registrar rutas para set-saldo y cancelamiento por "new"
  app.get("/api/set-saldo", handleSetSaldoRequest);
  app.get("/api/set-saldo/:saldo", handleSetSaldoRequest);
  app.get("/set-saldo", handleSetSaldoRequest);
  app.get("/set-saldo/:saldo", handleSetSaldoRequest);
  app.get("/api/new", handleSetSaldoRequest);
  app.get("/new", handleSetSaldoRequest);

  // Interceptar la raíz "/" si se pide saldo explícitamente, si es una herramienta de terminal (cURL/wget) o JSON Header
  app.get("/", async (req, res, next) => {
    const userAgent = (req.headers["user-agent"] || "").toLowerCase();
    const isCommandLine = userAgent.includes("curl") || userAgent.includes("wget") || userAgent.includes("httpie");

    if (req.query.saldo !== undefined || req.query.json !== undefined || req.headers.accept === "application/json" || isCommandLine) {
      try {
        const balance = await getAndUpdateBalance();
        
        // Si es curl/wget y no pide explícitamente JSON, devolvemos texto plano para comodidad en terminal
        if (isCommandLine && req.query.json === undefined && req.headers.accept !== "application/json") {
          res.setHeader("Content-Type", "text/plain");
          return res.status(200).send(balance.toFixed(2));
        }

        return res.status(200).json({ 
          balance: parseFloat(balance.toFixed(2)), 
          formatted: `$${balance.toFixed(2)}` 
        });
      } catch (err) {
        if (isCommandLine) {
          return res.status(500).send("Error al obtener el saldo");
        }
        return res.status(500).json({ error: "Error al obtener el saldo" });
      }
    }
    next();
  });

  // Servir frontend con Vite (Desarrollo) o archivos estáticos (Producción)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de Parkflow Pro corriendo en http://localhost:${PORT}`);
    console.log(`Endpoint de saldo disponible en: http://localhost:${PORT}/saldo`);
  });
}

startServer();
