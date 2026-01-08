
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/IconSymbol';
import { FitnessProfile } from '@/types/fitness';
import { colors } from '@/styles/commonStyles';
import ParticleBackground from '@/components/ParticleBackground';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: 40,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(69,155,155,0.15)',
    borderColor: colors.primary,
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  multiSelectCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiSelectCardSelected: {
    backgroundColor: 'rgba(69,155,155,0.15)',
    borderColor: colors.primary,
  },
  multiSelectText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  dayButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(69,155,155,0.15)',
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<FitnessProfile>>({
    focusAreas: [],
  });

  const totalSteps = 5;

  useEffect(() => {
    // Check if user already completed onboarding
    const checkOnboarding = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('fitnessProfile');
        if (storedProfile) {
          router.replace('/(tabs)/(home)');
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      }
    };
    checkOnboarding();
  }, [router]);

  async function saveProfile() {
    try {
      await AsyncStorage.setItem('fitnessProfile', JSON.stringify({
        ...profile,
        createdAt: new Date().toISOString(),
      }));
      router.replace('/(tabs)/(home)');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  function renderStep1() {
    return (
      <>
        <Text style={styles.title}>What&apos;s your gender?</Text>
        <Text style={styles.subtitle}>
          This helps us personalize your workout plan
        </Text>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.gender === 'male' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, gender: 'male' })}
        >
          <IconSymbol
            ios_icon_name="person"
            android_material_icon_name="person"
            size={48}
            color={profile.gender === 'male' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Male</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.gender === 'female' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, gender: 'female' })}
        >
          <IconSymbol
            ios_icon_name="person"
            android_material_icon_name="person"
            size={48}
            color={profile.gender === 'female' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Female</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.gender === 'other' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, gender: 'other' })}
        >
          <IconSymbol
            ios_icon_name="person"
            android_material_icon_name="group"
            size={48}
            color={profile.gender === 'other' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Other</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <Text style={styles.title}>Training Frequency</Text>
        <Text style={styles.subtitle}>
          How many days per week can you train?
        </Text>

        <View style={styles.daySelector}>
          {[2, 3, 4, 5, 6].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.dayButton,
                profile.trainingDays === days && styles.dayButtonSelected,
              ]}
              onPress={() => setProfile({ ...profile, trainingDays: days })}
            >
              <Text style={styles.dayButtonText}>{days}</Text>
              <Text style={[styles.optionDescription, { marginTop: 4 }]}>
                {days === 1 ? 'day' : 'days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  function renderStep3() {
    const focusOptions = [
      { id: 'chest', label: 'Chest', icon: 'fitness-center' },
      { id: 'back', label: 'Back', icon: 'fitness-center' },
      { id: 'legs', label: 'Legs', icon: 'directions-run' },
      { id: 'glutes', label: 'Glutes', icon: 'favorite' },
      { id: 'arms', label: 'Arms', icon: 'fitness-center' },
      { id: 'shoulders', label: 'Shoulders', icon: 'fitness-center' },
    ];

    const toggleFocusArea = (area: string) => {
      const current = profile.focusAreas || [];
      if (current.includes(area)) {
        setProfile({
          ...profile,
          focusAreas: current.filter((a) => a !== area),
        });
      } else {
        setProfile({
          ...profile,
          focusAreas: [...current, area],
        });
      }
    };

    return (
      <>
        <Text style={styles.title}>Focus Areas</Text>
        <Text style={styles.subtitle}>
          Select the body parts you want to prioritize (choose 2-3)
        </Text>

        {focusOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.multiSelectCard,
              profile.focusAreas?.includes(option.id) &&
                styles.multiSelectCardSelected,
            ]}
            onPress={() => toggleFocusArea(option.id)}
          >
            <IconSymbol
              ios_icon_name="dumbbell"
              android_material_icon_name={option.icon}
              size={24}
              color={
                profile.focusAreas?.includes(option.id)
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text style={styles.multiSelectText}>{option.label}</Text>
            {profile.focusAreas?.includes(option.id) && (
              <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </>
    );
  }

  function renderStep4() {
    return (
      <>
        <Text style={styles.title}>Equipment Preference</Text>
        <Text style={styles.subtitle}>
          What equipment do you have access to?
        </Text>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.equipment === 'gym' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, equipment: 'gym' })}
        >
          <IconSymbol
            ios_icon_name="dumbbell"
            android_material_icon_name="fitness-center"
            size={48}
            color={profile.equipment === 'gym' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Full Gym Access</Text>
          <Text style={styles.optionDescription}>
            Barbells, cables, machines, dumbbells
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.equipment === 'home-freeweights' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, equipment: 'home-freeweights' })}
        >
          <IconSymbol
            ios_icon_name="dumbbell"
            android_material_icon_name="fitness-center"
            size={48}
            color={
              profile.equipment === 'home-freeweights'
                ? colors.primary
                : colors.textSecondary
            }
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Home - Free Weights</Text>
          <Text style={styles.optionDescription}>
            Dumbbells, resistance bands
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.equipment === 'home-bodyweight' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, equipment: 'home-bodyweight' })}
        >
          <IconSymbol
            ios_icon_name="figure.walk"
            android_material_icon_name="self-improvement"
            size={48}
            color={
              profile.equipment === 'home-bodyweight'
                ? colors.primary
                : colors.textSecondary
            }
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Home - Bodyweight</Text>
          <Text style={styles.optionDescription}>
            No equipment needed
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderStep5() {
    return (
      <>
        <Text style={styles.title}>Your Goal</Text>
        <Text style={styles.subtitle}>
          What do you want to achieve?
        </Text>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.goal === 'muscle' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, goal: 'muscle' })}
        >
          <IconSymbol
            ios_icon_name="dumbbell"
            android_material_icon_name="fitness-center"
            size={48}
            color={profile.goal === 'muscle' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Build Muscle</Text>
          <Text style={styles.optionDescription}>
            Hypertrophy-focused training
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.goal === 'strength' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, goal: 'strength' })}
        >
          <IconSymbol
            ios_icon_name="dumbbell"
            android_material_icon_name="fitness-center"
            size={48}
            color={profile.goal === 'strength' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Gain Strength</Text>
          <Text style={styles.optionDescription}>
            Progressive overload training
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.goal === 'weight-loss' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, goal: 'weight-loss' })}
        >
          <IconSymbol
            ios_icon_name="chart.line.downtrend.xyaxis"
            android_material_icon_name="trending-down"
            size={48}
            color={profile.goal === 'weight-loss' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Lose Weight</Text>
          <Text style={styles.optionDescription}>
            Fat loss with muscle retention
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            profile.goal === 'endurance' && styles.optionCardSelected,
          ]}
          onPress={() => setProfile({ ...profile, goal: 'endurance' })}
        >
          <IconSymbol
            ios_icon_name="figure.run"
            android_material_icon_name="directions-run"
            size={48}
            color={profile.goal === 'endurance' ? colors.primary : colors.textSecondary}
            style={styles.optionIcon}
          />
          <Text style={styles.optionTitle}>Build Endurance</Text>
          <Text style={styles.optionDescription}>
            Stamina and conditioning
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  function canProceed() {
    switch (step) {
      case 1:
        return !!profile.gender;
      case 2:
        return !!profile.trainingDays;
      case 3:
        return (profile.focusAreas?.length || 0) >= 2;
      case 4:
        return !!profile.equipment;
      case 5:
        return !!profile.goal;
      default:
        return false;
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ParticleBackground />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / totalSteps) * 100}%` },
            ]}
          />
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              !canProceed() && styles.buttonDisabled,
            ]}
            onPress={() => {
              if (step < totalSteps) {
                setStep(step + 1);
              } else {
                saveProfile();
              }
            }}
            disabled={!canProceed()}
          >
            <Text style={styles.buttonText}>
              {step === totalSteps ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
