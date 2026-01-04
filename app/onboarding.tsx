
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { FitnessProfile } from '@/types/fitness';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPost } from '@/utils/api';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<FitnessProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      // Save to local storage
      await AsyncStorage.setItem('fitnessProfile', JSON.stringify(profile));
      
      // Save to backend
      await authenticatedPost('/api/fitness-profile', profile);
      
      console.log('[Onboarding] Profile saved successfully');
      router.replace('/(tabs)/(home)/');
    } catch (error) {
      console.error('[Onboarding] Error saving profile:', error);
      Alert.alert(
        'Error',
        'Failed to save your profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your experience level?</Text>
      <Text style={styles.stepSubtitle}>This helps us customize your workouts</Text>
      
      <View style={styles.optionsContainer}>
        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.optionCard,
              profile.experience_level === level && styles.optionCardSelected,
            ]}
            onPress={() => setProfile({ ...profile, experience_level: level })}
          >
            <Text style={[
              styles.optionText,
              profile.experience_level === level && styles.optionTextSelected,
            ]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
            <Text style={styles.optionDescription}>
              {level === 'beginner' && 'New to fitness'}
              {level === 'intermediate' && '6+ months training'}
              {level === 'advanced' && '2+ years training'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !profile.experience_level && styles.nextButtonDisabled]}
        onPress={() => setStep(2)}
        disabled={!profile.experience_level}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your primary goal?</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll tailor your plan accordingly</Text>
      
      <View style={styles.optionsContainer}>
        {([
          { key: 'strength', label: 'Build Strength', desc: 'Get stronger' },
          { key: 'muscle', label: 'Build Muscle', desc: 'Gain mass' },
          { key: 'endurance', label: 'Endurance', desc: 'Improve stamina' },
          { key: 'weight-loss', label: 'Weight Loss', desc: 'Lose fat' },
        ] as const).map((goal) => (
          <TouchableOpacity
            key={goal.key}
            style={[
              styles.optionCard,
              profile.goal === goal.key && styles.optionCardSelected,
            ]}
            onPress={() => setProfile({ ...profile, goal: goal.key })}
          >
            <Text style={[
              styles.optionText,
              profile.goal === goal.key && styles.optionTextSelected,
            ]}>
              {goal.label}
            </Text>
            <Text style={styles.optionDescription}>{goal.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !profile.goal && styles.nextButtonDisabled]}
          onPress={() => setStep(3)}
          disabled={!profile.goal}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How often can you train?</Text>
      <Text style={styles.stepSubtitle}>Days per week</Text>
      
      <View style={styles.optionsContainer}>
        {[2, 3, 4, 5, 6].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.optionCard,
              styles.optionCardSmall,
              profile.training_frequency === days && styles.optionCardSelected,
            ]}
            onPress={() => setProfile({ ...profile, training_frequency: days })}
          >
            <Text style={[
              styles.optionText,
              profile.training_frequency === days && styles.optionTextSelected,
            ]}>
              {days} days
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, (!profile.training_frequency || saving) && styles.nextButtonDisabled]}
          onPress={saveProfile}
          disabled={!profile.training_frequency || saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.nextButtonText}>Get Started</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>APS Fitness</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>Step {step} of 3</Text>
          </View>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.grey,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  optionCardSmall: {
    padding: 16,
  },
  optionCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.grey,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
