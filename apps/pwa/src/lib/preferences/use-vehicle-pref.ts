import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type VehicleMode = "car" | "foot";

const WALK_KM = 2;

type VehiclePrefState = {
  mode: VehicleMode;
  setMode: (m: VehicleMode) => void;
};

export const useVehiclePref = create<VehiclePrefState>()(
  persist(
    (set) => ({
      mode: "car",
      setMode: (mode) => set({ mode }),
    }),
    { name: "vehicle-pref", storage: createJSONStorage(() => localStorage) },
  ),
);

export const WALK_KM_LIMIT = WALK_KM;
