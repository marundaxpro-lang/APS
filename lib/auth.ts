import { createAuthClient, expoClient } from "@better-auth/expo";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.backendUrl as string) ||
  "https://6n56k42q4ee7wx23tvj24hjhn64k9a89.app.specular.dev";

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    expoClient({
      scheme: "aps",
      storagePrefix: "aps",
      storage: {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) =>
          SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      },
    }),
  ],
});

export const API_URL = BASE_URL;
