
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
  gender: 'male' | 'female',
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
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
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
  if (goal === 'weight-loss') {
    caloricGoal = tdee * 0.85;
  } else if (goal === 'muscle' || goal === 'strength') {
    caloricGoal = tdee * 1.10;
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
  const [profile, setProfile] = useState<Partial<FitnessProfile & { selectedDays?: number[]; motivation?: string; selectedMotivationChips?: string[] }>>({});
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
    const goal = profile.goal || 'muscle';
    
    const nutritionGoals = calculateCaloricGoal(
      gender,
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
      if (goal === 'weight-loss') {
        backendGoal = 'weight_loss';
      } else if (goal === 'muscle') {
        backendGoal = 'muscle_gain';
      } else if (goal === 'strength') {
        backendGoal = 'strength';
      } else if (goal === 'endurance') {
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
    if (step === 3) return profile.goal;
    if (step === 4) return profile.selectedDays && profile.selectedDays.length > 0;
    if (step === 5) return profile.focusAreas && profile.focusAreas.length > 0;
    if (step === 6) return profile.equipmentType;
    if (step === 7) return profile.gender && profile.weight && profile.height && profile.age;
    return false;
  };

  const getHelperText = () => {
    const daysCount = profile.selectedDays?.length || 0;
    const focusCount = profile.focusAreas?.length || 0;
    const equipment = profile.equipmentType;

    if (step === 4 && daysCount > 0) {
      if (daysCount <= 2) {
        return '💡 Perfect for beginners. We\'ll focus on full-body compound movements to maximize your limited time.';
      } else if (daysCount <= 4) {
        return '💡 Great balance! We\'ll create an upper/lower split that fits your schedule perfectly.';
      } else {
        return '💡 Excellent commitment! We\'ll design a targeted split to optimize muscle recovery and growth.';
      }
    }

    if (step === 5 && focusCount > 0 && daysCount > 0) {
      const areasText = focusCount === 1 ? 'area' : 'areas';
      return `💡 Your ${daysCount}-day plan will prioritize your ${focusCount} focus ${areasText} with specialized exercises.`;
    }

    if (step === 6 && equipment) {
      if (equipment === 'gym') {
        return '💡 Full gym access unlocks advanced training techniques and progressive overload strategies.';
      } else if (equipment === 'home') {
        return '💡 Home equipment is perfect! We\'ll design effective workouts with dumbbells, bands, and bodyweight.';
      } else {
        return '💡 Bodyweight training builds incredible strength and control. No equipment needed, just dedication.';
      }
    }

    return '';
  };

  const helperText = getHelperText();

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What do you want this app to help you do first?</Text>
      <Text style={styles.stepSubtitle}>Let&apos;s make this immediately useful for you</Text>
      
      <View style={styles.nameInputContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="e.g., Build muscle, lose weight, get stronger..."
          placeholderTextColor={colors.grey}
          value={profile.name || ''}
          onChangeText={(text) => {
            console.log('[Onboarding] Primary goal entered:', text);
            setProfile({ ...profile, name: text });
          }}
          autoCapitalize="sentences"
          autoCorrect={false}
        />
      </View>

      <View style={styles.valuePropsContainer}>
        <View style={styles.valuePropRow}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.valuePropText}>Personalized in under 2 minutes</Text>
        </View>
        <View style={styles.valuePropRow}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.valuePropText}>Built for gym, home, or bodyweight</Text>
        </View>
        <View style={styles.valuePropRow}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.valuePropText}>Tracks progress automatically</Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => {
    const motivationChips = [
      'Build confidence',
      'Get disciplined',
      'Feel healthier',
      'Stop starting over',
      'Look better',
      'Gain strength',
      'Improve energy',
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
          What made you decide to start today? Pick what resonates, or write your own.
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
            💭 We&apos;ll remind you of this when you need it most—on tough days, missed workouts, and comeback moments.
          </Text>
        </View>
      </View>
    );
  };

  const renderStep3 = () => {
    const goals = [
      { 
        id: 'strength', 
        label: 'Get Stronger', 
        description: 'Lift heavier, feel powerful',
        iosIcon: 'bolt.fill', 
        androidIcon: 'flash-on' 
      },
      { 
        id: 'muscle', 
        label: 'Build Muscle', 
        description: 'Sculpt your physique',
        iosIcon: 'figure.strengthtraining.traditional', 
        androidIcon: 'fitness-center' 
      },
      { 
        id: 'endurance', 
        label: 'Boost Endurance', 
        description: 'Go longer, push harder',
        iosIcon: 'figure.run', 
        androidIcon: 'directions-run' 
      },
      { 
        id: 'weight-loss', 
        label: 'Lose Weight', 
        description: 'Feel lighter, move better',
        iosIcon: 'flame.fill', 
        androidIcon: 'local-fire-department' 
      },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What matters most to you?</Text>
        <Text style={styles.stepSubtitle}>Choose the goal that excites you most right now</Text>
        
        <View style={styles.goalsContainer}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalCardEnhanced,
                profile.goal === goal.id && styles.selectedCard,
              ]}
              onPress={() => {
                console.log('[Onboarding] Goal selected:', goal.id);
                setProfile({ ...profile, goal: goal.id as any });
              }}
            >
              <IconSymbol
                ios_icon_name={goal.iosIcon}
                android_material_icon_name={goal.androidIcon}
                size={40}
                color={profile.goal === goal.id ? colors.primary : colors.grey}
              />
              <View style={styles.goalTextContainer}>
                <Text style={[
                  styles.goalLabel,
                  profile.goal === goal.id && styles.selectedText
                ]}>
                  {goal.label}
                </Text>
                <Text style={styles.goalDescription}>
                  {goal.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
    const areas = profile.gender === 'female'
      ? ['Glutes', 'Legs', 'Core', 'Upper Body', 'Full Body']
      : ['Chest', 'Back', 'Arms', 'Legs', 'Shoulders'];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What areas do you want to focus on?</Text>
        <Text style={styles.stepSubtitle}>Select one or more</Text>
        
        <View style={styles.areasGrid}>
          {areas.map((area) => (
            <TouchableOpacity
              key={area}
              style={[
                styles.areaChip,
                profile.focusAreas?.includes(area) && styles.selectedChip,
              ]}
              onPress={() => {
                console.log('[Onboarding] Focus area toggled:', area);
                const current = profile.focusAreas || [];
                const updated = current.includes(area)
                  ? current.filter((a) => a !== area)
                  : [...current, area];
                setProfile({ ...profile, focusAreas: updated });
              }}
            >
              <Text style={[
                styles.chipText,
                profile.focusAreas?.includes(area) && styles.selectedChipText
              ]}>
                {area}
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
  };

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What equipment do you have?</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll adapt every workout to what you have available</Text>
      
      <View style={styles.optionsContainer}>
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

  const renderStep7 = () => {
    const daysCount = profile.selectedDays?.length || 0;
    const focusAreasText = profile.focusAreas?.join(', ') || 'full body';
    const equipmentText = profile.equipmentType === 'gym' ? 'gym equipment' : 
                         profile.equipmentType === 'home' ? 'home equipment' : 'bodyweight';
    const goalText = profile.goal === 'strength' ? 'build strength' :
                    profile.goal === 'muscle' ? 'gain muscle' :
                    profile.goal === 'endurance' ? 'boost endurance' : 'lose weight';

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.step7ScrollContent}
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
          Just a few details to personalize your plan
        </Text>
        
        <View style={styles.genderSelection}>
          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.genderButtons}>
            {(['male', 'female'] as const).map((gender) => (
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
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
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
            <View style={styles.summaryRow}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.summaryText}>
                {daysCount} days per week
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <IconSymbol
                ios_icon_name="target"
                android_material_icon_name="track-changes"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.summaryText}>
                Focused on {focusAreasText}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <IconSymbol
                ios_icon_name="dumbbell.fill"
                android_material_icon_name="fitness-center"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.summaryText}>
                Using {equipmentText}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <IconSymbol
                ios_icon_name="flame.fill"
                android_material_icon_name="local-fire-department"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.summaryText}>
                Designed to {goalText}
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
              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
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
                  if (step < 7) {
                    console.log('[Onboarding] User tapped Next');
                    setStep(step + 1);
                  } else {
                    saveProfile();
                  }
                }}
                disabled={!canProceed()}
              >
                <Text style={styles.nextButtonText}>
                  {step === 7 ? 'Start My Journey' : 'Next'}
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
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 28,
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
  step7ScrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
  nameInputContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    fontSize: 18,
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
    backgroundColor: 'rgba(69, 155, 155, 0.15)',
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
  },
  inspirationText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  goalsContainer: {
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  goalCardEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.grey,
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.primary,
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
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  areaChip: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedChip: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grey,
  },
  selectedChipText: {
    color: colors.primary,
  },
  optionsContainer: {
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
  genderSelection: {
    width: '100%',
    marginBottom: 28,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  genderButton: {
    flex: 1,
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
    gap: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
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
