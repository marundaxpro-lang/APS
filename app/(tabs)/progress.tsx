
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
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { achievementTemplates } from '@/data/achievements';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      
      // Load measurements
      const measurementsData = await authenticatedGet('/api/measurements');
      if (measurementsData && Array.isArray(measurementsData)) {
        setMeasurements(measurementsData);
        console.log('[Progress] Loaded measurements from backend');
      } else {
        // Fallback data
        setMeasurements([
          { date: '2025-01-01', weight: 85, bodyFat: 18 },
          { date: '2025-01-15', weight: 83, bodyFat: 17 },
          { date: '2025-02-01', weight: 81, bodyFat: 16 },
        ]);
      }
      
      // Load progress photos
      const photosData = await authenticatedGet('/api/progress-photos');
      if (photosData && Array.isArray(photosData)) {
        setPhotos(photosData);
        console.log('[Progress] Loaded photos from backend');
      } else {
        // Fallback data
        setPhotos([
          { id: '1', url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', date: '2025-01-01' },
          { id: '2', url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', date: '2025-02-01' },
        ]);
      }
      
      // Load achievements
      const achievementsData = await authenticatedGet('/api/achievements');
      if (achievementsData && Array.isArray(achievementsData)) {
        setAchievements(achievementsData);
        console.log('[Progress] Loaded achievements from backend');
      } else {
        // Fallback data
        setAchievements(achievementTemplates.slice(0, 4).map((ach) => ({
          ...ach,
          unlocked_date: new Date().toISOString(),
        })));
      }
    } catch (error) {
      console.error('[Progress] Error loading progress data:', error);
      // Use fallback data on error
      setMeasurements([
        { date: '2025-01-01', weight: 85, bodyFat: 18 },
        { date: '2025-01-15', weight: 83, bodyFat: 17 },
        { date: '2025-02-01', weight: 81, bodyFat: 16 },
      ]);
      setPhotos([
        { id: '1', url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', date: '2025-01-01' },
      ]);
      setAchievements(achievementTemplates.slice(0, 4).map((ach) => ({
        ...ach,
        unlocked_date: new Date().toISOString(),
      })));
    } finally {
      setLoading(false);
    }
  };

  const addMeasurement = async (weight: number, bodyFat: number) => {
    try {
      const measurementData = {
        weight,
        body_fat: bodyFat,
        date: new Date().toISOString().split('T')[0],
      };
      
      await authenticatedPost('/api/measurements', measurementData);
      console.log('[Progress] Measurement saved successfully');
      loadProgressData();
    } catch (error) {
      console.error('[Progress] Error saving measurement:', error);
    }
  };

  const addProgressPhoto = async (photoUrl: string) => {
    try {
      const photoData = {
        url: photoUrl,
        date: new Date().toISOString().split('T')[0],
      };
      
      await authenticatedPost('/api/progress-photos', photoData);
      console.log('[Progress] Progress photo saved successfully');
      loadProgressData();
    } catch (error) {
      console.error('[Progress] Error saving progress photo:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentWeight = measurements.length > 0 ? measurements[measurements.length - 1].weight : 0;
  const currentBodyFat = measurements.length > 0 ? measurements[measurements.length - 1].bodyFat || measurements[measurements.length - 1].body_fat : 0;
  const weightChange = measurements.length > 1 ? measurements[0].weight - currentWeight : 0;
  const bodyFatChange = measurements.length > 1 ? (measurements[0].bodyFat || measurements[0].body_fat) - currentBodyFat : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Track your transformation</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="scalemass.fill"
              android_material_icon_name="monitor-weight"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{currentWeight} kg</Text>
            <Text style={styles.statLabel}>Current Weight</Text>
            <Text style={styles.statChange}>{weightChange > 0 ? '-' : '+'}{Math.abs(weightChange)} kg</Text>
          </View>

          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="percent"
              android_material_icon_name="percent"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{currentBodyFat}%</Text>
            <Text style={styles.statLabel}>Body Fat</Text>
            <Text style={styles.statChange}>{bodyFatChange > 0 ? '-' : '+'}{Math.abs(bodyFatChange)}%</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Progress</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              📊 Line chart showing weight over time
            </Text>
            {measurements.map((m, i) => (
              <Text key={i} style={styles.chartDataPoint}>
                {m.date}: {m.weight}kg
              </Text>
            ))}
          </View>
        </View>

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
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name={achievement.icon}
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton}>
          <IconSymbol
            ios_icon_name="square.and.arrow.up.fill"
            android_material_icon_name="share"
            size={20}
            color="#ffffff"
          />
          <Text style={styles.shareButtonText}>Share Progress</Text>
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
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
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statChange: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  chartDataPoint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
