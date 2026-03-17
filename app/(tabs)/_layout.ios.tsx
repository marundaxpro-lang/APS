
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
        <Label>Train</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="nutrition" name="nutrition">
        <Icon sf="fork.knife" drawable="restaurant" />
        <Label>Nutrition</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="progress" name="progress">
        <Icon sf="chart.line.uptrend.xyaxis" drawable="show_chart" />
        <Label>Progress</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="profile" name="profile">
        <Icon sf="person.circle.fill" drawable="person" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
