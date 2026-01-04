
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'fitness-center',
      label: 'Training',
    },
    {
      name: 'plan',
      route: '/(tabs)/plan',
      icon: 'calendar-today',
      label: 'Plan',
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
      icon: 'psychology',
      label: 'Focus',
    },
    {
      name: 'progress',
      route: '/(tabs)/progress',
      icon: 'trending-up',
      label: 'Progress',
    },
    {
      name: 'community',
      route: '/(tabs)/community',
      icon: 'group',
      label: 'Community',
    },
    {
      name: 'shop',
      route: '/(tabs)/shop',
      icon: 'shopping-cart',
      label: 'Shop',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="home" name="(home)" />
        <Stack.Screen key="plan" name="plan" />
        <Stack.Screen key="nutrition" name="nutrition" />
        <Stack.Screen key="focus" name="focus" />
        <Stack.Screen key="progress" name="progress" />
        <Stack.Screen key="community" name="community" />
        <Stack.Screen key="shop" name="shop" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
