
import { authenticatedGet } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';
import CustomModal from '@/components/ui/Modal';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessProfile } from '@/types/fitness';
import { colors } from '@/styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  guestBanner: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  guestBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  guestBannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  guestBannerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  guestBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextConfirm: {
    color: '#FFFFFF',
  },
});

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, authLoading } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const loadProfile = useCallback(async () => {
    console.log('ProfileScreen: Loading profile data');
    try {
      setLoading(true);

      const guestStatus = await AsyncStorage.getItem('isGuestUser');
      setIsGuest(guestStatus === 'true');
      console.log('ProfileScreen: Guest status:', guestStatus);

      const localProfile = await AsyncStorage.getItem('fitnessProfile');
      if (localProfile) {
        const parsedProfile = JSON.parse(localProfile);
        console.log('ProfileScreen: Loaded profile from AsyncStorage:', parsedProfile);
        setProfile(parsedProfile);
      }

      if (user) {
        console.log('ProfileScreen: Fetching profile from backend for user:', user.id);
        try {
          const backendProfile = await authenticatedGet<any>('/api/fitness-profile');
          console.log('ProfileScreen: Loaded profile from backend:', backendProfile);
          
          // Map backend snake_case fields to frontend camelCase
          const mappedProfile = {
            name: backendProfile.name || parsedProfile?.name,
            experienceLevel: backendProfile.experienceLevel || backendProfile.experience_level || parsedProfile?.experienceLevel,
            goal: backendProfile.goal || parsedProfile?.goal,
            trainingDays: backendProfile.trainingFrequency || backendProfile.training_frequency || backendProfile.trainingDays || parsedProfile?.trainingDays,
            trainingFrequency: backendProfile.trainingFrequency || backendProfile.training_frequency || parsedProfile?.trainingFrequency,
            gender: backendProfile.gender || parsedProfile?.gender,
            weight: backendProfile.weight ? parseFloat(backendProfile.weight) : parsedProfile?.weight,
            height: backendProfile.height ? parseFloat(backendProfile.height) : parsedProfile?.height,
            age: backendProfile.age || parsedProfile?.age,
            activityLevel: backendProfile.activityLevel || backendProfile.activity_level || parsedProfile?.activityLevel,
            equipmentType: backendProfile.equipmentType || backendProfile.equipment_type || parsedProfile?.equipmentType,
            focusAreas: backendProfile.focusAreas || backendProfile.focus_areas || parsedProfile?.focusAreas || [],
            caloricGoal: parsedProfile?.caloricGoal,
            protein: parsedProfile?.protein,
            carbs: parsedProfile?.carbs,
            fat: parsedProfile?.fat,
          };
          
          console.log('ProfileScreen: Mapped profile:', mappedProfile);
          setProfile(mappedProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(mappedProfile));
        } catch (error) {
          console.error('ProfileScreen: Error fetching profile from backend:', error);
          // Continue with local profile if backend fails
        }
      }
    } catch (error) {
      console.error('ProfileScreen: Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('ProfileScreen: Auth state changed - user:', user, 'authLoading:', authLoading);
    if (!authLoading) {
      loadProfile();
    }
  }, [user, authLoading, loadProfile]);

  const handleCreateAccount = () => {
    console.log('ProfileScreen: User tapped Create Account');
    router.push('/auth');
  };

  const handleLogout = async () => {
    console.log('ProfileScreen: User tapped Logout button');
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    console.log('ProfileScreen: User confirmed logout');
    setShowLogoutModal(false);
    try {
      if (isGuest) {
        await AsyncStorage.removeItem('isGuestUser');
        console.log('ProfileScreen: Guest logged out, redirecting to auth');
        router.replace('/auth');
      } else {
        await signOut();
        console.log('ProfileScreen: Sign out successful, redirecting to auth');
        router.replace('/auth');
      }
    } catch (error) {
      console.error('ProfileScreen: Error during logout:', error);
    }
  };

  const handleResetOnboarding = () => {
    console.log('ProfileScreen: User tapped Reset Onboarding button');
    setShowResetModal(true);
  };

  const confirmResetOnboarding = async () => {
    console.log('ProfileScreen: User confirmed reset onboarding');
    setShowResetModal(false);
    try {
      console.log('ProfileScreen: Clearing AsyncStorage data');
      await AsyncStorage.removeItem('fitnessProfile');
      await AsyncStorage.removeItem('hasCompletedOnboarding');
      await AsyncStorage.removeItem('caloricGoal');
      await AsyncStorage.removeItem('weeklyWorkouts');
      console.log('ProfileScreen: AsyncStorage cleared, redirecting to onboarding');
      router.replace('/onboarding');
    } catch (error) {
      console.error('ProfileScreen: Error resetting onboarding:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Map goal values from onboarding to display text
  const goalMap: Record<string, string> = {
    'strength': 'Get Stronger',
    'muscle': 'Build Muscle',
    'endurance': 'Boost Endurance',
    'weight-loss': 'Lose Weight',
    'weight_loss': 'Lose Weight',
    'weightLoss': 'Lose Weight',
    'muscleGain': 'Build Muscle',
    'muscle_gain': 'Build Muscle',
    'maintenance': 'Maintenance',
  };

  const genderDisplay = profile?.gender === 'male' ? 'Male' : profile?.gender === 'female' ? 'Female' : profile?.gender === 'other' ? 'Other' : 'Not set';
  
  // Experience level with proper fallback
  const experienceLevel = profile?.experienceLevel || 'beginner';
  const experienceDisplay = experienceLevel === 'beginner' ? 'Beginner' : 
                           experienceLevel === 'intermediate' ? 'Intermediate' : 
                           experienceLevel === 'advanced' ? 'Advanced' : 'Beginner';
  
  const goalDisplay = profile?.goal ? (goalMap[profile.goal] || profile.goal) : 'Not set';
  
  // Training days can come from trainingDays, trainingFrequency, or selectedDays
  const trainingDaysCount = profile?.trainingDays || profile?.trainingFrequency || (profile as any)?.selectedDays?.length || 0;
  const trainingDaysDisplay = trainingDaysCount > 0 ? `${trainingDaysCount} days/week` : 'Not set';
  
  const weightDisplay = profile?.weight ? `${Math.round(profile.weight)} kg` : 'Not set';
  const heightDisplay = profile?.height ? `${Math.round(profile.height)} cm` : 'Not set';
  const ageDisplay = profile?.age ? `${profile.age} years` : 'Not set';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your fitness profile</Text>
        </View>

        {isGuest && (
          <View style={styles.guestBanner}>
            <IconSymbol
              ios_icon_name="person.crop.circle.badge.exclamationmark"
              android_material_icon_name="person-add"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.guestBannerTitle}>You&apos;re using Guest Mode</Text>
            <Text style={styles.guestBannerText}>
              Create an account to sync your progress across devices and never lose your data.
            </Text>
            <TouchableOpacity
              style={styles.guestBannerButton}
              onPress={handleCreateAccount}
            >
              <Text style={styles.guestBannerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{profile?.name || user?.name || 'Not set'}</Text>
            </View>
            {!isGuest && (
              <View style={styles.row}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user?.email || 'Not set'}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{genderDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Age</Text>
              <Text style={styles.value}>{ageDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Weight</Text>
              <Text style={styles.value}>{weightDisplay}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Height</Text>
              <Text style={styles.value}>{heightDisplay}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Profile</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Experience Level</Text>
              <Text style={styles.value}>{experienceDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Goal</Text>
              <Text style={styles.value}>{goalDisplay}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Training Days</Text>
              <Text style={styles.value}>{trainingDaysDisplay}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.log('ProfileScreen: User tapped Edit Profile button');
              router.push('/edit-profile');
            }}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              console.log('ProfileScreen: User tapped Help & Support button');
              router.push('/help-support');
            }}
          >
            <Text style={styles.secondaryButtonText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              console.log('ProfileScreen: User tapped Privacy & Security button');
              router.push('/privacy-security');
            }}
          >
            <Text style={styles.secondaryButtonText}>Privacy & Security</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetOnboarding}
          >
            <Text style={styles.buttonText}>Reset Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Text>
            <Text style={styles.modalMessage}>
              {isGuest 
                ? 'Are you sure you want to exit guest mode? Your local data will remain on this device.'
                : 'Are you sure you want to sign out?'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  console.log('ProfileScreen: User cancelled logout');
                  setShowLogoutModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {isGuest ? 'Exit' : 'Sign Out'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Onboarding</Text>
            <Text style={styles.modalMessage}>
              This will clear your profile data and take you back to the onboarding flow. You'll need to set up your profile again. Are you sure?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  console.log('ProfileScreen: User cancelled reset onboarding');
                  setShowResetModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmResetOnboarding}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
