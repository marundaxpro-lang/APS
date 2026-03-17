
import React from 'react';
import { Slot } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <FloatingTabBar
        tabs={[
          {
            name: '(home)',
            route: '/(tabs)/(home)',
            icon: 'home',
            label: 'Home',
          },
          {
            name: 'training',
            route: '/(tabs)/training',
            icon: 'directions_run',
            label: 'Train',
          },
          {
            name: 'nutrition',
            route: '/(tabs)/nutrition',
            icon: 'restaurant',
            label: 'Nutrition',
          },
          {
            name: 'focus',
            route: '/(tabs)/focus',
            icon: 'bolt',
            label: 'Momentum',
          },
          {
            name: 'progress',
            route: '/(tabs)/progress',
            icon: 'show_chart',
            label: 'Progress',
          },
          {
            name: 'profile',
            route: '/(tabs)/profile',
            icon: 'person',
            label: 'Profile',
          },
        ]}
      />
    </View>
  );
}
