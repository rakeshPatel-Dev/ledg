import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type MotionPreference = "full" | "reduced" | "system";

interface MotionProviderState {
  motion: MotionPreference;
  setMotion: (motion: MotionPreference) => void;
}

const initialState: MotionProviderState = {
  motion: "full",
  setMotion: () => null,
};

const MotionProviderContext = createContext<MotionProviderState>(initialState);

const PREFERS_REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function MotionProvider({
  children,
  defaultMotion = "full",
  storageKey = "ledg-motion",
}: {
  children: ReactNode;
  defaultMotion?: MotionPreference;
  storageKey?: string;
}) {
  const [motion, setMotionState] = useState<MotionPreference>(
    () => (localStorage.getItem(storageKey) as MotionPreference) || defaultMotion
  );
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(PREFERS_REDUCED_QUERY);
    setSystemReduced(query.matches);

    const handleChange = (event: MediaQueryListEvent) => setSystemReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const reduce =
      motion === "reduced" || (motion === "system" && systemReduced);
    document.documentElement.classList.toggle("reduce-motion", reduce);
  }, [motion, systemReduced]);

  const setMotion = (newMotion: MotionPreference) => {
    localStorage.setItem(storageKey, newMotion);
    setMotionState(newMotion);
  };

  return (
    <MotionProviderContext.Provider value={{ motion, setMotion }}>
      {children}
    </MotionProviderContext.Provider>
  );
}

export function useMotion() {
  const context = useContext(MotionProviderContext);
  if (!context) {
    throw new Error("useMotion must be used within a MotionProvider");
  }
  return context;
}
