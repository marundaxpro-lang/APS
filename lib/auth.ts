import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.backendUrl as string) ||
  "https://6n56k42q4ee7wx23tvj24hjhn64k9a89.app.specular.dev";

const isExpoGo = Constants.appOwnership === "expo";

console.log(
  "[AuthClient] Better Auth callback scheme:",
  isExpoGo ? "Expo Go/Newly preview linking" : "aps",
);

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    expoClient({
      ...(isExpoGo ? {} : { scheme: "aps" }),
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
