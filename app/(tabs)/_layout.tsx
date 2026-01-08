
import React from 'react';
import { Stack } from 'expo-router';
import TopMenu from '@/components/TopMenu';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopMenu />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="training" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="profile" />
      </Stack>
    </View>
  );
}
