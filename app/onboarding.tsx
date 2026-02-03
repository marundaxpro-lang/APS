
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
    activityFactor = 1.2; // Sedentary/Lightly active
  } else if (trainingFrequency <= 4) {
    activityFactor = 1.375; // Moderately active
  } else if (trainingFrequency <= 6) {
    activityFactor = 1.55; // Very active
  } else {
    activityFactor = 1.725; // Extremely active
  }

  console.log('[Onboarding] Activity factor:', activityFactor);

  // Calculate TDEE (Total Daily Energy Expenditure)
  const tdee = bmr * activityFactor;
  console.log('[Onboarding] TDEE calculated:', tdee);

  // Adjust for goal
  let caloricGoal: number;
  if (goal === 'weight-loss') {
    caloricGoal = tdee * 0.85; // 15% deficit
  } else if (goal === 'muscle' || goal === 'strength') {
    caloricGoal = tdee * 1.10; // 10% surplus
  } else {
    caloricGoal = tdee; // Maintenance
  }

  console.log('[Onboarding] Final caloric goal:', Math.round(caloricGoal));

  // Calculate macro split
  const proteinCalories = caloricGoal * 0.30; // 30% protein
  const carbCalories = caloricGoal * 0.45; // 45% carbs
  const fatCalories = caloricGoal * 0.25; // 25% fat

  return {
    caloricGoal: Math.round(caloricGoal),
    protein: Math.round(proteinCalories / 4), // 4 cal/g protein
    carbs: Math.round(carbCalories / 4), // 4 cal/g carbs
    fat: Math.round(fatCalories / 9), // 9 cal/g fat
  };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<FitnessProfile & { selectedDays?: number[] }>>({});
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
    
    // Calculate caloric goal locally
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
      trainingDays: trainingDaysCount,
      caloricGoal: nutritionGoals.caloricGoal,
      protein: nutritionGoals.protein,
      carbs: nutritionGoals.carbs,
      fat: nutritionGoals.fat,
    };
    
    console.log('[Onboarding] Final profile before saving:', finalProfile);
    await AsyncStorage.setItem('fitnessProfile', JSON.stringify(finalProfile));
    
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
      
      let backendGoal: 'weight_loss' | 'maintenance' | 'weight_gain' = 'maintenance';
      if (goal === 'weight-loss') {
        backendGoal = 'weight_loss';
      } else if (goal === 'muscle' || goal === 'strength') {
        backendGoal = 'weight_gain';
      }
      
      console.log('[Onboarding] Calculating caloric goal on backend with:', {
        age,
        gender,
        weight,
        height,
        activityLevel,
        goal: backendGoal,
      });
      
      const caloricGoalResponse = await authenticatedPost('/api/dashboard/calculate-caloric-goal', {
        age,
        gender,
        weight,
        height,
        activityLevel,
        goal: backendGoal,
      });
      
      console.log('[Onboarding] Backend caloric goal calculated:', caloricGoalResponse);
      
      // Update local storage with backend response if available
      if (caloricGoalResponse?.dailyCalorieGoal) {
        const updatedProfile = {
          ...finalProfile,
          caloricGoal: caloricGoalResponse.dailyCalorieGoal,
          protein: caloricGoalResponse.protein || nutritionGoals.protein,
          carbs: caloricGoalResponse.carbs || nutritionGoals.carbs,
          fat: caloricGoalResponse.fat || nutritionGoals.fat,
        };
        await AsyncStorage.setItem('fitnessProfile', JSON.stringify(updatedProfile));
        console.log('[Onboarding] Updated profile with backend caloric goal:', updatedProfile.caloricGoal);
      }
      
      console.log('[Onboarding] Profile setup complete - daily calorie goal:', nutritionGoals.caloricGoal);
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace('/(tabs)/(home)');
      }, 2000);
    } catch (error) {
      console.error('[Onboarding] Error saving profile to backend:', error);
      // Still proceed to home screen with local data
      router.replace('/(tabs)/(home)');
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return profile.gender;
    if (step === 3) return profile.selectedDays && profile.selectedDays.length > 0;
    if (step === 4) return profile.focusAreas && profile.focusAreas.length > 0;
    if (step === 5) return profile.equipmentType;
    if (step === 6) return profile.goal && profile.weight && profile.height;
    return false;
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your name?</Text>
      <Text style={styles.stepSubtitle}>Optional - we&apos;ll call you Athlete if you skip</Text>
      
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
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your gender?</Text>
      <Text style={styles.stepSubtitle}>This helps us calculate your calorie needs</Text>
      
      <View style={styles.optionsContainer}>
        {(['male', 'female'] as const).map((gender) => (
          <TouchableOpacity
            key={gender}
            style={[
              styles.genderCard,
              profile.gender === gender && styles.selectedCard,
            ]}
            onPress={() => {
              console.log('[Onboarding] Gender selected:', gender);
              setProfile({ ...profile, gender });
            }}
          >
            <IconSymbol
              ios_icon_name={gender === 'male' ? 'figure.stand' : 'figure.stand.dress'}
              android_material_icon_name="person"
              size={60}
              color={profile.gender === gender ? colors.primary : colors.grey}
            />
            <Text style={[
              styles.optionText,
              profile.gender === gender && styles.selectedText
            ]}>
              {gender.charAt(0).toUpperCase() + gender.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => {
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
        <Text style={styles.stepTitle}>Which days will you train?</Text>
        <Text style={styles.stepSubtitle}>Select the days you want to work out</Text>
        
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
      </View>
    );
  };

  const renderStep4 = () => {
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
      </View>
    );
  };

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What equipment do you have?</Text>
      <Text style={styles.stepSubtitle}>This determines your exercise selection</Text>
      
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
    </View>
  );

  const renderStep6 = () => (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.stepContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Final details</Text>
      <Text style={styles.stepSubtitle}>Your goal and current stats</Text>
      
      <View style={styles.goalsContainer}>
        {[
          { id: 'strength', label: 'Build Strength', iosIcon: 'bolt.fill', androidIcon: 'flash-on' },
          { id: 'muscle', label: 'Gain Muscle', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center' },
          { id: 'endurance', label: 'Improve Endurance', iosIcon: 'figure.run', androidIcon: 'directions-run' },
          { id: 'weight-loss', label: 'Lose Weight', iosIcon: 'flame.fill', androidIcon: 'local-fire-department' },
        ].map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
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
            <Text style={[
              styles.goalText,
              profile.goal === goal.id && styles.selectedText
            ]}>
              {goal.label}
            </Text>
          </TouchableOpacity>
        ))}
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
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ParticleBackground />
      
      <View style={styles.content}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
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
              if (step < 6) {
                console.log('[Onboarding] User tapped Next');
                setStep(step + 1);
              } else {
                saveProfile();
              }
            }}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {step === 6 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Modal */}
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
            <Text style={styles.successTitle}>Profile Created!</Text>
            <Text style={styles.successMessage}>
              Your personalized training plan is ready
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
    width: 32,
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
  },
  nameInputContainer: {
    width: '100%',
    maxWidth: 400,
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
  optionsContainer: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  genderCard: {
    width: 140,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  selectedCard: {
    backgroundColor: 'rgba(69, 155, 155, 0.2)',
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.grey,
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
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  goalsContainer: {
    gap: 12,
    marginBottom: 30,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grey,
  },
  statsContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
