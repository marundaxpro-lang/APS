
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
import { authenticatedPost } from '@/utils/api';

const { height } = Dimensions.get('window');

const DAYS_OF_WEEK = [
  { id: 0, short: 'Sun', full: 'Sunday' },
  { id: 1, short: 'Mon', full: 'Monday' },
  { id: 2, short: 'Tue', full: 'Tuesday' },
  { id: 3, short: 'Wed', full: 'Wednesday' },
  { id: 4, short: 'Thu', full: 'Thursday' },
  { id: 5, short: 'Fri', full: 'Friday' },
  { id: 6, short: 'Sat', full: 'Saturday' },
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
    injuries?: string;
    nutritionPreference?: string;
  }>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      const activityLevel = trainingDaysCount >= 5 ? 'active' : 
                           trainingDaysCount >= 3 ? 'moderate' : 'light';
      
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
      
      console.log('[Onboarding] Profile setup complete - daily calorie goal:', nutritionGoals.caloricGoal);
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace('/(tabs)/(home)');
      }, 2000);
    } catch (error) {
      console.error('[Onboarding] Error saving profile to backend:', error);
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
      return profile.gender && profile.weight && profile.height && profile.age && 
             profile.trainingExperience && profile.activityLevelOutsideTraining && 
             profile.nutritionPreference;
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
      { 
        id: 'general-fitness', 
        label: 'General Fitness', 
        description: 'Overall health and energy',
        iosIcon: 'heart.fill', 
        androidIcon: 'favorite' 
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
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
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

        {selectedAreas.length > 0 && (
          <View style={styles.focusInfoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.focusInfoText}>
              We&apos;ll give these areas extra attention without neglecting full-body balance.
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

    const confidenceLevels = [
      { id: 'expert', label: 'I know my way around the gym', iosIcon: 'star.fill', androidIcon: 'star' },
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
    const daysCount = profile.selectedDays?.length || 0;
    const selectedDayNames = profile.selectedDays?.map(dayId => DAYS_OF_WEEK[dayId].full) || [];
    const dayScheduleText = selectedDayNames.length > 0 
      ? selectedDayNames.slice(0, 3).join('-') + (selectedDayNames.length > 3 ? '...' : '')
      : 'your schedule';
    
    const focusAreasText = profile.focusAreas && profile.focusAreas.length > 0 
      ? profile.focusAreas.map(a => a.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ')
      : null;
    
    const equipmentText = profile.equipmentType === 'gym' ? 'gym-based' : 
                         profile.equipmentType === 'home' ? 'home equipment' : 'bodyweight';
    
    const primaryGoalLabel = profile.primaryGoal ? 
      profile.primaryGoal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    
    const secondaryGoalLabel = profile.secondaryGoal ? 
      profile.secondaryGoal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    
    const sessionLengthText = profile.sessionLength === '20-30' ? '20–30' :
                             profile.sessionLength === '30-45' ? '30–45' :
                             profile.sessionLength === '45-60' ? '45–55' : '60+';

    const trainingExperienceOptions = [
      { id: 'beginner', label: 'Beginner', description: 'New to structured training' },
      { id: 'returning', label: 'Returning', description: 'Getting back after a break' },
      { id: 'intermediate', label: 'Intermediate', description: '6+ months consistent training' },
      { id: 'advanced', label: 'Advanced', description: '2+ years of experience' },
    ];

    const activityLevelOptions = [
      { id: 'sedentary', label: 'Sedentary', description: 'Desk job, minimal movement' },
      { id: 'lightly-active', label: 'Lightly Active', description: 'Some walking, light activity' },
      { id: 'moderately-active', label: 'Moderately Active', description: 'Active job or daily movement' },
      { id: 'very-active', label: 'Very Active', description: 'Physical job or high activity' },
    ];

    const nutritionPreferenceOptions = [
      { id: 'just-calories', label: 'Just Calories', description: 'Simple calorie tracking' },
      { id: 'macros', label: 'Macros', description: 'Protein, carbs, and fats' },
      { id: 'meal-ideas', label: 'Meal Ideas', description: 'Suggestions and recipes' },
      { id: 'full-structure', label: 'Full Structure', description: 'Complete meal plans' },
    ];

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.step9ScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.finalHeader}>
          <IconSymbol
            ios_icon_name="sparkles"
            android_material_icon_name="auto-awesome"
            size={56}
            color={colors.primary}
          />
          <Text style={styles.finalTitle}>Almost there!</Text>
        </View>
        <Text style={styles.finalSubtitle}>
          Final details to personalize your plan
        </Text>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Training Experience</Text>
          <View style={styles.optionsGrid}>
            {trainingExperienceOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  profile.trainingExperience === option.id && styles.optionCardSelected,
                ]}
                onPress={() => {
                  console.log('[Onboarding] Training experience selected:', option.id);
                  setProfile({ ...profile, trainingExperience: option.id });
                }}
              >
                <Text style={[
                  styles.optionCardLabel,
                  profile.trainingExperience === option.id && styles.optionCardLabelSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionCardDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Activity Level Outside Training</Text>
          <View style={styles.optionsGrid}>
            {activityLevelOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  profile.activityLevelOutsideTraining === option.id && styles.optionCardSelected,
                ]}
                onPress={() => {
                  console.log('[Onboarding] Activity level selected:', option.id);
                  setProfile({ ...profile, activityLevelOutsideTraining: option.id });
                }}
              >
                <Text style={[
                  styles.optionCardLabel,
                  profile.activityLevelOutsideTraining === option.id && styles.optionCardLabelSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionCardDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Injuries or Limitations (Optional)</Text>
          <TextInput
            style={styles.textAreaInput}
            placeholder="e.g., Lower back issues, shoulder mobility..."
            placeholderTextColor={colors.grey}
            value={profile.injuries || ''}
            onChangeText={(text) => {
              console.log('[Onboarding] Injuries entered:', text);
              setProfile({ ...profile, injuries: text });
            }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Nutrition Preference</Text>
          <View style={styles.optionsGrid}>
            {nutritionPreferenceOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  profile.nutritionPreference === option.id && styles.optionCardSelected,
                ]}
                onPress={() => {
                  console.log('[Onboarding] Nutrition preference selected:', option.id);
                  setProfile({ ...profile, nutritionPreference: option.id });
                }}
              >
                <Text style={[
                  styles.optionCardLabel,
                  profile.nutritionPreference === option.id && styles.optionCardLabelSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionCardDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionBlockTitle}>Sex for Calculation Purposes</Text>
          <Text style={styles.sectionBlockSubtitle}>Used for metabolic calculations only</Text>
          <View style={styles.genderButtons}>
            {(['male', 'female', 'prefer-not-to-say'] as const).map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderButton,
                  profile.gender === gender && styles.genderButtonSelected,
                ]}
                onPress={() => {
                  console.log('[Onboarding] Gender selected:', gender);
                  setProfile({ ...profile, gender });
                }}
              >
                <Text style={[
                  styles.genderButtonText,
                  profile.gender === gender && styles.genderButtonTextSelected
                ]}>
                  {gender === 'prefer-not-to-say' ? 'Prefer not to say' : gender.charAt(0).toUpperCase() + gender.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="70"
              placeholderTextColor={colors.grey}
              value={profile.weight?.toString()}
              onChangeText={(text) => {
                console.log('[Onboarding] Weight entered:', text);
                setProfile({ ...profile, weight: parseFloat(text) || 0 });
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="175"
              placeholderTextColor={colors.grey}
              value={profile.height?.toString()}
              onChangeText={(text) => {
                console.log('[Onboarding] Height entered:', text);
                setProfile({ ...profile, height: parseFloat(text) || 0 });
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age (years)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor={colors.grey}
              value={profile.age?.toString()}
              onChangeText={(text) => {
                console.log('[Onboarding] Age entered:', text);
                setProfile({ ...profile, age: parseInt(text) || 0 });
              }}
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.summaryTitle}>Your Personalized Plan</Text>
          </View>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryText}>
                {daysCount} strength sessions/week built around your {dayScheduleText} schedule
              </Text>
            </View>

            {focusAreasText && (
              <View style={styles.summaryBullet}>
                <Text style={styles.summaryBulletDot}>•</Text>
                <Text style={styles.summaryText}>
                  Extra {focusAreasText.toLowerCase()} emphasis without neglecting legs
                </Text>
              </View>
            )}

            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryText}>
                {equipmentText.charAt(0).toUpperCase() + equipmentText.slice(1)} plan with simple progression
              </Text>
            </View>

            {profile.primaryGoal === 'improve-endurance' && (
              <View style={styles.summaryBullet}>
                <Text style={styles.summaryBulletDot}>•</Text>
                <Text style={styles.summaryText}>
                  Endurance finishers 2x/week
                </Text>
              </View>
            )}

            <View style={styles.summaryBullet}>
              <Text style={styles.summaryBulletDot}>•</Text>
              <Text style={styles.summaryText}>
                Estimated session length: {sessionLengthText} min
              </Text>
            </View>
          </View>

          <View style={styles.confidenceBox}>
            <Text style={styles.confidenceText}>
              ✨ Your plan is scientifically designed to match your goals, schedule, and equipment. Everything is ready.
            </Text>
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
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
                  if (step < 9) {
                    console.log('[Onboarding] User tapped Next');
                    setStep(step + 1);
                  } else {
                    saveProfile();
                  }
                }}
                disabled={!canProceed()}
              >
                <Text style={styles.nextButtonText}>
                  {step === 9 ? 'Start My Journey' : step === 6 ? 'Skip' : 'Next'}
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
