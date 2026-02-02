
import React from 'react';
import FloatingTabBar from '@/components/FloatingTabBar';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <FloatingTabBar
        tabs={[
          {
            name: 'training',
            route: '/(tabs)/training',
            icon: 'fitness-center',
            label: 'Training',
          },
          {
            name: 'nutrition',
            route: '/(tabs)/nutrition',
            icon: 'restaurant',
            label: 'Nutrition',
          },
          {
            name: 'progress',
            route: '/(tabs)/progress',
            icon: 'show-chart',
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
