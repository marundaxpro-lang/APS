/**
 * Web stub for expo-network.
 * useNetworkState returns a safe always-connected state on web.
 */

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
}

export function useNetworkState(): NetworkState {
  return {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };
}

export async function getNetworkStateAsync(): Promise<NetworkState> {
  return {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };
}
