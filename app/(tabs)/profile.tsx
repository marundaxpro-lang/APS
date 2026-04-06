
import { authenticatedGet } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';
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
import { useSubscription } from '@/contexts/SubscriptionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessProfile } from '@/types/fitness';
import { colors } from '@/styles/commonStyles';
import { useSettings } from '@/contexts/SettingsContext';
import { calculateBMI } from '@/utils/nutritionEngine';
import { useTranslation } from 'react-i18next';


interface SubscriptionStatus {
  planType: string;
  status: string;
  currentPeriodEnd: string | null;
  isPremium: boolean;
}

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
  secondaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  secondaryButtonValue: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
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
  premiumCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  premiumCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  premiumCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    flex: 1,
  },
  premiumCardBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  premiumCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  premiumCardPeriod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  premiumUpgradeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  premiumUpgradeButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  freePlanCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  freePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  freePlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  freePlanBadge: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freePlanBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  freePlanSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  const { isSubscribed } = useSubscription();
  const { formatWeight, formatHeight } = useSettings();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const loadProfile = useCallback(async () => {
    console.log('ProfileScreen: Loading profile data');
    try {
      setLoading(true);

      const guestStatus = await AsyncStorage.getItem('isGuestUser');
      const guestModeStatus = await AsyncStorage.getItem('guest_mode');
      const isGuestUser = guestStatus === 'true' || guestModeStatus === 'true';
      setIsGuest(isGuestUser);
      console.log('ProfileScreen: Guest status:', { isGuestUser, guestStatus, guestModeStatus });

      let parsedProfile: any = null;
      const localProfile = await AsyncStorage.getItem('fitnessProfile');
      if (localProfile) {
        parsedProfile = JSON.parse(localProfile);
        console.log('ProfileScreen: Loaded profile from AsyncStorage:', parsedProfile);
        setProfile(parsedProfile);
      }

      if (user && !isGuestUser) {
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
            dietPreference: backendProfile.diet_preference || parsedProfile?.dietPreference,
          };
          
          console.log('ProfileScreen: Mapped profile:', mappedProfile);
          setProfile(mappedProfile);
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(mappedProfile));
        } catch (error) {
          // Silently fall back to local profile — backend errors are non-fatal here
          console.log('ProfileScreen: Backend profile unavailable, using local data');
        }

        // Fetch subscription status
        try {
          const subStatus = await authenticatedGet<SubscriptionStatus>('/api/payments/subscription-status');
          console.log('ProfileScreen: Subscription status:', subStatus);
          setSubscriptionStatus(subStatus);
        } catch (error) {
          console.log('ProfileScreen: Could not fetch subscription status');
        }
      } else {
        console.log('ProfileScreen: Guest user — skipping backend fetch, using local data only');
      }
    } catch (error) {
      console.log('ProfileScreen: Error loading profile (non-fatal):', error);
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
    // Guard: only call signOut if there is an authenticated user
    if (!user) {
      console.log('ProfileScreen: No authenticated user — skipping signOut, redirecting to auth');
      router.replace('/auth');
      return;
    }
    try {
      console.log('ProfileScreen: Signing out user:', user.id);
      await signOut();
      console.log('ProfileScreen: Sign out successful, redirecting to auth');
      router.replace('/auth');
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

  const { t } = useTranslation();

  // Map goal values from onboarding to display text
  const goalMap: Record<string, string> = {
    'strength': t('profile.goalStrength'),
    'muscle': t('profile.goalMuscle'),
    'endurance': t('profile.goalEndurance'),
    'weight-loss': t('profile.goalWeightLoss'),
    'weight_loss': t('profile.goalWeightLoss'),
    'weightLoss': t('profile.goalWeightLoss'),
    'muscleGain': t('profile.goalMuscle'),
    'muscle_gain': t('profile.goalMuscle'),
    'maintenance': t('profile.goalMaintenance'),
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const genderDisplay = profile?.gender === 'male' ? t('profile.genderMale') : profile?.gender === 'female' ? t('profile.genderFemale') : profile?.gender === 'other' ? t('profile.genderOther') : t('common.notSet');
  
  // Experience level with proper fallback
  const experienceLevel = profile?.experienceLevel || 'beginner';
  const experienceDisplay = experienceLevel === 'beginner' ? t('profile.expBeginner') : 
                           experienceLevel === 'intermediate' ? t('profile.expIntermediate') : 
                           experienceLevel === 'advanced' ? t('profile.expAdvanced') : t('profile.expBeginner');
  
  const goalDisplay = profile?.goal ? (goalMap[profile.goal] || profile.goal) : t('common.notSet');
  
  // Training days can come from trainingDays, trainingFrequency, or selectedDays
  const trainingDaysCount = profile?.trainingDays || profile?.trainingFrequency || (profile as any)?.selectedDays?.length || 0;
  const trainingDaysDisplay = trainingDaysCount > 0 ? `${trainingDaysCount} ${t('common.daysPerWeek', { count: trainingDaysCount }).replace(/^\d+ /, '')}` : t('common.notSet');
  
  const weightDisplay = profile?.weight ? formatWeight(profile.weight) : t('common.notSet');
  const heightDisplay = profile?.height ? formatHeight(profile.height) : t('common.notSet');
  const ageDisplay = profile?.age ? `${profile.age} ${t('common.years', { count: profile.age }).replace(/^\d+ /, '')}` : t('common.notSet');
  const bmiRaw = profile?.weight && profile?.height ? calculateBMI(profile.weight, profile.height) : 0;
  const bmiDisplay = bmiRaw > 0 ? bmiRaw.toFixed(1) : t('common.notSet');

  const nameDisplay = profile?.name || user?.name || t('common.notSet');
  const emailDisplay = user?.email || t('common.notSet');
  const logoutTitle = isGuest ? t('profile.exitGuestTitle') : t('profile.logoutTitle');
  const logoutMessage = isGuest ? t('profile.exitGuestMessage') : t('profile.logoutMessage');
  const logoutConfirmText = isGuest ? t('profile.exit') : t('profile.signOut');
  const signOutButtonText = isGuest ? t('profile.exitGuestMode') : t('profile.signOut');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
        </View>

        {(isGuest || !user) && (
          <View style={styles.guestBanner}>
            <IconSymbol
              ios_icon_name="person.crop.circle.badge.exclamationmark"
              android_material_icon_name="person-add"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.guestBannerTitle}>{t('profile.guestTitle')}</Text>
            <Text style={styles.guestBannerText}>
              {t('profile.guestText')}
            </Text>
            <TouchableOpacity
              style={styles.guestBannerButton}
              onPress={handleCreateAccount}
            >
              <Text style={styles.guestBannerButtonText}>{t('profile.signIn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Premium / Subscription Status */}
        {!isGuest && user && (
          isSubscribed ? (
            <View style={styles.premiumCard}>
              <View style={styles.premiumCardHeader}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={28}
                  color="#FFD700"
                />
                <Text style={styles.premiumCardTitle}>{t('profile.proPlanActive')}</Text>
                <View style={styles.premiumCardBadge}>
                  <Text style={styles.premiumCardBadgeText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.premiumCardSubtitle}>
                {t('profile.proPlanSubtitle')}
              </Text>
              <TouchableOpacity
                style={styles.premiumUpgradeButton}
                onPress={() => {
                  console.log('ProfileScreen: User tapped Manage Subscription');
                  router.push('/paywall');
                }}
              >
                <Text style={styles.premiumUpgradeButtonText}>{t('profile.manageSubscription')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.freePlanCard}>
              <View style={styles.freePlanHeader}>
                <IconSymbol
                  ios_icon_name="star"
                  android_material_icon_name="star-border"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.freePlanTitle}>{t('profile.freePlan')}</Text>
                <View style={styles.freePlanBadge}>
                  <Text style={styles.freePlanBadgeText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.freePlanSubtitle}>
                {t('profile.freePlanSubtitle')}
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  console.log('ProfileScreen: User tapped Go Pro button');
                  router.push('/paywall');
                }}
              >
                <Text style={styles.upgradeButtonText}>{t('profile.goPro')}</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.name')}</Text>
              <Text style={styles.value}>{nameDisplay}</Text>
            </View>
            {!isGuest && (
              <View style={styles.row}>
                <Text style={styles.label}>{t('profile.email')}</Text>
                <Text style={styles.value}>{emailDisplay}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.gender')}</Text>
              <Text style={styles.value}>{genderDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.age')}</Text>
              <Text style={styles.value}>{ageDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.weight')}</Text>
              <Text style={styles.value}>{weightDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.height')}</Text>
              <Text style={styles.value}>{heightDisplay}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>{t('profile.bmi')}</Text>
              <Text style={styles.value}>{bmiDisplay}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.fitnessProfile')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.experienceLevel')}</Text>
              <Text style={styles.value}>{experienceDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.goal')}</Text>
              <Text style={styles.value}>{goalDisplay}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>{t('profile.trainingDays')}</Text>
              <Text style={styles.value}>{trainingDaysDisplay}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.actions')}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.log('ProfileScreen: User tapped Edit Profile button');
              router.push('/edit-profile');
            }}
          >
            <Text style={styles.buttonText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              console.log('ProfileScreen: User tapped Settings button');
              router.push('/settings');
            }}
          >
            <View style={styles.secondaryButtonInner}>
              <Text style={styles.secondaryButtonText}>{t('profile.settings')}</Text>
              <IconSymbol
                ios_icon_name="gearshape"
                android_material_icon_name="settings"
                size={16}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetOnboarding}
          >
            <Text style={styles.buttonText}>{t('profile.resetOnboarding')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>
              {signOutButtonText}
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
            <Text style={styles.modalTitle}>{logoutTitle}</Text>
            <Text style={styles.modalMessage}>{logoutMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  console.log('ProfileScreen: User cancelled logout');
                  setShowLogoutModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {logoutConfirmText}
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
            <Text style={styles.modalTitle}>{t('profile.resetTitle')}</Text>
            <Text style={styles.modalMessage}>{t('profile.resetMessage')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  console.log('ProfileScreen: User cancelled reset onboarding');
                  setShowResetModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmResetOnboarding}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {t('profile.reset')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
