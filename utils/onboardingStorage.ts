import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'hasCompletedOnboarding';
export const GUEST_MODE_KEY = 'guest_mode';

function onboardingKey(userId?: string | null): string {
  return userId ? `${ONBOARDING_KEY}:${userId}` : ONBOARDING_KEY;
}

export async function isOnboardingComplete(userId?: string | null): Promise<boolean> {
  try {
    if (userId) {
      const userValue = await AsyncStorage.getItem(onboardingKey(userId));
      if (userValue === 'true') return true;
      if (userValue === 'false') return false;
    }

    const legacyValue = await AsyncStorage.getItem(ONBOARDING_KEY);
    return legacyValue === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(userId?: string | null): Promise<void> {
  try {
    const key = onboardingKey(userId);
    await AsyncStorage.setItem(key, 'true');
    if (!userId) {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    }
  } catch {
    // ignore
  }
}

/** Alias kept for callers that use the "Completed" spelling */
export const setOnboardingCompleted = setOnboardingComplete;

export async function clearOnboarding(userId?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(onboardingKey(userId));
  } catch {
    // ignore
  }
}

export async function setGuestMode(value: boolean): Promise<void> {
  try {
    if (value) {
      await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
    }
  } catch {
    // ignore
  }
}

export async function isGuestMode(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}
