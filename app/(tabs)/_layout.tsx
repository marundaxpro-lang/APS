
import React from 'react';
import { Slot } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/* This renders the actual screen content */}
      <Slot />
      
      {/* This renders the floating tab bar at the bottom */}
      <FloatingTabBar
        tabs={[
          {
            name: '(home)',
            route: '/(tabs)/(home)',
            icon: 'home',
            label: 'Home',
          },
          {
            name: 'plan',
            route: '/(tabs)/plan',
            icon: 'calendar-today',
            label: 'Plan',
          },
          {
            name: 'progress',
            route: '/(tabs)/progress',
            icon: 'show-chart',
            label: 'Progress',
          },
          {
            name: 'nutrition',
            route: '/(tabs)/nutrition',
            icon: 'restaurant',
            label: 'Nutrition',
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
