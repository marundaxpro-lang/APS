
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import ParticleBackground from '@/components/ParticleBackground';
import { FitnessProfile } from '@/types/fitness';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import { generateWorkoutSplit } from '@/data/workouts';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

export default function EditProfileScreen() {
  const router = useRouter();
  const { isMetric, formatWeightValue, formatHeightValue, lbsToKg, ftInToCm } = useSettings();

  const [profile, setProfile] = useState<Partial<FitnessProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Display-unit input state (always converted from stored metric on load)
  const [weightInput, setWeightInput] = useState('');
  const [heightCmInput, setHeightCmInput] = useState('');
  const [heightFtInput, setHeightFtInput] = useState('');
  const [heightInInput, setHeightInInput] = useState('');

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        const parsed: Partial<FitnessProfile> = JSON.parse(stored);
        setProfile(parsed);

        // Populate display-unit inputs from stored metric values
        if (parsed.weight) {
          const wVal = formatWeightValue(parsed.weight);
          setWeightInput(wVal > 0 ? String(wVal) : '');
        }
        if (parsed.height) {
          const hVal = formatHeightValue(parsed.height);
          if (isMetric) {
            setHeightCmInput(hVal.primary > 0 ? String(hVal.primary) : '');
          } else {
            setHeightFtInput(hVal.primary > 0 ? String(hVal.primary) : '');
            setHeightInInput(hVal.secondary !== undefined ? String(hVal.secondary) : '0');
          }
        }
      }
    } catch (error) {
      console.error('[EditProfile] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert display inputs back to metric before saving
  const getMetricWeight = (): number => {
    const raw = parseFloat(weightInput) || 0;
    if (raw <= 0) return profile.weight || 0;
    if (isMetric) return raw;
    return lbsToKg(raw);
  };

  const getMetricHeight = (): number => {
    if (isMetric) {
      return parseFloat(heightCmInput) || profile.height || 0;
    }
    const ft = parseFloat(heightFtInput) || 0;
    const inches = parseFloat(heightInInput) || 0;
    if (ft <= 0 && inches <= 0) return profile.height || 0;
    return ftInToCm(ft, inches);
  };

  const saveProfile = async () => {
    console.log('[EditProfile] User tapped Save button');

    const metricWeight = getMetricWeight();
    const metricHeight = getMetricHeight();

    console.log('[EditProfile] Converted to metric — weight:', metricWeight, 'kg, height:', metricHeight, 'cm');

    const updatedProfile: Partial<FitnessProfile> = {
      ...profile,
      weight: metricWeight,
      height: metricHeight,
    };

    try {
      console.log('[EditProfile] Saving profile:', updatedProfile);

      // Save to local storage first
      await AsyncStorage.setItem('fitnessProfile', JSON.stringify(updatedProfile));

      // Regenerate weekly workout plan with new training days
      if (updatedProfile.trainingDays && updatedProfile.equipmentType && updatedProfile.focusAreas && updatedProfile.goal) {
        console.log('[EditProfile] Regenerating weekly workout plan...');
        const newWorkoutSplit = generateWorkoutSplit(updatedProfile as FitnessProfile);
        console.log('[EditProfile] New workout split generated:', newWorkoutSplit);
      }

      try {
        // Calculate activity level based on training days
        const activityLevel = (updatedProfile.trainingDays || 3) >= 5 ? 'active' :
                             (updatedProfile.trainingDays || 3) >= 3 ? 'moderate' : 'light';

        // Save complete profile to backend with ALL fields (always metric)
        const profilePayload = {
          experienceLevel: 'beginner',
          goal: updatedProfile.goal || 'muscle',
          trainingFrequency: updatedProfile.trainingDays || 3,
          gender: updatedProfile.gender || 'male',
          age: updatedProfile.age || 25,
          weight: metricWeight,   // always kg
          height: metricHeight,   // always cm
          activityLevel,
          focusAreas: updatedProfile.focusAreas || [],
          equipmentType: updatedProfile.equipmentType || 'gym',
          name: updatedProfile.name || undefined,
        };

        console.log('[EditProfile] Saving complete profile payload (metric):', profilePayload);
        await authenticatedPost('/api/fitness-profile', profilePayload);
        console.log('[EditProfile] Complete fitness profile saved to backend');

        // Recalculate calorie goal if weight/height/age changed
        if (metricWeight && metricHeight && updatedProfile.age && updatedProfile.gender) {
          console.log('[EditProfile] Recalculating caloric goal based on updated profile...');

          let backendGoal: 'weight_loss' | 'maintenance' | 'weight_gain' = 'maintenance';
          if (updatedProfile.goal === 'weight-loss') {
            backendGoal = 'weight_loss';
          } else if (updatedProfile.goal === 'muscle' || updatedProfile.goal === 'strength') {
            backendGoal = 'weight_gain';
          }

          const caloricGoalResponse = await authenticatedPost('/api/dashboard/calculate-caloric-goal', {
            age: updatedProfile.age,
            gender: updatedProfile.gender,
            weight: metricWeight,   // always kg
            height: metricHeight,   // always cm
            activityLevel,
            goal: backendGoal,
          });

          console.log('[EditProfile] Caloric goal recalculated:', caloricGoalResponse?.dailyCalorieGoal || 'unknown');

          // Update local profile with new caloric goal
          if (caloricGoalResponse?.dailyCalorieGoal) {
            const withCalories = {
              ...updatedProfile,
              caloricGoal: caloricGoalResponse.dailyCalorieGoal,
            };
            await AsyncStorage.setItem('fitnessProfile', JSON.stringify(withCalories));
            setProfile(withCalories);
          }
        }

        console.log('[EditProfile] Profile, caloric goal, and workout plan updated successfully');
      } catch (error) {
        console.error('[EditProfile] Error saving to backend:', error);
      }

      setProfile(updatedProfile);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[EditProfile] Error saving profile:', error);
      setShowErrorModal(true);
    }
  };

  const { t } = useTranslation();
  const weightLabel = isMetric ? t('editProfile.weightKg') : t('editProfile.weightLbs');
  const weightPlaceholder = isMetric ? '70' : '154';

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('editProfile.title'),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ParticleBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('editProfile.personal')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('editProfile.name')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('editProfile.namePlaceholder')}
              placeholderTextColor={colors.grey}
              value={profile.name || ''}
              onChangeText={(text) => {
                console.log('[EditProfile] Name changed:', text);
                setProfile({ ...profile, name: text });
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('editProfile.age')}</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              placeholderTextColor={colors.grey}
              keyboardType="numeric"
              value={profile.age?.toString() || ''}
              onChangeText={(text) => {
                console.log('[EditProfile] Age changed:', text);
                setProfile({ ...profile, age: parseInt(text) || 0 });
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('editProfile.bodyStats')}</Text>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              {t('editProfile.bodyStatsInfo')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{weightLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={weightPlaceholder}
              placeholderTextColor={colors.grey}
              keyboardType="numeric"
              value={weightInput}
              onChangeText={(text) => {
                console.log('[EditProfile] Weight input changed:', text, isMetric ? 'kg' : 'lbs');
                setWeightInput(text);
              }}
            />
          </View>

          {isMetric ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('editProfile.heightCm')}</Text>
              <TextInput
                style={styles.input}
                placeholder="175"
                placeholderTextColor={colors.grey}
                keyboardType="numeric"
                value={heightCmInput}
                onChangeText={(text) => {
                  console.log('[EditProfile] Height cm changed:', text);
                  setHeightCmInput(text);
                }}
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('editProfile.height')}</Text>
              <View style={styles.ftInRow}>
                <View style={styles.ftInField}>
                  <TextInput
                    style={[styles.input, styles.ftInInput]}
                    placeholder="5"
                    placeholderTextColor={colors.grey}
                    keyboardType="numeric"
                    value={heightFtInput}
                    onChangeText={(text) => {
                      console.log('[EditProfile] Height ft changed:', text);
                      setHeightFtInput(text);
                    }}
                  />
                  <Text style={styles.ftInLabel}>ft</Text>
                </View>
                <View style={styles.ftInField}>
                  <TextInput
                    style={[styles.input, styles.ftInInput]}
                    placeholder="10"
                    placeholderTextColor={colors.grey}
                    keyboardType="numeric"
                    value={heightInInput}
                    onChangeText={(text) => {
                      console.log('[EditProfile] Height in changed:', text);
                      setHeightInInput(text);
                    }}
                  />
                  <Text style={styles.ftInLabel}>in</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('editProfile.trainingFrequency')}</Text>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              {t('editProfile.trainingFrequencyInfo')}
            </Text>
          </View>

          <View style={styles.frequencyGrid}>
            {[2, 3, 4, 5, 6].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.frequencyCard,
                  profile.trainingDays === days && styles.frequencyCardSelected,
                ]}
                onPress={() => {
                  console.log('[EditProfile] Training days selected:', days);
                  setProfile({ ...profile, trainingDays: days });
                }}
              >
                <Text style={[
                  styles.frequencyNumber,
                  profile.trainingDays === days && styles.frequencyTextSelected,
                ]}>
                  {days}
                </Text>
                <Text style={[
                  styles.frequencyLabel,
                  profile.trainingDays === days && styles.frequencyTextSelected,
                ]}>
                  {t('editProfile.days')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
        type="success"
        title={t('editProfile.savedTitle')}
        message={t('editProfile.savedMessage')}
        confirmText={t('common.ok')}
      />

      <Modal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title={t('editProfile.errorTitle')}
        message={t('editProfile.errorMessage')}
        confirmText={t('common.ok')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  ftInRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ftInField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ftInInput: {
    flex: 1,
  },
  ftInLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 20,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  frequencyCard: {
    width: 70,
    height: 80,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  frequencyLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  frequencyTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
  },
});
