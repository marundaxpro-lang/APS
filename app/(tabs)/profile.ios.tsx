
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { FitnessProfile } from '@/types/fitness';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      try {
        const backendProfile = await authenticatedGet('/api/fitness-profile');
        if (backendProfile) {
          setProfile(backendProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(backendProfile));
          console.log('[Profile iOS] Profile loaded from backend');
          return;
        }
      } catch (error) {
        console.log('[Profile iOS] No profile in backend, checking local storage');
      }
      
      const profileData = await AsyncStorage.getItem('fitnessProfile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }
    } catch (error) {
      console.error('[Profile iOS] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/auth');
      } else {
        loadProfile();
      }
    }
  }, [user, authLoading, loadProfile]);

  const handleLogout = useCallback(() => {
    console.log('User tapped logout button');
    setShowLogoutModal(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    console.log('User confirmed logout');
    setShowLogoutModal(false);
    try {
      await signOut();
      await AsyncStorage.clear();
      router.replace('/auth');
    } catch (error) {
      console.error('[Profile iOS] Error during logout:', error);
    }
  }, [signOut, router]);

  const handleBack = useCallback(() => {
    console.log('User tapped back button');
    router.back();
  }, [router]);

  const navigateToNotifications = useCallback(() => {
    console.log('User tapped notifications');
    router.push('/notifications');
  }, [router]);

  const navigateToEditProfile = useCallback(() => {
    console.log('User tapped edit profile');
    router.push('/edit-profile');
  }, [router]);

  if (authLoading || loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName = profile?.name || user?.name || 'Athlete';

  return (
    <View style={styles.container}>
      <View style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

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
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        </View>

        {profile && (
          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>Your Profile</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Gender</Text>
              <Text style={styles.profileValue}>
                {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
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
              <Text style={styles.profileValue}>{profile.trainingDays} days/week</Text>
            </View>
            {profile.weight && (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Weight</Text>
                <Text style={styles.profileValue}>{profile.weight} kg</Text>
              </View>
            )}
            {profile.height && (
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Height</Text>
                <Text style={styles.profileValue}>{profile.height} cm</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingItem} onPress={navigateToNotifications}>
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

          <TouchableOpacity style={styles.settingItem} onPress={navigateToEditProfile}>
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

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButtonContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  scrollContent: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
