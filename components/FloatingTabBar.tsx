
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Href } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import { useTheme } from '@react-navigation/native';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import {
  Home,
  Dumbbell,
  Utensils,
  Zap,
  BarChart2,
  User,
  LucideIcon,
} from 'lucide-react-native';

export interface TabBarItem {
  name: string;
  route: Href;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

// Map route name → lucide icon component
// Keys must match the exact `name` values passed from _layout.tsx
const ROUTE_ICONS: Record<string, LucideIcon> = {
  '(home)': Home,
  home: Home,
  training: Dumbbell,
  train: Dumbbell,
  nutrition: Utensils,
  momentum: Zap,
  progress: BarChart2,
  profile: User,
};

export default function FloatingTabBar({
  tabs,
  containerWidth = 380,
  borderRadius = 30,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  const handleTabPress = (tab: TabBarItem) => {
    console.log('[FloatingTabBar] User tapped tab:', tab.label, '→', tab.route);
    router.push(tab.route);
  };

  const isActive = (route: string) => {
    const routeName = (route as string).replace('/(tabs)/', '').replace('/', '');
    return pathname.includes(routeName);
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { marginBottom: bottomMargin }]}
    >
      <BlurView
        intensity={80}
        tint={theme.dark ? 'dark' : 'light'}
        style={[
          styles.container,
          {
            maxWidth: containerWidth,
            borderRadius: borderRadius,
            backgroundColor: Platform.OS === 'web' ? colors.card : 'transparent',
            borderColor: colors.cardBorder,
            borderWidth: 1,
          },
        ]}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.route as string);
          const iconColor = active ? colors.primary : colors.text;
          const tabName = tab.name.toLowerCase();
          const IconComponent: LucideIcon = ROUTE_ICONS[tabName] ?? ROUTE_ICONS[tab.route as string] ?? Home;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <IconComponent size={22} color={iconColor} strokeWidth={2} />
              <Text style={[styles.label, { color: iconColor }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
