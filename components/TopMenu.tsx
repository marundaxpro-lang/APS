
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';

interface MenuItem {
  label: string;
  route: string;
  iosIcon: string;
  androidIcon: string;
}

const menuItems: MenuItem[] = [
  { label: 'Training', route: '/(tabs)/training', iosIcon: 'dumbbell', androidIcon: 'fitness-center' },
  { label: 'Plan', route: '/(tabs)/plan', iosIcon: 'calendar', androidIcon: 'calendar-today' },
  { label: 'Nutrition', route: '/(tabs)/nutrition', iosIcon: 'leaf.fill', androidIcon: 'restaurant' },
  { label: 'Focus', route: '/(tabs)/focus', iosIcon: 'target', androidIcon: 'center-focus-strong' },
  { label: 'Progress', route: '/(tabs)/progress', iosIcon: 'chart.bar.fill', androidIcon: 'show-chart' },
  { label: 'Community', route: '/(tabs)/community', iosIcon: 'person.3.fill', androidIcon: 'group' },
  { label: 'Shop', route: '/(tabs)/shop', iosIcon: 'bag.fill', androidIcon: 'shopping-bag' },
];

export default function TopMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleNavigate = (route: string) => {
    setMenuVisible(false);
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>APS</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal" android_material_icon_name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Navigation</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMenuVisible(false)}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => {
                const isActive = pathname === item.route || pathname.startsWith(item.route);
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
                      color={isActive ? '#fff' : '#9ca3af'}
                    />
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.profileSection}
                onPress={() => handleNavigate('/(tabs)/profile')}
              >
                <View style={styles.profileAvatar}>
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color="#fff" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>Profile</Text>
                  <Text style={styles.profileSubtext}>Manage account</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: '#050608',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  menuButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalBackground: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#0a0c0e',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  menuContent: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: '#459b9b',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  menuItemTextActive: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
    marginHorizontal: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginHorizontal: 12,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  profileSubtext: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
