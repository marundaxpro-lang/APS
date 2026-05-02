import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

// @bacons/apple-targets is native-only — guard for web and Expo Go (where it may not be linked)
let ExtensionStorage: { new(group: string): { set: (key: string, value: unknown) => void }; reloadWidget: () => void } | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ExtensionStorage = require('@bacons/apple-targets').ExtensionStorage;
  } catch {
    // Package not available in this build (e.g. Expo Go) — widget sync disabled
  }
}

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (ExtensionStorage) {
      ExtensionStorage.reloadWidget();
    }
  }, []);

  const refreshWidget = useCallback(() => {
    if (ExtensionStorage) {
      ExtensionStorage.reloadWidget();
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
