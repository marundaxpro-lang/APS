
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

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<FitnessProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('fitnessProfile');
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[EditProfile] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      console.log('[EditProfile] Saving profile:', profile);
      await AsyncStorage.setItem('fitnessProfile', JSON.stringify(profile));
      
      try {
        // Calculate activity level based on training days
        const activityLevel = (profile.trainingDays || 3) >= 5 ? 'active' : 
                             (profile.trainingDays || 3) >= 3 ? 'moderate' : 'light';
        
        // Save complete profile to backend with ALL fields
        const profilePayload = {
          experienceLevel: 'beginner',
          goal: profile.goal || 'muscle',
          trainingFrequency: profile.trainingDays || 3,
          gender: profile.gender || 'male',
          age: profile.age || 25,
          weight: profile.weight || 70,
          height: profile.height || 175,
          activityLevel,
          focusAreas: profile.focusAreas || [],
          equipmentType: profile.equipmentType || 'gym',
          name: profile.name || undefined,
        };
        
        console.log('[EditProfile] Saving complete profile payload:', profilePayload);
        await authenticatedPost('/api/fitness-profile', profilePayload);
        console.log('[EditProfile] Complete fitness profile saved to backend');
        
        // Recalculate calorie goal if weight/height/age changed
        if (profile.weight && profile.height && profile.age && profile.gender) {
          console.log('[EditProfile] Recalculating caloric goal based on updated profile...');
          
          let backendGoal: 'weight_loss' | 'maintenance' | 'weight_gain' = 'maintenance';
          if (profile.goal === 'weight-loss') {
            backendGoal = 'weight_loss';
          } else if (profile.goal === 'muscle' || profile.goal === 'strength') {
            backendGoal = 'weight_gain';
          }
          
          const caloricGoalResponse = await authenticatedPost('/api/dashboard/calculate-caloric-goal', {
            age: profile.age,
            gender: profile.gender,
            weight: profile.weight,
            height: profile.height,
            activityLevel,
            goal: backendGoal,
          });
          
          console.log('[EditProfile] Caloric goal recalculated:', caloricGoalResponse?.dailyCalorieGoal || 'unknown');
        }
        
        console.log('[EditProfile] Profile and caloric goal saved successfully');
      } catch (error) {
        console.error('[EditProfile] Error saving to backend:', error);
      }
      
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[EditProfile] Error saving profile:', error);
      setShowErrorModal(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Profile',
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
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.grey}
              value={profile.name || ''}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              placeholderTextColor={colors.grey}
              keyboardType="numeric"
              value={profile.age?.toString() || ''}
              onChangeText={(text) => setProfile({ ...profile, age: parseInt(text) || 0 })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Stats</Text>
          
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Updating your body stats will automatically recalculate your daily caloric goal
            </Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="70"
              placeholderTextColor={colors.grey}
              keyboardType="numeric"
              value={profile.weight?.toString() || ''}
              onChangeText={(text) => setProfile({ ...profile, weight: parseFloat(text) || 0 })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="175"
              placeholderTextColor={colors.grey}
              keyboardType="numeric"
              value={profile.height?.toString() || ''}
              onChangeText={(text) => setProfile({ ...profile, height: parseFloat(text) || 0 })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Frequency</Text>
          
          <View style={styles.frequencyGrid}>
            {[2, 3, 4, 5, 6].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.frequencyCard,
                  profile.trainingDays === days && styles.frequencyCardSelected,
                ]}
                onPress={() => setProfile({ ...profile, trainingDays: days })}
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
                  days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
        type="success"
        title="Success"
        message="Profile updated successfully! Your caloric goal has been recalculated."
        confirmText="OK"
      />

      <Modal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Error"
        message="Failed to save profile. Please try again."
        confirmText="OK"
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
