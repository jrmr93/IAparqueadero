/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ParkingState } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Saves the current parking state of a user/device to Firestore.
 * To optimize performance and quotas, this is called during significant events
 * (start, pause, recharge, reset, etc.) and not on every tick.
 */
export async function saveParkingStateToDb(userId: string, state: ParkingState): Promise<void> {
  const path = `parkingStates/${userId}`;
  try {
    const userDocRef = doc(db, "parkingStates", userId);
    const dataToSave = {
      ...state,
      lastSavedTime: Date.now(),
    };
    await setDoc(userDocRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads the parking state of a user/device from Firestore.
 */
export async function loadParkingStateFromDb(userId: string): Promise<ParkingState | null> {
  const path = `parkingStates/${userId}`;
  try {
    const userDocRef = doc(db, "parkingStates", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as ParkingState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

