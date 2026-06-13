"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "privacy-hidden";
const CHANGE_EVENT = "privacy-change";

interface PrivacyContextValue {
  hidden: boolean;
  toggleHidden: () => void;
  setHidden: (hidden: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// En SSR siempre se renderiza visible; el cliente se sincroniza al hidratar.
function getServerSnapshot() {
  return false;
}

function setHidden(next: boolean) {
  localStorage.setItem(STORAGE_KEY, String(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo(
    () => ({
      hidden,
      setHidden,
      toggleHidden: () => setHidden(!hidden),
    }),
    [hidden]
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const value = useContext(PrivacyContext);
  if (!value) {
    throw new Error("usePrivacy debe usarse dentro de PrivacyProvider");
  }
  return value;
}
