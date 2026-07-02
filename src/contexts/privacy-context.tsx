"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface PrivacyContextValue {
  hidden: boolean;
  toggleHidden: () => void;
  setHidden: (hidden: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHiddenState] = useState(false);

  useEffect(() => {
    setHiddenState(localStorage.getItem("privacy-hidden") === "true");
  }, []);

  function setHidden(next: boolean) {
    setHiddenState(next);
    localStorage.setItem("privacy-hidden", String(next));
  }

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
