
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_PACK_KEY = 'active_program_pack';

export async function getActivePack(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(ACTIVE_PACK_KEY);
    console.log('[ActivePack] getActivePack:', value);
    return value;
  } catch (e) {
    console.error('[ActivePack] Error getting active pack:', e);
    return null;
  }
}

export async function setActivePack(packId: string): Promise<void> {
  try {
    console.log('[ActivePack] setActivePack:', packId);
    await AsyncStorage.setItem(ACTIVE_PACK_KEY, packId);
  } catch (e) {
    console.error('[ActivePack] Error setting active pack:', e);
  }
}

export async function clearActivePack(): Promise<void> {
  try {
    console.log('[ActivePack] clearActivePack');
    await AsyncStorage.removeItem(ACTIVE_PACK_KEY);
  } catch (e) {
    console.error('[ActivePack] Error clearing active pack:', e);
  }
}
