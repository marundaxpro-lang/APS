/**
 * Web stub for react-native-edge-to-edge.
 * SystemBars renders nothing on web.
 */
import React from 'react';

interface SystemBarsProps {
  style?: 'auto' | 'light' | 'dark';
  hidden?: boolean;
}

export const SystemBars: React.FC<SystemBarsProps> = () => null;
