
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="(home)" name="(home)">
        <Icon sf="house.fill" drawable="home" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="training" name="training">
        <Icon sf="figure.strengthtraining.traditional" drawable="directions_run" />
        <Label>Training</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="focus" name="focus">
        <Icon sf="timer" drawable="timer" />
        <Label>Focus</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="nutrition" name="nutrition">
        <Icon sf="fork.knife" drawable="restaurant" />
        <Label>Nutrition</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="shop" name="shop">
        <Icon sf="star.fill" drawable="star" />
        <Label>Premium</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="profile" name="profile">
        <Icon sf="person.circle.fill" drawable="person" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
