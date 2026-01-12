
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { achievementTemplates } from '@/data/achievements';
import { Measurement, FitnessProfile } from '@/types/fitness';
import ParticleBackground from '@/components/ParticleBackground';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      
      // Load profile
      const profileData = await AsyncStorage.getItem('fitnessProfile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }

      // Try to load measurements from backend
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const backendMeasurements = await authenticatedGet('/api/measurements');
        
        if (backendMeasurements && Array.isArray(backendMeasurements)) {
          setMeasurements(backendMeasurements);
          await AsyncStorage.setItem('measurements', JSON.stringify(backendMeasurements));
          console.log('[Progress] Measurements loaded from backend');
        }
      } catch (error) {
        console.log('[Progress] Could not load measurements from backend, using local data');
        // Fallback to local storage
        const measurementsData = await AsyncStorage.getItem('measurements');
        if (measurementsData) {
          setMeasurements(JSON.parse(measurementsData));
        } else {
          // Initialize with profile data if available
          if (profileData) {
            const prof = JSON.parse(profileData);
            const initialMeasurement: Measurement = {
              id: Date.now().toString(),
              weight: prof.weight || 70,
              bodyFat: 18,
              date: new Date().toISOString().split('T')[0],
            };
            setMeasurements([initialMeasurement]);
            await AsyncStorage.setItem('measurements', JSON.stringify([initialMeasurement]));
          }
        }
      }
      
      // Try to load progress photos from backend
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const backendPhotos = await authenticatedGet('/api/progress-photos');
        
        if (backendPhotos && Array.isArray(backendPhotos)) {
          setPhotos(backendPhotos);
          await AsyncStorage.setItem('progressPhotos', JSON.stringify(backendPhotos));
          console.log('[Progress] Photos loaded from backend');
        }
      } catch (error) {
        console.log('[Progress] Could not load photos from backend, using local data');
        // Fallback to local storage
        const photosData = await AsyncStorage.getItem('progressPhotos');
        if (photosData) {
          setPhotos(JSON.parse(photosData));
        } else {
          setPhotos([]);
        }
      }
      
      // Try to load achievements from backend
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const backendAchievements = await authenticatedGet('/api/achievements');
        
        if (backendAchievements && Array.isArray(backendAchievements)) {
          setAchievements(backendAchievements);
          console.log('[Progress] Achievements loaded from backend');
        }
      } catch (error) {
        console.log('[Progress] Could not load achievements from backend, using mock data');
        // Fallback to mock data
        setAchievements(achievementTemplates.slice(0, 6).map((ach, index) => ({
          ...ach,
          unlocked: index < 3,
          unlocked_date: index < 3 ? new Date().toISOString() : null,
        })));
      }
    } catch (error) {
      console.error('[Progress] Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMeasurement = async () => {
    if (!newWeight) return;

    try {
      const measurement: Measurement = {
        id: Date.now().toString(),
        weight: parseFloat(newWeight),
        bodyFat: newBodyFat ? parseFloat(newBodyFat) : undefined,
        date: new Date().toISOString().split('T')[0],
      };

      // Optimistically update UI
      const updated = [...measurements, measurement];
      setMeasurements(updated);
      await AsyncStorage.setItem('measurements', JSON.stringify(updated));
      
      // Save to backend
      try {
        const { authenticatedPost } = await import('@/utils/api');
        await authenticatedPost('/api/measurements', {
          weight: measurement.weight,
          bodyFat: measurement.bodyFat,
          date: measurement.date,
        });
        console.log('[Progress] Measurement saved to backend');
      } catch (error) {
        console.error('[Progress] Error saving measurement to backend:', error);
        // Continue anyway - data is saved locally
      }
      
      setShowAddModal(false);
      setNewWeight('');
      setNewBodyFat('');
    } catch (error) {
      console.error('[Progress] Error saving measurement:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ParticleBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentWeight = measurements.length > 0 ? measurements[measurements.length - 1].weight : profile?.weight || 0;
  const currentBodyFat = measurements.length > 0 ? measurements[measurements.length - 1].bodyFat : 18;
  const startWeight = measurements.length > 0 ? measurements[0].weight : currentWeight;
  const weightChange = startWeight - currentWeight;
  const startBodyFat = measurements.length > 0 ? measurements[0].bodyFat || 18 : 18;
  const bodyFatChange = startBodyFat - (currentBodyFat || 18);

  // Calculate BMI
  const heightInMeters = (profile?.height || 175) / 100;
  const bmi = currentWeight / (heightInMeters * heightInMeters);

  return (
    <View style={styles.container}>
      <ParticleBackground />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Track your transformation journey</Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <IconSymbol
                ios_icon_name="scalemass.fill"
                android_material_icon_name="monitor-weight"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={styles.statValue}>{currentWeight.toFixed(1)}</Text>
            <Text style={styles.statUnit}>kg</Text>
            <Text style={styles.statLabel}>Current Weight</Text>
            {weightChange !== 0 && (
              <View style={[styles.statBadge, weightChange > 0 && styles.statBadgePositive]}>
                <Text style={styles.statBadgeText}>
                  {weightChange > 0 ? '-' : '+'}{Math.abs(weightChange).toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <IconSymbol
                ios_icon_name="percent"
                android_material_icon_name="percent"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={styles.statValue}>{(currentBodyFat || 18).toFixed(1)}</Text>
            <Text style={styles.statUnit}>%</Text>
            <Text style={styles.statLabel}>Body Fat</Text>
            {bodyFatChange !== 0 && (
              <View style={[styles.statBadge, bodyFatChange > 0 && styles.statBadgePositive]}>
                <Text style={styles.statBadgeText}>
                  {bodyFatChange > 0 ? '-' : '+'}{Math.abs(bodyFatChange).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <IconSymbol
                ios_icon_name="chart.bar.fill"
                android_material_icon_name="bar-chart"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={styles.statValue}>{bmi.toFixed(1)}</Text>
            <Text style={styles.statUnit}>BMI</Text>
            <Text style={styles.statLabel}>Body Mass Index</Text>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>
                {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}
              </Text>
            </View>
          </View>
        </View>

        {/* Weight Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weight Progress</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {measurements.length > 0 ? (
            <View style={styles.chart}>
              {/* Simple line chart visualization */}
              <View style={styles.chartGrid}>
                {measurements.map((m, index) => {
                  const maxWeight = Math.max(...measurements.map(m => m.weight));
                  const minWeight = Math.min(...measurements.map(m => m.weight));
                  const range = maxWeight - minWeight || 1;
                  const heightPercent = ((m.weight - minWeight) / range) * 100;
                  
                  return (
                    <View key={m.id} style={styles.chartBar}>
                      <View style={styles.chartBarContainer}>
                        <View 
                          style={[
                            styles.chartBarFill,
                            { height: `${Math.max(heightPercent, 10)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.chartBarLabel}>{m.weight.toFixed(0)}</Text>
                      <Text style={styles.chartBarDate}>
                        {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.chartEmpty}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="show-chart"
                size={48}
                color={colors.grey}
              />
              <Text style={styles.chartEmptyText}>No measurements yet</Text>
              <TouchableOpacity 
                style={styles.chartEmptyButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.chartEmptyButtonText}>Add First Measurement</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Progress Photos */}
        <View style={styles.photosSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress Photos</Text>
            <TouchableOpacity>
              <IconSymbol
                ios_icon_name="camera.fill"
                android_material_icon_name="camera"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.url }} style={styles.photoImage} />
                  <Text style={styles.photoDate}>{photo.date}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoCard}>
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={48}
                  color={colors.primary}
                />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.photosEmpty}>
              <IconSymbol
                ios_icon_name="photo.on.rectangle"
                android_material_icon_name="photo-library"
                size={48}
                color={colors.grey}
              />
              <Text style={styles.photosEmptyText}>No progress photos yet</Text>
              <Text style={styles.photosEmptySubtext}>
                Take photos to track your visual transformation
              </Text>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View 
                key={achievement.id} 
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementCardLocked
                ]}
              >
                <View style={[
                  styles.achievementIcon,
                  !achievement.unlocked && styles.achievementIconLocked
                ]}>
                  <IconSymbol
                    ios_icon_name={achievement.unlocked ? 'star.fill' : 'star'}
                    android_material_icon_name={achievement.unlocked ? 'star' : 'star-border'}
                    size={28}
                    color={achievement.unlocked ? colors.primary : colors.grey}
                  />
                </View>
                <Text style={[
                  styles.achievementTitle,
                  !achievement.unlocked && styles.achievementTitleLocked
                ]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton}>
          <IconSymbol
            ios_icon_name="square.and.arrow.up.fill"
            android_material_icon_name="share"
            size={20}
            color="#ffffff"
          />
          <Text style={styles.shareButtonText}>Share My Progress</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Measurement Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Measurement</Text>
            <Text style={styles.modalSubtitle}>Track your progress over time</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Weight (kg) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="70.5"
                placeholderTextColor={colors.grey}
                keyboardType="decimal-pad"
                value={newWeight}
                onChangeText={setNewWeight}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Body Fat % (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="18.5"
                placeholderTextColor={colors.grey}
                keyboardType="decimal-pad"
                value={newBodyFat}
                onChangeText={setNewBodyFat}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowAddModal(false);
                  setNewWeight('');
                  setNewBodyFat('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonSave,
                  !newWeight && styles.modalButtonSaveDisabled
                ]}
                onPress={addMeasurement}
                disabled={!newWeight}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(69,155,155,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  statUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  statBadgePositive: {
    backgroundColor: 'rgba(74,222,128,0.2)',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    padding: 4,
  },
  chart: {
    height: 200,
  },
  chartGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBarContainer: {
    width: '80%',
    height: 140,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 20,
  },
  chartBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  chartBarDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  chartEmpty: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  chartEmptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  chartEmptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  chartEmptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  photosSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  photosScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  photoCard: {
    marginRight: 12,
  },
  photoImage: {
    width: 150,
    height: 200,
    borderRadius: 16,
    marginBottom: 8,
  },
  photoDate: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addPhotoCard: {
    width: 150,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  photosEmpty: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  photosEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  photosEmptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  achievementCard: {
    width: (width - 52) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  achievementCardLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(69,155,155,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIconLocked: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: colors.textSecondary,
  },
  achievementDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonSave: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSaveDisabled: {
    opacity: 0.5,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
