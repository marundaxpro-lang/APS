
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';

interface MenuItem {
  label: string;
  route: string;
  iosIcon: string;
  androidIcon: keyof typeof import('@expo/vector-icons/MaterialIcons').default.glyphMap;
}

const menuItems: MenuItem[] = [
  { label: 'Training', route: '/(tabs)/training', iosIcon: 'dumbbell', androidIcon: 'fitness-center' },
  { label: 'Plan', route: '/(tabs)/plan', iosIcon: 'calendar', androidIcon: 'calendar-today' },
  { label: 'Profile', route: '/(tabs)/profile', iosIcon: 'person.fill', androidIcon: 'person' },
];

export default function TopMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleNavigate = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.logo}>APS Fitness</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal" android_material_icon_name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            {menuItems.map((item) => {
              const isActive = pathname === item.route;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleNavigate(item.route)}
                >
                  <IconSymbol
                    ios_icon_name={item.iosIcon}
                    android_material_icon_name={item.androidIcon}
                    size={24}
                    color={isActive ? colors.primary : colors.text}
                  />
                  <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  menuButton: {
    padding: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menu: {
    marginTop: 60,
    marginRight: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuItemTextActive: {
    color: colors.primary,
  },
});
