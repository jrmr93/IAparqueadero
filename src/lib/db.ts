/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ParkingState } from "../types";

/**
 * Saves the current parking state of a user/device to Firestore.
 * To optimize performance and quotas, this is called during significant events
 * (start, pause, recharge, reset, etc.) and not on every tick.
 */
export async function saveParkingStateToDb(userId: string, state: ParkingState): Promise<void> {
  try {
    const userDocRef = doc(db, "parkingStates", userId);
    const dataToSave = {
      ...state,
      lastSavedTime: Date.now(),
    };
    await setDoc(userDocRef, dataToSave);
  } catch (error) {
    console.error("Error saving state to Firestore:", error);
  }
}

/**
 * Loads the parking state of a user/device from Firestore.
 */
export async function loadParkingStateFromDb(userId: string): Promise<ParkingState | null> {
  try {
    const userDocRef = doc(db, "parkingStates", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as ParkingState;
    }
    return null;
  } catch (error) {
    console.error("Error loading state from Firestore:", error);
    return null;
  }
}
