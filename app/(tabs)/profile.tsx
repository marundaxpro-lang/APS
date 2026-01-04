
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessProfile } from '@/types/fitness';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/auth');
      } else {
        loadProfile();
      }
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Try to load from backend first
      try {
        const backendProfile = await authenticatedGet('/api/fitness-profile');
        if (backendProfile) {
          setProfile(backendProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(backendProfile));
          console.log('[Profile] Profile loaded from backend');
          return;
        }
      } catch (error) {
        console.log('[Profile] No profile in backend, checking local storage');
      }
      
      // Fallback to local storage
      const profileData = await AsyncStorage.getItem('fitnessProfile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          await AsyncStorage.clear();
          router.replace('/auth');
        },
      },
    ]);
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={48}
              color={colors.text}
            />
          </View>
          <Text style={styles.name}>{user?.name || 'Fitness Enthusiast'}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        </View>

        {profile && (
          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>Your Profile</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Experience Level</Text>
              <Text style={styles.profileValue}>
                {profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1)}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Primary Goal</Text>
              <Text style={styles.profileValue}>
                {profile.goal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Training Frequency</Text>
              <Text style={styles.profileValue}>{profile.training_frequency} days/week</Text>
            </View>
          </View>
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.settingText}>Notifications</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account-circle"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.settingText}>Edit Profile</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.settingText}>Privacy & Security</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol
              ios_icon_name="questionmark.circle.fill"
              android_material_icon_name="help"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.settingText}>Help & Support</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.settingText}>About</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol
            ios_icon_name="arrow.right.square.fill"
            android_material_icon_name="logout"
            size={20}
            color="#ffffff"
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  profileLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  version: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
