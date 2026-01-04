
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WORKOUT_SPLIT = ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Rest'];

export default function PlanScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const handleDayPress = (dayIndex: number) => {
    const today = new Date().getDay();
    if (dayIndex !== today) {
      Alert.alert(
        'Wrong Day',
        'This workout is scheduled for a different day. Would you like to continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => setSelectedDay(dayIndex) },
        ]
      );
    } else {
      setSelectedDay(dayIndex);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Plan</Text>
          <Text style={styles.subtitle}>Your training schedule</Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.daysRow}>
            {DAYS.map((day, index) => {
              const dayIndex = index === 6 ? 0 : index + 1;
              const isToday = dayIndex === new Date().getDay();
              const isSelected = dayIndex === selectedDay;

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCard,
                    isToday && styles.dayCardToday,
                    isSelected && styles.dayCardSelected,
                  ]}
                  onPress={() => handleDayPress(dayIndex)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      (isToday || isSelected) && styles.dayTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                  <View
                    style={[
                      styles.workoutIndicator,
                      WORKOUT_SPLIT[index] === 'Rest' && styles.restIndicator,
                    ]}
                  >
                    <Text style={styles.workoutText}>{WORKOUT_SPLIT[index]}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>
            {WORKOUT_SPLIT[selectedDay === 0 ? 6 : selectedDay - 1]} Day
          </Text>
          <Text style={styles.detailsSubtitle}>
            {selectedDay === new Date().getDay() ? "Today's workout" : 'Scheduled workout'}
          </Text>

          {WORKOUT_SPLIT[selectedDay === 0 ? 6 : selectedDay - 1] === 'Rest' ? (
            <View style={styles.restDay}>
              <IconSymbol
                ios_icon_name="bed.double.fill"
                android_material_icon_name="hotel"
                size={48}
                color={colors.primary}
              />
              <Text style={styles.restDayText}>Rest & Recovery</Text>
              <Text style={styles.restDaySubtext}>
                Take this day to recover and prepare for your next workout
              </Text>
            </View>
          ) : (
            <View style={styles.workoutDetails}>
              <View style={styles.detailRow}>
                <IconSymbol
                  ios_icon_name="figure.strengthtraining.traditional"
                  android_material_icon_name="fitness-center"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Workout Type</Text>
                  <Text style={styles.detailValue}>
                    {WORKOUT_SPLIT[selectedDay === 0 ? 6 : selectedDay - 1]}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <IconSymbol
                  ios_icon_name="clock.fill"
                  android_material_icon_name="schedule"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>45-60 minutes</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <IconSymbol
                  ios_icon_name="list.bullet"
                  android_material_icon_name="list"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Exercises</Text>
                  <Text style={styles.detailValue}>8-12 exercises</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Training Tips</Text>
          <View style={styles.tipItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.tipText}>Warm up for 5-10 minutes before starting</Text>
          </View>
          <View style={styles.tipItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.tipText}>Focus on proper form over heavy weight</Text>
          </View>
          <View style={styles.tipItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.tipText}>Rest 60-90 seconds between sets</Text>
          </View>
        </View>
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
  calendarCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 12,
  },
  dayCardToday: {
    backgroundColor: colors.grey,
  },
  dayCardSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dayTextActive: {
    color: colors.text,
  },
  workoutIndicator: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  restIndicator: {
    backgroundColor: colors.grey,
  },
  workoutText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  detailsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  restDay: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  restDayText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  restDaySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  workoutDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tipsCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
});
