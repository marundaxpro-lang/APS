
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import ParticleBackground from '@/components/ParticleBackground';

export default function NotificationsScreen() {
  const router = useRouter();
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(false);
  const [socialNotifications, setSocialNotifications] = useState(true);
  const [achievementAlerts, setAchievementAlerts] = useState(true);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
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
          <Text style={styles.sectionTitle}>Workout Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="dumbbell.fill"
                android_material_icon_name="fitness-center"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Workout Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified when it&apos;s time to train
                </Text>
              </View>
            </View>
            <Switch
              value={workoutReminders}
              onValueChange={setWorkoutReminders}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Meal Reminders</Text>
                <Text style={styles.settingDescription}>
                  Reminders to log your meals
                </Text>
              </View>
            </View>
            <Switch
              value={mealReminders}
              onValueChange={setMealReminders}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress & Social</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Progress Updates</Text>
                <Text style={styles.settingDescription}>
                  Weekly progress summaries
                </Text>
              </View>
            </View>
            <Switch
              value={progressUpdates}
              onValueChange={setProgressUpdates}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Social Notifications</Text>
                <Text style={styles.settingDescription}>
                  Likes, comments, and friend requests
                </Text>
              </View>
            </View>
            <Switch
              value={socialNotifications}
              onValueChange={setSocialNotifications}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="trophy.fill"
                android_material_icon_name="emoji-events"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Achievement Alerts</Text>
                <Text style={styles.settingDescription}>
                  Celebrate your milestones
                </Text>
              </View>
            </View>
            <Switch
              value={achievementAlerts}
              onValueChange={setAchievementAlerts}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
