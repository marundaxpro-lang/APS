/**
 * Web stub for expo-glass-effect.
 * GlassView renders as a plain View on web since the native blur effect is unavailable.
 */
import React from 'react';
import { View, ViewProps } from 'react-native';

interface GlassViewProps extends ViewProps {
  glassEffectStyle?: 'regular' | 'prominent' | 'light' | 'dark' | 'clear';
}

export const GlassView = React.forwardRef<View, GlassViewProps>(
  ({ glassEffectStyle: _glassEffectStyle, style, children, ...rest }, ref) => {
    return React.createElement(View, { ref, style, ...rest }, children);
  }
);

GlassView.displayName = 'GlassView';
