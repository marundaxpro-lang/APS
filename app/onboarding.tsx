
import React, { useState } from 'react';
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
import { colors } from '@/styles/commonStyles';
import { FitnessProfile } from '@/types/fitness';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<FitnessProfile>>({});

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('fitnessProfile', JSON.stringify(profile));
      router.replace('/(tabs)/training');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your experience level?</Text>
      <Text style={styles.stepSubtitle}>This helps us create the perfect workout plan for you</Text>

      <View style={styles.optionsContainer}>
        {[
          { value: 'beginner', label: 'Beginner', iosIcon: 'figure.walk', androidIcon: 'directions-walk', desc: 'New to fitness or returning after a break' },
          { value: 'intermediate', label: 'Intermediate', iosIcon: 'figure.run', androidIcon: 'directions-run', desc: '6-12 months of consistent training' },
          { value: 'advanced', label: 'Advanced', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center', desc: '1+ years of structured training' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionCard,
              profile.experience === option.value && styles.optionCardSelected,
            ]}
            onPress={() => setProfile({ ...profile, experience: option.value as any })}
          >
            <IconSymbol 
              ios_icon_name={option.iosIcon} 
              android_material_icon_name={option.androidIcon as any}
              size={32} 
              color={profile.experience === option.value ? colors.primary : colors.textSecondary} 
            />
            <Text style={[styles.optionLabel, profile.experience === option.value && styles.optionLabelSelected]}>
              {option.label}
            </Text>
            <Text style={styles.optionDesc}>{option.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What&apos;s your primary goal?</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll optimize your training for this objective</Text>

      <View style={styles.optionsContainer}>
        {[
          { value: 'strength', label: 'Build Strength', iosIcon: 'bolt.fill', androidIcon: 'flash-on', desc: 'Increase max lifts and power' },
          { value: 'muscle', label: 'Build Muscle', iosIcon: 'figure.strengthtraining.traditional', androidIcon: 'fitness-center', desc: 'Hypertrophy and size gains' },
          { value: 'endurance', label: 'Endurance', iosIcon: 'figure.run', androidIcon: 'directions-run', desc: 'Improve stamina and conditioning' },
          { value: 'weight-loss', label: 'Lose Weight', iosIcon: 'flame.fill', androidIcon: 'local-fire-department', desc: 'Fat loss and body recomposition' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionCard,
              profile.goal === option.value && styles.optionCardSelected,
            ]}
            onPress={() => setProfile({ ...profile, goal: option.value as any })}
          >
            <IconSymbol 
              ios_icon_name={option.iosIcon} 
              android_material_icon_name={option.androidIcon as any}
              size={32} 
              color={profile.goal === option.value ? colors.primary : colors.textSecondary} 
            />
            <Text style={[styles.optionLabel, profile.goal === option.value && styles.optionLabelSelected]}>
              {option.label}
            </Text>
            <Text style={styles.optionDesc}>{option.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Training frequency & split</Text>
      <Text style={styles.stepSubtitle}>How many days per week can you train?</Text>

      <View style={styles.frequencyContainer}>
        {[2, 3, 4, 5, 6].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.frequencyButton,
              profile.trainingFrequency === days && styles.frequencyButtonSelected,
            ]}
            onPress={() => setProfile({ ...profile, trainingFrequency: days })}
          >
            <Text style={[
              styles.frequencyText,
              profile.trainingFrequency === days && styles.frequencyTextSelected,
            ]}>
              {days}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.stepSubtitle, { marginTop: 32 }]}>Choose your training split</Text>

      <View style={styles.optionsContainer}>
        {[
          { value: 'ppl', label: 'Push/Pull/Legs', desc: 'Best for 3-6 days/week', recommended: profile.trainingFrequency && profile.trainingFrequency >= 3 },
          { value: 'upper-lower', label: 'Upper/Lower', desc: 'Best for 4 days/week', recommended: profile.trainingFrequency === 4 },
          { value: 'full-body', label: 'Full Body', desc: 'Best for 2-3 days/week', recommended: profile.trainingFrequency && profile.trainingFrequency <= 3 },
          { value: 'bro-split', label: 'Bro Split', desc: 'Best for 5-6 days/week', recommended: profile.trainingFrequency && profile.trainingFrequency >= 5 },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.splitCard,
              profile.splitType === option.value && styles.splitCardSelected,
            ]}
            onPress={() => setProfile({ ...profile, splitType: option.value as any })}
          >
            <View style={styles.splitHeader}>
              <Text style={[styles.splitLabel, profile.splitType === option.value && styles.splitLabelSelected]}>
                {option.label}
              </Text>
              {option.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
            </View>
            <Text style={styles.splitDesc}>{option.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const canProceed = () => {
    if (step === 1) return !!profile.experience;
    if (step === 2) return !!profile.goal;
    if (step === 3) return !!profile.trainingFrequency && !!profile.splitType;
    return false;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.progressBar}>
            {[1, 2, 3].map((s) => (
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
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step - 1)}
            >
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron-left" size={20} color={colors.text} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                saveProfile();
              }
            }}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {step === 3 ? 'Get Started' : 'Continue'}
            </Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepContainer: {
    marginBottom: 100,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  frequencyButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  frequencyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  frequencyTextSelected: {
    color: '#fff',
  },
  splitCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  splitCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(69, 155, 155, 0.1)',
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  splitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  splitLabelSelected: {
    color: colors.primary,
  },
  splitDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recommendedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
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
