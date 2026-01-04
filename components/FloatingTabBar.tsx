
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Href } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { useTheme } from '@react-navigation/native';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/styles/commonStyles';

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

export default function FloatingTabBar({
  tabs,
  containerWidth = 380,
  borderRadius = 30,
  bottomMargin = 20,
}: FloatingTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  const handleTabPress = (route: Href) => {
    router.push(route);
  };

  const isActive = (route: string) => {
    return pathname.includes(route.replace('/(tabs)/', '').replace('/', ''));
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.safeArea,
        {
          marginBottom: bottomMargin,
        },
      ]}
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tabs.map((tab) => {
            const active = isActive(tab.route as string);
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => handleTabPress(tab.route)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <IconSymbol
                  ios_icon_name={tab.icon}
                  android_material_icon_name={tab.icon}
                  size={22}
                  color={active ? colors.primary : colors.text}
                />
                <Text
                  style={[
                    styles.label,
                    { color: active ? colors.primary : colors.text },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  scrollContent: {
    alignItems: 'center',
    gap: 4,
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
