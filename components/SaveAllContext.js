"use client";

import { createContext, useContext, useState, useMemo, useCallback } from "react";

const SaveAllContext = createContext({
  config: { onClick: null, disabled: true, label: "Save all" },
  setConfig: () => {},
});

export function SaveAllProvider({ children }) {
  const [config, setConfig] = useState({
    onClick: null,
    disabled: true,
    label: "Save all",
  });

  const value = useMemo(() => ({ config, setConfig }), [config]);

  return (
    <SaveAllContext.Provider value={value}>{children}</SaveAllContext.Provider>
  );
}

export function useSaveAllContext() {
  return useContext(SaveAllContext);
}

export function useSaveAllController() {
  const { setConfig } = useSaveAllContext();
  const register = useCallback(
    (nextConfig) => {
      setConfig((prev) => ({ ...prev, ...nextConfig }));
    },
    [setConfig]
  );
  return { register };
}
