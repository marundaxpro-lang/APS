
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessProfile } from '@/types/fitness';
import ParticleBackground from '@/components/ParticleBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedPost, authenticatedPut } from '@/utils/api';
import { resetHabitsForProfile } from '@/utils/habitStore';
import { useAuth } from '@/contexts/AuthContext';

const { height } = Dimensions.get('window');

const DAYS_OF_WEEK = [
  { id: 1, short: 'Mon', full: 'Monday' },
  { id: 2, short: 'Tue', full: 'Tuesday' },
  { id: 3, short: 'Wed', full: 'Wednesday' },
  { id: 4, short: 'Thu', full: 'Thursday' },
  { id: 5, short: 'Fri', full: 'Friday' },
  { id: 6, short: 'Sat', full: 'Saturday' },
  { id: 0, short: 'Sun', full: 'Sunday' },
];

// Mifflin-St Jeor Equation for BMR calculation
const calculateCaloricGoal = (
  gender: 'male' | 'female' | 'prefer-not-to-say',
  weight: number,
  height: number,
  age: number,
  trainingFrequency: number,
  goal: string
) => {
  console.log('[Onboarding] Calculating caloric goal with:', {
    gender,
    weight,
    height,
    age,
    trainingFrequency,
    goal,
  });

  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else if (gender === 'female') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  } else {
    // Use average for prefer-not-to-say
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 78;
  }

  console.log('[Onboarding] BMR calculated:', bmr);

  // Activity Level Multiplier based on training frequency
  let activityFactor: number;
  if (trainingFrequency <= 2) {
    activityFactor = 1.2;
  } else if (trainingFrequency <= 4) {
    activityFactor = 1.375;
  } else if (trainingFrequency <= 6) {
    activityFactor = 1.55;
  } else {
    activityFactor = 1.725;
  }

  console.log('[Onboarding] Activity factor:', activityFactor);

  // Calculate TDEE
  const tdee = bmr * activityFactor;
  console.log('[Onboarding] TDEE calculated:', tdee);

  // Adjust for goal
  let caloricGoal: number;
  if (goal === 'lose-fat' || goal === 'weight-loss') {
    caloricGoal = tdee * 0.85;
  } else if (goal === 'build-muscle' || goal === 'muscle') {
    caloricGoal = tdee * 1.10;
  } else if (goal === 'get-stronger' || goal === 'strength') {
    caloricGoal = tdee * 1.05;
  } else {
    caloricGoal = tdee;
  }

  console.log('[Onboarding] Final caloric goal:', Math.round(caloricGoal));

  // Calculate macro split
  const proteinCalories = caloricGoal * 0.30;
  const carbCalories = caloricGoal * 0.45;
  const fatCalories = caloricGoal * 0.25;

  return {
    caloricGoal: Math.round(caloricGoal),
    protein: Math.round(proteinCalories / 4),
    carbs: Math.round(carbCalories / 4),
    fat: Math.round(fatCalories / 9),
  };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingCompleted } = useAuth();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<FitnessProfile & { 
    selectedDays?: number[]; 
    motivation?: string; 
    selectedMotivationChips?: string[];
    primaryGoal?: string;
    secondaryGoal?: string;
    sessionLength?: string;
    homeEquipmentDetails?: string[];
    trainingConfidence?: string;
    trainingExperience?: string;
    activityLevelOutsideTraining?: string;
    nutritionPreference?: string;
  }>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('fitnessProfile').then((data) => {
      if (data) router.replace('/(tabs)/(home)');
    });
  }, [router]);

  const saveProfile = async () => {
    console.log('[Onboarding] User tapped Get Started');
    
    const trainingDaysCount = profile.selectedDays?.length || 3;
    const age = profile.age || 25;
    const gender = profile.gender || 'male';
    const weight = profile.weight || 70;
    const height = profile.height || 175;
    const goal = profile.primaryGoal || 'build-muscle';
    
    const nutritionGoals = calculateCaloricGoal(
      gender as 'male' | 'female' | 'prefer-not-to-say',
      weight,
      height,
      age,
      trainingDaysCount,
      goal
    );
    
    console.log('[Onboarding] Calculated nutrition goals:', nutritionGoals);
    
    const finalProfile = {
      ...profile,
      name: profile.name?.trim() || undefined,
      age,
      gender,
      weight,
      height,
      goal,
      experienceLevel: 'beginner' as const,
      trainingDays: trainingDaysCount,
      trainingFrequency: trainingDaysCount,
      caloricGoal: nutritionGoals.caloricGoal,
      protein: nutritionGoals.protein,
      carbs: nutritionGoals.carbs,
      fat: nutritionGoals.fat,
    };
    
    console.log('[Onboarding] Final profile before saving:', finalProfile);
    await AsyncStorage.setItem('fitnessProfile', JSON.stringify(finalProfile));

    // Personalize habits based on onboarding profile
    console.log('[Onboarding] Resetting habits for profile goal:', finalProfile.goal);
    await resetHabitsForProfile({
      primaryGoal: finalProfile.goal,
      nutritionPreference: profile.nutritionPreference,
      activityLevelOutsideTraining: profile.activityLevelOutsideTraining,
    });
    
    // Save motivation separately for later use
    if (profile.motivation || profile.selectedMotivationChips) {
      const motivationData = {
        text: profile.motivation || '',
        chips: profile.selectedMotivationChips || [],
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('userMotivation', JSON.stringify(motivationData));
      console.log('[Onboarding] Motivation saved for future use:', motivationData);
    }
    
    try {
      const activityLevelMap: Record<string, string> = {
        'regular': 'light',
        'moderate': 'moderate',
        'very-active': 'active',
      };
      const activityLevel = activityLevelMap[profile.activityLevelOutsideTraining || 'moderate'] || 'moderate';
      
      console.log('[Onboarding] Saving complete fitness profile to backend...');
      const profilePayload = {
        experienceLevel: 'beginner',
        goal: goal,
        trainingFrequency: trainingDaysCount,
        gender: gender,
        age: age,
        weight: weight,
        height: height,
        activityLevel,
        focusAreas: finalProfile.focusAreas || [],
        equipmentType: finalProfile.equipmentType || 'gym',
        name: finalProfile.name || null,
      };
      
      console.log('[Onboarding] Profile payload being sent to backend:', profilePayload);
      const savedProfile = await authenticatedPost('/api/fitness-profile', profilePayload);
      console.log('[Onboarding] Backend response:', savedProfile);
      console.log('[Onboarding] Complete fitness profile saved successfully');
      
      // Map frontend goal values to backend expected values
      let backendGoal: 'weight_loss' | 'muscle_gain' | 'strength' | 'endurance' = 'muscle_gain';
      if (goal === 'lose-fat' || goal === 'weight-loss') {
        backendGoal = 'weight_loss';
      } else if (goal === 'build-muscle' || goal === 'muscle') {
        backendGoal = 'muscle_gain';
      } else if (goal === 'get-stronger' || goal === 'strength') {
        backendGoal = 'strength';
      } else if (goal === 'improve-endurance' || goal === 'endurance') {
        backendGoal = 'endurance';
      }
      
      console.log('[Onboarding] Calculating caloric goal on backend with:', {
        age,
        gender,
        weight,
        height,
        activityLevel,
        goal: backendGoal,
      });
      
      try {
        const caloricGoalResponse = await authenticatedPost('/api/dashboard/calculate-caloric-goal', {
          age,
          gender,
          weight,
          height,
          activityLevel,
          goal: backendGoal,
        });
        
        console.log('[Onboarding] Backend caloric goal calculated:', caloricGoalResponse);
        
        if (caloricGoalResponse?.dailyCalorieGoal) {
          const updatedProfile = {
            ...finalProfile,
            caloricGoal: caloricGoalResponse.dailyCalorieGoal,
            protein: caloricGoalResponse.proteinGoal || nutritionGoals.protein,
            carbs: caloricGoalResponse.carbsGoal || nutritionGoals.carbs,
            fat: caloricGoalResponse.fatGoal || nutritionGoals.fat,
          };
          await AsyncStorage.setItem('fitnessProfile', JSON.stringify(updatedProfile));
          console.log('[Onboarding] Updated profile with backend caloric goal:', updatedProfile.caloricGoal);
        }
      } catch (caloricError) {
        console.error('[Onboarding] Error calculating caloric goal on backend:', caloricError);
      }

      // ── Call PUT /api/user/onboarding to mark onboarding complete ──
      try {
        console.log('[Onboarding] Calling PUT /api/user/onboarding to mark onboarding complete');
        const onboardingPayload = {
          name: finalProfile.name || null,
          age,
          gender,
          weight,
          height,
          goal: backendGoal,
          experienceLevel: profile.trainingExperience || 'beginner',
          trainingFrequency: trainingDaysCount,
          activityLevel,
          equipmentType: finalProfile.equipmentType || 'gym',
          focusAreas: finalProfile.focusAreas || [],
          sessionLength: profile.sessionLength || '45-60',
          nutritionPreference: profile.nutritionPreference || 'balanced',
          motivation: profile.motivation || '',
          motivationChips: profile.selectedMotivationChips || [],
          trainingDays: profile.selectedDays || [],
          caloricGoal: nutritionGoals.caloricGoal,
          protein: nutritionGoals.protein,
          carbs: nutritionGoals.carbs,
          fat: nutritionGoals.fat,
        };
        console.log('[Onboarding] PUT /api/user/onboarding payload:', onboardingPayload);
        await authenticatedPut('/api/user/onboarding', onboardingPayload);
        console.log('[Onboarding] Onboarding marked complete on backend');
        // Update AuthContext so navigation guard knows onboarding is done
        setOnboardingCompleted(true);
      } catch (onboardingErr) {
        console.warn('[Onboarding] Could not call PUT /api/user/onboarding:', onboardingErr);
        // Still mark locally so the app can proceed
        setOnboardingCompleted(true);
      }
      
      console.log('[Onboarding] Profile setup complete - daily calorie goal:', nutritionGoals.caloricGoal);
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace('/(tabs)/(home)');
      }, 2000);
    } catch (error) {
      console.error('[Onboarding] Error saving profile to backend:', error);
      setOnboardingCompleted(true);
      router.replace('/(tabs)/(home)');
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) {
      const hasChips = profile.selectedMotivationChips && profile.selectedMotivationChips.length > 0;
      const hasText = profile.motivation && profile.motivation.trim().length > 0;
      return hasChips || hasText;
    }
    if (step === 3) return profile.primaryGoal;
    if (step === 4) return profile.selectedDays && profile.selectedDays.length > 0;
    if (step === 5) return profile.sessionLength;
    if (step === 6) return true;
    if (step === 7) return profile.equipmentType;
    if (step === 8) {
      if (profile.equipmentType === 'home' && (!profile.homeEquipmentDetails || profile.homeEquipmentDetails.length === 0)) {
        return false;
      }
      return profile.trainingConfidence;
    }
    if (step === 9) {
      if (!profile.gender || !profile.age || !profile.weight || !profile.height) return false;
      const age = profile.age;
      if (age < 13 || age > 100) return false;
      if (weightUnit === 'kg') {
        if (profile.weight < 30 || profile.weight > 300) return false;
      } else {
        if (profile.weight < 66 || profile.weight > 660) return false;
      }
      if (heightUnit === 'cm') {
        if (profile.height < 100 || profile.height > 250) return false;
      } else {
        const ft = parseInt(heightFt) || 0;
        const inches = parseInt(heightIn) || 0;
        if (ft < 3 || ft > 8 || inches < 0 || inches > 11) return false;
      }
      return true;
    }
    if (step === 10) {
      return profile.trainingExperience && profile.activityLevelOutsideTraining;
    }
    if (step === 11) {
      return profile.nutritionPreference;
    }
    return false;
  };

  const getHelperText = () => {
    const daysCount = profile.selectedDays?.length || 0;
    const sessionLength = profile.sessionLength;
    const focusCount = profile.focusAreas?.length || 0;
    const equipment = profile.equipmentType;

    if (step === 4 && daysCount > 0) {
      if (daysCount <= 2) {
        return '💡 Based on 2 available days, we\'ll likely build a 2-day full-body split. You can adjust later.';
      } else if (daysCount === 3) {
        return '💡 Based on 3 available days, we\'ll likely build a 3-day full-body or upper/lower rotation. You can adjust later.';
      } else if (daysCount === 4) {
        return '💡 Based on 4 available days, we\'ll likely build an upper/lower or push/pull split. You can adjust later.';
      } else {
        return '💡 Based on 5+ available days, we\'ll likely build a targeted body-part split. You can adjust later.';
      }
    }

    if (step === 5 && sessionLength) {
      const sessionText = sessionLength === '20-30' ? '20-30 minute' :
                         sessionLength === '30-45' ? '30-45 minute' :
                         sessionLength === '45-60' ? '45-60 minute' : '60+ minute';
      return `💡 Your ${daysCount}-day plan with ${sessionText} sessions will be optimized for maximum efficiency.`;
    }

    if (step === 6 && focusCount > 0 && daysCount > 0) {
      return `💡 We'll give these areas extra attention without neglecting full-body balance.`;
    }

    if (step === 7 && equipment) {
      if (equipment === 'gym') {
        return '💡 Full gym access unlocks advanced training techniques and progressive overload strategies.';
      } else if (equipment === 'home') {
        return '💡 Home equipment is perfect! We\'ll design effective workouts with what you have available.';
      } else {
        return '💡 Bodyweight training builds incredible strength and control. No equipment needed, just dedication.';
      }
    }

    return '';
  };

  const helperText = getHelperText();

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your name?</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll use this to personalize your experience.</Text>

      <View style={styles.nameInputContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Enter your name"
          placeholderTextColor={colors.grey}
          value={profile.name || ''}
          onChangeText={(text) => {
            console.log('[Onboarding] Name entered:', text);
            setProfile({ ...profile, name: text });
          }}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
        />
      </View>
    </View>
  );

  const renderStep2 = () => {
    const motivationChips = [
      'Big life change',
      'Tired of starting over',
      'Event coming up',
      'Finally ready',
      "Doctor's advice",
      'Proving something to myself',
    ];

    const selectedChips = profile.selectedMotivationChips || [];

    const toggleChip = (chip: string) => {
      console.log('[Onboarding] Motivation chip toggled:', chip);
      const current = selectedChips;
      const updated = current.includes(chip)
        ? current.filter((c) => c !== chip)
        : [...current, chip];
      setProfile({ ...profile, selectedMotivationChips: updated });
    };

    return (
      <View style={styles.stepContainer}>
        <View style={styles.emotionalHeader}>
          <IconSymbol
            ios_icon_name="heart.fill"
            android_material_icon_name="favorite"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.emotionalTitle}>Why now?</Text>
        </View>
        <Text style={styles.emotionalSubtitle}>
          What&apos;s driving you right now?
        </Text>
        
        <View style={styles.motivationChipsContainer}>
          {motivationChips.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.motivationChip,
                selectedChips.includes(chip) && styles.motivationChipSelected,
              ]}
              onPress={() => toggleChip(chip)}
            >
              <Text style={[
                styles.motivationChipText,
                selectedChips.includes(chip) && styles.motivationChipTextSelected
              ]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.motivationContainer}>
          <TextInput
            style={styles.motivationInput}
            placeholder="Or write your own reason..."
            placeholderTextColor={colors.grey}
            value={profile.motivation || ''}
            onChangeText={(text) => {
              console.log('[Onboarding] Custom motivation entered:', text);
              setProfile({ ...profile, motivation: text });
            }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        </View>
        
        <View style={styles.inspirationBox}>
          <Text style={styles.inspirationText}>
            We&apos;ll remind you of this on tough days.
          </Text>
        </View>
      </View>
    );
  };

  const renderStep3 = () => {
    const goals = [
      { 
        id: 'lose-fat', 
        label: 'Lose Weight', 
        description: 'Fat loss and body composition',
        iosIcon: 'flame.fill', 
        androidIcon: 'local-fire-department' 
      },
      { 
        id: 'build-muscle', 
        label: 'Build Muscle', 
        description: 'Hypertrophy and size',
        iosIcon: 'figure.strengthtraining.traditional', 
        androidIcon: 'fitness-center' 
      },
      { 
        id: 'improve-endurance', 
        label: 'Improve Endurance', 
        description: 'Stamina and conditioning',
        iosIcon: 'figure.run', 
        androidIcon: 'directions-run' 
      },
      { 
        id: 'increase-flexibility', 
        label: 'Increase Flexibility', 
        description: 'Mobility and range of motion',
        iosIcon: 'figure.flexibility', 
        androidIcon: 'self-improvement' 
      },
      { 
        id: 'get-stronger', 
        label: 'Get Stronger', 
        description: 'Strength and power',
        iosIcon: 'bolt.fill', 
        androidIcon: 'flash-on' 
      },
    ];

    const primaryGoal = profile.primaryGoal;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What&apos;s your primary goal?</Text>

        <View style={styles.goalsContainer}>
          {goals.map((goal) => {
            const isSelected = primaryGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCardEnhanced,
                  isSelected && styles.goalCardSelected,
                ]}
                onPress={() => {
                  console.log('[Onboarding] Primary goal selected:', goal.id);
                  setProfile({ ...profile, primaryGoal: goal.id });
                }}
                activeOpacity={0.8}
              >
                <IconSymbol
                  ios_icon_name={goal.iosIcon}
                  android_material_icon_name={goal.androidIcon}
                  size={32}
                  color={isSelected ? '#00D4AA' : colors.grey}
                />
                <View style={styles.goalTextContainer}>
                  <Text style={[
                    styles.goalLabel,
                    isSelected && styles.goalLabelSelected,
                  ]}>
                    {goal.label}
                  </Text>
                  <Text style={styles.goalDescription}>
                    {goal.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.goalCheckmark}>
                    <Text style={styles.goalCheckmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStep4 = () => {
    const selectedDays = profile.selectedDays || [];
    
    const toggleDay = (dayId: number) => {
      console.log('[Onboarding] Day toggled:', dayId);
      const current = selectedDays;
      const updated = current.includes(dayId)
        ? current.filter((d) => d !== dayId)
        : [...current, dayId].sort((a, b) => a - b);
      setProfile({ ...profile, selectedDays: updated });
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>When can you train?</Text>
        <Text style={styles.stepSubtitle}>Select the days that work for your schedule</Text>
        
        <View style={styles.daysGrid}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day.id);
            return (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayChip,
                  isSelected && styles.selectedDayChip,
                ]}
                onPress={() => toggleDay(day.id)}
              >
                <Text style={[
                  styles.dayShortText,
                  isSelected && styles.selectedDayText
                ]}>
                  {day.short}
                </Text>
                <Text style={[
                  styles.dayFullText,
                  isSelected && styles.selectedDayText
                ]}>
                  {day.full}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {selectedDays.length > 0 && (
          <View style={styles.selectionSummary}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.selectionText}>
              {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
            </Text>
          </View>
        )}

        {helperText && (
          <View style={styles.dynamicHelperBox}>
            <Text style={styles.dynamicHelperText}>{helperText}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStep5 = () => {
    const sessionLengths = [
      { id: '20-30', label: '20-30 min', description: 'Quick and efficient' },
      { id: '30-45', label: '30-45 min', description: 'Balanced approach' },
      { id: '45-60', label: '45-60 min', description: 'Standard workout' },
      { id: '60+', label: '60+ min', description: 'Extended training' },
    ];

    const daysCount = profile.selectedDays?.length || 0;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>How much time do you realistically have per session?</Text>
        <Text style={styles.stepSubtitle}>This helps us design workouts that fit your schedule</Text>
        
        <View style={styles.sessionLengthContainer}>
          {sessionLengths.map((length) => (
            <TouchableOpacity
              key={length.id}
              style={[
                styles.sessionLengthCard,
                profile.sessionLength === length.id && styles.selectedCard,
              ]}
              onPress={() => {
                console.log('[Onboarding] Session length selected:', length.id);
                setProfile({ ...profile, sessionLength: length.id });
              }}
            >
              <View style={styles.sessionLengthContent}>
                <Text style={[
                  styles.sessionLengthLabel,
                  profile.sessionLength === length.id && styles.selectedText
                ]}>
                  {length.label}
                </Text>
                <Text style={styles.sessionLengthDescription}>
                  {length.description}
                </Text>
              </View>
              {profile.sessionLength === length.id && (
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={28}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {profile.sessionLength && (
          <View style={styles.sessionInfoBox}>
            <Text style={styles.sessionInfoText}>
              A {daysCount}-day plan with {profile.sessionLength === '20-30' ? '20-30 minute' : profile.sessionLength === '30-45' ? '30-45 minute' : profile.sessionLength === '45-60' ? '45-60 minute' : '60+ minute'} sessions requires different exercise selection and volume than longer workouts.
            </Text>
          </View>
        )}

        {helperText && (
          <View style={styles.dynamicHelperBox}>
            <Text style={styles.dynamicHelperText}>{helperText}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStep6 = () => {
    const areas = [
      { id: 'upper-body', label: 'Upper Body', iosIcon: 'figure.arms.open', androidIcon: 'accessibility' },
      { id: 'lower-body', label: 'Lower Body', iosIcon: 'figure.walk', androidIcon: 'directions-walk' },
      { id: 'glutes', label: 'Glutes', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center' },
      { id: 'core', label: 'Core', iosIcon: 'figure.core.training', androidIcon: 'fitness-center' },
      { id: 'arms', label: 'Arms', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center' },
      { id: 'back', label: 'Back', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center' },
      { id: 'posture', label: 'Posture', iosIcon: 'figure.stand', androidIcon: 'accessibility-new' },
      { id: 'cardio', label: 'Cardio Capacity', iosIcon: 'heart.fill', androidIcon: 'favorite' },
    ];

    const selectedAreas = profile.focusAreas || [];

    const toggleArea = (areaId: string) => {
      console.log('[Onboarding] Focus area toggled:', areaId);
      const current = selectedAreas;
      const updated = current.includes(areaId)
        ? current.filter((a) => a !== areaId)
        : [...current, areaId];
      setProfile({ ...profile, focusAreas: updated });
    };

    return (
      <View style={styles.stepContainer}>
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
        </View>
        <Text style={styles.stepTitle}>Any areas you want extra attention on?</Text>
        <Text style={styles.stepSubtitle}>We&apos;ll prioritize these without neglecting full-body balance</Text>
        
        <View style={styles.focusAreasGrid}>
          {areas.map((area) => {
            const isSelected = selectedAreas.includes(area.id);
            return (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.focusAreaCard,
                  isSelected && styles.focusAreaCardSelected,
                ]}
                onPress={() => toggleArea(area.id)}
              >
                <IconSymbol
                  ios_icon_name={area.iosIcon}
                  android_material_icon_name={area.androidIcon}
                  size={32}
                  color={isSelected ? colors.primary : colors.grey}
                />
                <Text style={[
                  styles.focusAreaText,
                  isSelected && styles.focusAreaTextSelected
                ]}>
                  {area.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {helperText && (
          <View style={styles.dynamicHelperBox}>
            <Text style={styles.dynamicHelperText}>{helperText}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What equipment do you have?</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll adapt every workout to what you have available</Text>
      
      <View style={styles.equipmentOptionsContainer}>
        {[
          { id: 'gym', label: 'Full Gym', iosIcon: 'dumbbell.fill', androidIcon: 'fitness-center' },
          { id: 'home', label: 'Home Equipment', iosIcon: 'house.fill', androidIcon: 'home' },
          { id: 'minimal', label: 'Bodyweight Only', iosIcon: 'figure.walk', androidIcon: 'directions-walk' },
        ].map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.equipmentCard,
              profile.equipmentType === option.id && styles.selectedCard,
            ]}
            onPress={() => {
              console.log('[Onboarding] Equipment type selected:', option.id);
              setProfile({ ...profile, equipmentType: option.id as any });
            }}
          >
            <IconSymbol
              ios_icon_name={option.iosIcon}
              android_material_icon_name={option.androidIcon}
              size={50}
              color={profile.equipmentType === option.id ? colors.primary : colors.grey}
            />
            <Text style={[
              styles.optionText,
              profile.equipmentType === option.id && styles.selectedText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {helperText && (
        <View style={styles.dynamicHelperBox}>
          <Text style={styles.dynamicHelperText}>{helperText}</Text>
        </View>
      )}
    </View>
  );

  const renderStep8 = () => {
    const homeEquipmentOptions = [
      { id: 'dumbbells', label: 'Dumbbells', iosIcon: 'dumbbell.fill', androidIcon: 'fitness-center' },
      { id: 'bench', label: 'Bench', iosIcon: 'rectangle.fill', androidIcon: 'weekend' },
      { id: 'resistance-bands', label: 'Resistance Bands', iosIcon: 'link', androidIcon: 'link' },
      { id: 'pull-up-bar', label: 'Pull-up Bar', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center' },
      { id: 'kettlebell', label: 'Kettlebell', iosIcon: 'dumbbell.fill', androidIcon: 'fitness-center' },
      { id: 'treadmill-bike', label: 'Treadmill/Bike', iosIcon: 'figure.run', androidIcon: 'directions-run' },
      { id: 'cable-machine', label: 'Cable Machine', iosIcon: 'arrow.up.arrow.down', androidIcon: 'swap-vert' },
      { id: 'barbell-rack', label: 'Barbell/Rack', iosIcon: 'dumbbell.fill', androidIcon: 'fitness-center' },
    ];

    const isGymUser = profile.equipmentType === 'gym';
    const confidenceLevels = [
      ...(isGymUser ? [{ id: 'expert', label: 'I know my way around the gym', iosIcon: 'star.fill', androidIcon: 'star' }] : []),
      { id: 'intermediate', label: 'I know the basics', iosIcon: 'star.leadinghalf.filled', androidIcon: 'star-half' },
      { id: 'beginner', label: 'I need simple guidance', iosIcon: 'star', androidIcon: 'star-border' },
    ];

    const selectedEquipment = profile.homeEquipmentDetails || [];

    const toggleEquipment = (equipmentId: string) => {
      console.log('[Onboarding] Home equipment toggled:', equipmentId);
      const current = selectedEquipment;
      const updated = current.includes(equipmentId)
        ? current.filter((e) => e !== equipmentId)
        : [...current, equipmentId];
      setProfile({ ...profile, homeEquipmentDetails: updated });
    };

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.step8ScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profile.equipmentType === 'home' && (
          <React.Fragment>
            <Text style={styles.stepTitle}>What home equipment do you have?</Text>
            <Text style={styles.stepSubtitle}>Select all that apply</Text>
            
            <View style={styles.homeEquipmentGrid}>
              {homeEquipmentOptions.map((equipment) => {
                const isSelected = selectedEquipment.includes(equipment.id);
                return (
                  <TouchableOpacity
                    key={equipment.id}
                    style={[
                      styles.homeEquipmentCard,
                      isSelected && styles.homeEquipmentCardSelected,
                    ]}
                    onPress={() => toggleEquipment(equipment.id)}
                  >
                    <IconSymbol
                      ios_icon_name={equipment.iosIcon}
                      android_material_icon_name={equipment.androidIcon}
                      size={28}
                      color={isSelected ? colors.primary : colors.grey}
                    />
                    <Text style={[
                      styles.homeEquipmentText,
                      isSelected && styles.homeEquipmentTextSelected
                    ]}>
                      {equipment.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sectionDivider} />
          </React.Fragment>
        )}

        <Text style={styles.stepTitle}>How confident are you with training?</Text>
        <Text style={styles.stepSubtitle}>This helps us adjust exercise complexity and coaching tone</Text>
        
        <View style={styles.confidenceContainer}>
          {confidenceLevels.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.confidenceCard,
                profile.trainingConfidence === level.id && styles.selectedCard,
              ]}
              onPress={() => {
                console.log('[Onboarding] Training confidence selected:', level.id);
                setProfile({ ...profile, trainingConfidence: level.id });
              }}
            >
              <IconSymbol
                ios_icon_name={level.iosIcon}
                android_material_icon_name={level.androidIcon}
                size={32}
                color={profile.trainingConfidence === level.id ? colors.primary : colors.grey}
              />
              <Text style={[
                styles.confidenceLevelText,
                profile.trainingConfidence === level.id && styles.selectedText
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderStep9 = () => {
    const age = profile.age || 0;
    const weight = profile.weight || 0;
    const height = profile.height || 0;

    const ageError = age > 0 && (age < 13 || age > 100)
      ? 'Please enter a valid age (13–100)' : '';
    const weightErrorKg = weightUnit === 'kg' && weight > 0 && (weight < 30 || weight > 300)
      ? 'Please enter a valid weight (30–300 kg)' : '';
    const weightErrorLbs = weightUnit === 'lbs' && weight > 0 && (weight < 66 || weight > 660)
      ? 'Please enter a valid weight (66–660 lbs)' : '';
    const weightError = weightErrorKg || weightErrorLbs;

    const ft = parseInt(heightFt) || 0;
    const inches = parseInt(heightIn) || 0;
    const heightErrorCm = heightUnit === 'cm' && height > 0 && (height < 100 || height > 250)
      ? 'Please enter a valid height (100–250 cm)' : '';
    const heightErrorFt = heightUnit === 'ft' && (heightFt || heightIn)
      && (ft < 3 || ft > 8 || inches < 0 || inches > 11)
      ? 'Please enter valid height (3–8 ft, 0–11 in)' : '';
    const heightError = heightErrorCm || heightErrorFt;

    const genderLabel = (g: string) => {
      if (g === 'prefer-not-to-say') return 'Prefer not to say';
      return g.charAt(0).toUpperCase() + g.slice(1);
    };

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.step9ScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>About You</Text>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Sex</Text>
          <View style={styles.segmentedControl}>
            {(['male', 'female', 'prefer-not-to-say'] as const).map((gender) => {
              const isActive = profile.gender === gender;
              return (
                <TouchableOpacity
                  key={gender}
                  style={[styles.segmentedOption, isActive && styles.segmentedOptionActive]}
                  onPress={() => {
                    console.log('[Onboarding] Gender selected:', gender);
                    setProfile({ ...profile, gender });
                  }}
                >
                  <Text style={[styles.segmentedOptionText, isActive && styles.segmentedOptionTextActive]}>
                    {genderLabel(gender)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.fieldCaption}>Used for metabolic calculations only</Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.inputLabel}>Age (years)</Text>
          <TextInput
            style={[styles.input, ageError ? styles.inputError : null]}
            keyboardType="numeric"
            placeholder="25"
            placeholderTextColor={colors.grey}
            value={profile.age ? profile.age.toString() : ''}
            onChangeText={(text) => {
              console.log('[Onboarding] Age entered:', text);
              setProfile({ ...profile, age: parseInt(text) || 0 });
            }}
          />
          {ageError ? <Text style={styles.fieldError}>{ageError}</Text> : null}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Weight</Text>
            <View style={styles.unitToggle}>
              {(['kg', 'lbs'] as const).map((u) => {
                const isActive = weightUnit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitOption, isActive && styles.unitOptionActive]}
                    onPress={() => {
                      console.log('[Onboarding] Weight unit toggled:', u);
                      setWeightUnit(u);
                      setProfile({ ...profile, weight: 0 });
                    }}
                  >
                    <Text style={[styles.unitOptionText, isActive && styles.unitOptionTextActive]}>{u}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TextInput
            style={[styles.input, weightError ? styles.inputError : null]}
            keyboardType="numeric"
            placeholder={weightUnit === 'kg' ? '70' : '154'}
            placeholderTextColor={colors.grey}
            value={profile.weight ? profile.weight.toString() : ''}
            onChangeText={(text) => {
              console.log('[Onboarding] Weight entered:', text, weightUnit);
              setProfile({ ...profile, weight: parseFloat(text) || 0 });
            }}
          />
          {weightError ? <Text style={styles.fieldError}>{weightError}</Text> : null}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Height</Text>
            <View style={styles.unitToggle}>
              {(['cm', 'ft'] as const).map((u) => {
                const isActive = heightUnit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitOption, isActive && styles.unitOptionActive]}
                    onPress={() => {
                      console.log('[Onboarding] Height unit toggled:', u);
                      setHeightUnit(u);
                      setProfile({ ...profile, height: 0 });
                      setHeightFt('');
                      setHeightIn('');
                    }}
                  >
                    <Text style={[styles.unitOptionText, isActive && styles.unitOptionTextActive]}>{u}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {heightUnit === 'cm' ? (
            <TextInput
              style={[styles.input, heightError ? styles.inputError : null]}
              keyboardType="numeric"
              placeholder="175"
              placeholderTextColor={colors.grey}
              value={profile.height ? profile.height.toString() : ''}
              onChangeText={(text) => {
                console.log('[Onboarding] Height cm entered:', text);
                setProfile({ ...profile, height: parseFloat(text) || 0 });
              }}
            />
          ) : (
            <View style={styles.ftInRow}>
              <TextInput
                style={[styles.input, styles.ftInput, heightError ? styles.inputError : null]}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor={colors.grey}
                value={heightFt}
                onChangeText={(text) => {
                  console.log('[Onboarding] Height ft entered:', text);
                  setHeightFt(text);
                  const f = parseInt(text) || 0;
                  const i = parseInt(heightIn) || 0;
                  setProfile({ ...profile, height: Math.round(f * 30.48 + i * 2.54) });
                }}
              />
              <Text style={styles.ftSeparator}>ft</Text>
              <TextInput
                style={[styles.input, styles.ftInput, heightError ? styles.inputError : null]}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={colors.grey}
                value={heightIn}
                onChangeText={(text) => {
                  console.log('[Onboarding] Height in entered:', text);
                  setHeightIn(text);
                  const f = parseInt(heightFt) || 0;
                  const i = parseInt(text) || 0;
                  setProfile({ ...profile, height: Math.round(f * 30.48 + i * 2.54) });
                }}
              />
              <Text style={styles.ftSeparator}>in</Text>
            </View>
          )}
          {heightError ? <Text style={styles.fieldError}>{heightError}</Text> : null}
        </View>
      </ScrollView>
    );
  };

  const renderStep10 = () => {
    const trainingExperienceOptions = [
      { id: 'beginner', label: 'Beginner', description: 'New to structured training' },
      { id: 'intermediate', label: 'Intermediate', description: '6+ months of consistent training' },
      { id: 'advanced', label: 'Advanced', description: '2+ years of serious training' },
    ];

    const activityLevelOptions = [
      { id: 'regular', label: 'Regular', description: 'Light daily movement, mostly desk-based' },
      { id: 'moderate', label: 'Moderate', description: 'Active lifestyle, on your feet often' },
      { id: 'very-active', label: 'Very Active', description: 'Physical job or very active daily life' },
    ];

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.step9ScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>Your Training</Text>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Training Experience</Text>
          <View style={styles.optionsStack}>
            {trainingExperienceOptions.map((option) => {
              const isSelected = profile.trainingExperience === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCardWide, isSelected && styles.optionCardSelected]}
                  onPress={() => {
                    console.log('[Onboarding] Training experience selected:', option.id);
                    setProfile({ ...profile, trainingExperience: option.id });
                  }}
                >
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionCardDescription}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Activity Level Outside Training</Text>
          <View style={styles.optionsStack}>
            {activityLevelOptions.map((option) => {
              const isSelected = profile.activityLevelOutsideTraining === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCardWide, isSelected && styles.optionCardSelected]}
                  onPress={() => {
                    console.log('[Onboarding] Activity level selected:', option.id);
                    setProfile({ ...profile, activityLevelOutsideTraining: option.id });
                  }}
                >
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionCardDescription}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderStep11 = () => {
    const nutritionPreferenceOptions = [
      { id: 'balanced', label: 'Balanced', description: 'A mix of all food groups, no restrictions' },
      { id: 'high-protein', label: 'High Protein', description: 'Protein-forward meals to support muscle growth' },
      { id: 'low-carb', label: 'Low Carb', description: 'Reduced carbohydrates, higher fats and protein' },
      { id: 'vegan', label: 'Vegan', description: '100% plant-based, no animal products' },
      { id: 'vegetarian', label: 'Vegetarian', description: 'Plant-based with dairy and eggs permitted' },
      { id: 'keto', label: 'Keto', description: 'Very low carb, high fat, metabolic focus' },
    ];

    const daysCount = profile.selectedDays?.length || 0;
    const equipmentText = profile.equipmentType === 'gym' ? 'gym-based'
      : profile.equipmentType === 'home' ? 'home equipment' : 'bodyweight';
    const sessionLengthText = profile.sessionLength === '20-30' ? '20–30'
      : profile.sessionLength === '30-45' ? '30–45'
      : profile.sessionLength === '45-60' ? '45–60' : '60+';

    const goalBullet = profile.primaryGoal === 'lose-fat'
      ? 'Tailored to your fat-loss goal with a sustainable calorie approach'
      : profile.primaryGoal === 'build-muscle'
      ? 'Built around your muscle-building goal with progressive overload'
      : profile.primaryGoal === 'get-stronger'
      ? 'Structured around strength progression and compound lifts'
      : profile.primaryGoal === 'improve-endurance'
      ? 'Designed around your endurance goal with conditioning work'
      : 'Tailored to your profile and the goals you have set';

    const nutritionBullet = profile.nutritionPreference === 'high-protein'
      ? 'Nutrition guidance built around high-protein meals'
      : profile.nutritionPreference === 'vegan'
      ? 'Nutrition guidance adapted for a fully plant-based approach'
      : profile.nutritionPreference === 'keto'
      ? 'Nutrition guidance aligned with a low-carb, high-fat approach'
      : 'Nutrition guidance personalised to how you prefer to eat';

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.step9ScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>Your Nutrition</Text>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Nutrition Preference</Text>
          <View style={styles.optionsStack}>
            {nutritionPreferenceOptions.map((option) => {
              const isSelected = profile.nutritionPreference === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCardWide, isSelected && styles.optionCardSelected]}
                  onPress={() => {
                    console.log('[Onboarding] Nutrition preference selected:', option.id);
                    setProfile({ ...profile, nutritionPreference: option.id });
                  }}
                >
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionCardDescription}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.planPreviewCard}>
          <Text style={styles.planPreviewTitle}>Your Plan</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryText}>{goalBullet}</Text>
            </View>
            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryText}>
                {daysCount > 0 ? `${daysCount} sessions/week` : 'Weekly sessions'} using {equipmentText}, {sessionLengthText} min each — built around how you train
              </Text>
            </View>
            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryText}>{nutritionBullet}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ParticleBackground />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.progressBar}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    s <= step && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && renderStep6()}
            {step === 7 && renderStep7()}
            {step === 8 && renderStep8()}
            {step === 9 && renderStep9()}
            {step === 10 && renderStep10()}
            {step === 11 && renderStep11()}

            <View style={styles.navigation}>
              {step > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    console.log('[Onboarding] User tapped Back');
                    setStep(step - 1);
                  }}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !canProceed() && styles.nextButtonDisabled,
                ]}
                onPress={() => {
                  if (step < 11) {
                    console.log('[Onboarding] User tapped Next, step:', step);
                    setStep(step + 1);
                  } else {
                    saveProfile();
                  }
                }}
                disabled={!canProceed()}
              >
                <Text style={styles.nextButtonText}>
                  {step === 11 ? 'Build My Plan' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={80}
                color={colors.primary}
              />
            </View>
            <Text style={styles.successTitle}>Welcome Aboard!</Text>
            <Text style={styles.successMessage}>
              Your personalized training plan is ready. Let&apos;s make it happen.
            </Text>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 40,
  },
  progressDot: {
    width: 20,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step8ScrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  step9ScrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.grey,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  optionalBadge: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  optionalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  nameInputContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00D4AA',
    padding: 20,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  valuePropsContainer: {
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  valuePropText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  emotionalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emotionalTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  emotionalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  motivationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  motivationChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  motivationChipSelected: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  motivationChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
  },
  motivationChipTextSelected: {
    color: colors.primary,
  },
  motivationContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  motivationInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
  },
  inspirationBox: {
    marginTop: 8,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
  },
  inspirationText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.5,
    fontWeight: '400',
  },
  _inspirationTextOLD: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  goalSectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
  },
  goalSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  goalSectionSubtitle: {
    fontSize: 14,
    color: colors.grey,
  },
  goalsContainer: {
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  goalCardEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  goalCardSelected: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderColor: '#00D4AA',
    borderWidth: 2.5,
    transform: [{ scale: 1.02 }],
  },
  goalLabelSelected: {
    color: '#00D4AA',
    fontWeight: '700',
  },
  goalCheckmark: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00D4AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckmarkText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  _goalCardEnhancedOLD: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryGoalCard: {
    padding: 16,
  },
  selectedCard: {
    backgroundColor: 'rgba(0,212,170,0.10)',
    borderColor: '#00D4AA',
    borderWidth: 2,
  },
  _selectedCardOLD: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  selectedSecondaryCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderColor: colors.primary,
  },
  disabledCard: {
    opacity: 0.4,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  _goalLabelOLD: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.grey,
    marginBottom: 4,
  },
  goalLabelSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grey,
  },
  goalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  _goalDescriptionOLD: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.primary,
  },
  goalCombinationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
  },
  goalCombinationText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dayChip: {
    width: 100,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayChip: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  dayShortText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.grey,
    marginBottom: 4,
  },
  dayFullText: {
    fontSize: 12,
    color: colors.grey,
  },
  selectedDayText: {
    color: colors.primary,
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  sessionLengthContainer: {
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  sessionLengthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sessionLengthContent: {
    flex: 1,
  },
  sessionLengthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.grey,
    marginBottom: 4,
  },
  sessionLengthDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
    marginBottom: 16,
  },
  sessionInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  dynamicHelperBox: {
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
  },
  dynamicHelperText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  focusAreasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  focusAreaCard: {
    width: '45%',
    minWidth: 140,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 8,
  },
  focusAreaCardSelected: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  focusAreaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.grey,
    textAlign: 'center',
  },
  focusAreaTextSelected: {
    color: colors.primary,
  },
  focusInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
    marginBottom: 16,
  },
  focusInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  equipmentOptionsContainer: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  equipmentCard: {
    width: '100%',
    maxWidth: 300,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.grey,
  },
  homeEquipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  homeEquipmentCard: {
    width: '45%',
    minWidth: 140,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 8,
  },
  homeEquipmentCardSelected: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  homeEquipmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
    textAlign: 'center',
  },
  homeEquipmentTextSelected: {
    color: colors.primary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 32,
  },
  confidenceContainer: {
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  confidenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confidenceLevelText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.grey,
    flex: 1,
  },
  finalHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  finalTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  finalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionBlock: {
    marginBottom: 32,
  },
  sectionBlockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionBlockSubtitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 16,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  optionCardLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.grey,
    marginBottom: 4,
  },
  optionCardLabelSelected: {
    color: colors.primary,
  },
  optionCardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  textAreaInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
  },
  genderButtons: {
    gap: 12,
  },
  genderButton: {
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grey,
  },
  genderButtonTextSelected: {
    color: colors.primary,
  },
  statsContainer: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 24,
    width: '100%',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  summaryContent: {
    gap: 12,
    marginBottom: 20,
  },
  summaryBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryBulletDot: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  confidenceBox: {
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  // New styles for step 9 redesign and steps 10/11
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 6,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentedOptionActive: {
    backgroundColor: '#00D4AA',
  },
  segmentedOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.grey,
  },
  segmentedOptionTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  fieldCaption: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 4,
  },
  fieldError: {
    fontSize: 12,
    color: '#FF5A5A',
    marginTop: 4,
  },
  inputError: {
    borderColor: '#FF5A5A',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 2,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  unitOptionActive: {
    backgroundColor: '#00D4AA',
  },
  unitOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.grey,
  },
  unitOptionTextActive: {
    color: '#000',
  },
  ftInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ftInput: {
    flex: 1,
  },
  ftSeparator: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: '500',
  },
  optionsStack: {
    gap: 8,
  },
  optionCardWide: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  planPreviewCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#00D4AA',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  planPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00D4AA',
    marginBottom: 12,
  },
  confidenceText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextButton: {
    flex: 2,
    padding: 18,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
