
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessProfile } from '@/types/fitness';
import ParticleBackground from '@/components/ParticleBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';

const { height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<FitnessProfile>>({});

  useEffect(() => {
    AsyncStorage.getItem('fitnessProfile').then((data) => {
      if (data) router.replace('/(tabs)/(home)');
    });
  }, [router]);

  const saveProfile = async () => {
    const finalProfile = {
      ...profile,
      name: profile.name?.trim() || undefined,
      age: profile.age || 25,
      gender: profile.gender || 'male',
      weight: profile.weight || 70,
      height: profile.height || 175,
    };
    
    console.log('[Onboarding] Final profile before saving:', finalProfile);
    await AsyncStorage.setItem('fitnessProfile', JSON.stringify(finalProfile));
    
    try {
      // Calculate activity level based on training days
      const activityLevel = (finalProfile.trainingDays || 3) >= 5 ? 'active' : 
                           (finalProfile.trainingDays || 3) >= 3 ? 'moderate' : 'light';
      
      // Save complete fitness profile to backend with ALL fields
      console.log('[Onboarding] Saving complete fitness profile to backend...');
      const profilePayload = {
        experienceLevel: 'beginner',
        goal: finalProfile.goal || 'muscle',
        trainingFrequency: finalProfile.trainingDays || 3,
        gender: finalProfile.gender,
        age: finalProfile.age,
        weight: finalProfile.weight,
        height: finalProfile.height,
        activityLevel,
        focusAreas: finalProfile.focusAreas || [],
        equipmentType: finalProfile.equipmentType || 'gym',
        name: finalProfile.name || null,
      };
      
      console.log('[Onboarding] Profile payload being sent to backend:', profilePayload);
      const savedProfile = await authenticatedPost('/api/fitness-profile', profilePayload);
      console.log('[Onboarding] Backend response:', savedProfile);
      console.log('[Onboarding] Complete fitness profile saved successfully');
      
      // Calculate calorie goal based on user input
      // Map frontend goal to backend goal format
      let backendGoal: 'weight_loss' | 'maintenance' | 'weight_gain' = 'maintenance';
      if (finalProfile.goal === 'weight-loss') {
        backendGoal = 'weight_loss';
      } else if (finalProfile.goal === 'muscle' || finalProfile.goal === 'strength') {
        backendGoal = 'weight_gain';
      }
      
      console.log('[Onboarding] Calculating caloric goal with:', {
        age: finalProfile.age,
        gender: finalProfile.gender,
        weight: finalProfile.weight,
        height: finalProfile.height,
        activityLevel,
        goal: backendGoal,
      });
      
      const caloricGoalResponse = await authenticatedPost('/api/dashboard/calculate-caloric-goal', {
        age: finalProfile.age,
        gender: finalProfile.gender,
        weight: finalProfile.weight,
        height: finalProfile.height,
        activityLevel,
        goal: backendGoal,
      });
      
      console.log('[Onboarding] Caloric goal calculated:', caloricGoalResponse);
      console.log('[Onboarding] Profile setup complete - daily calorie goal:', caloricGoalResponse?.dailyCalorieGoal || 'unknown');
    } catch (error) {
      console.error('[Onboarding] Error saving profile to backend:', error);
      // Continue to home screen even if backend save fails
      // The local profile is already saved
    }
    
    router.replace('/(tabs)/(home)');
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return profile.gender;
    if (step === 3) return profile.trainingDays;
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
          onChangeText={(text) => setProfile({ ...profile, name: text })}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your gender?</Text>
      <Text style={styles.stepSubtitle}>This helps us personalize your workout plan</Text>
      
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

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How many days can you train?</Text>
      <Text style={styles.stepSubtitle}>Choose your weekly training frequency</Text>
      
      <View style={styles.frequencyGrid}>
        {[2, 3, 4, 5, 6].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.frequencyCard,
              profile.trainingDays === days && styles.selectedCard,
            ]}
            onPress={() => setProfile({ ...profile, trainingDays: days })}
          >
            <Text style={[
              styles.frequencyNumber,
              profile.trainingDays === days && styles.selectedText
            ]}>
              {days}
            </Text>
            <Text style={[
              styles.frequencyLabel,
              profile.trainingDays === days && styles.selectedText
            ]}>
              days/week
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

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
            onPress={() => setProfile({ ...profile, equipmentType: option.id as any })}
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
            onPress={() => setProfile({ ...profile, goal: goal.id as any })}
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
            onChangeText={(text) => setProfile({ ...profile, weight: parseFloat(text) || 0 })}
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
            onChangeText={(text) => setProfile({ ...profile, height: parseFloat(text) || 0 })}
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
            onChangeText={(text) => setProfile({ ...profile, age: parseInt(text) || 0 })}
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
              onPress={() => setStep(step - 1)}
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
              if (step < 6) setStep(step + 1);
              else saveProfile();
            }}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {step === 6 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: 'rgba(22,36,86,0.3)',
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
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  frequencyCard: {
    width: 100,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.grey,
  },
  frequencyLabel: {
    fontSize: 14,
    color: colors.grey,
    marginTop: 4,
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
    backgroundColor: 'rgba(22,36,86,0.3)',
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
});
