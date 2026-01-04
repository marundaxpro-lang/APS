
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="home" name="(home)">
        <Icon sf="figure.strengthtraining.traditional" />
        <Label>Training</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="plan" name="plan">
        <Icon sf="calendar" />
        <Label>Plan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="nutrition" name="nutrition">
        <Icon sf="fork.knife" />
        <Label>Nutrition</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="focus" name="focus">
        <Icon sf="brain.head.profile" />
        <Label>Focus</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="progress" name="progress">
        <Icon sf="chart.line.uptrend.xyaxis" />
        <Label>Progress</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="community" name="community">
        <Icon sf="person.3.fill" />
        <Label>Community</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="shop" name="shop">
        <Icon sf="cart.fill" />
        <Label>Shop</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
