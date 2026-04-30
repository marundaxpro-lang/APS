
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import ParticleBackground from '@/components/ParticleBackground';

export default function NotificationsScreen() {
  const { t } = useTranslation();
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
          title: t('notifications.title'),
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
          <Text style={styles.sectionTitle}>{t('notifications.training')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="dumbbell.fill"
                android_material_icon_name="fitness-center"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('notifications.sessionReminders')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.sessionRemindersDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={workoutReminders}
              onValueChange={(v) => {
                console.log('[Notifications] User toggled session reminders:', v);
                setWorkoutReminders(v);
              }}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.nutritionSection')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('notifications.mealReminders')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.mealRemindersDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={mealReminders}
              onValueChange={(v) => {
                console.log('[Notifications] User toggled meal reminders:', v);
                setMealReminders(v);
              }}
              trackColor={{ false: colors.grey, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notifications.progress')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={24}
                color={colors.primary}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('notifications.weeklySummaries')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.weeklySummariesDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={progressUpdates}
              onValueChange={(v) => {
                console.log('[Notifications] User toggled weekly summaries:', v);
                setProgressUpdates(v);
              }}
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
                <Text style={styles.settingTitle}>{t('notifications.social')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.socialDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={socialNotifications}
              onValueChange={(v) => {
                console.log('[Notifications] User toggled social notifications:', v);
                setSocialNotifications(v);
              }}
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
                <Text style={styles.settingTitle}>{t('notifications.milestones')}</Text>
                <Text style={styles.settingDescription}>
                  {t('notifications.milestonesDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={achievementAlerts}
              onValueChange={(v) => {
                console.log('[Notifications] User toggled milestone alerts:', v);
                setAchievementAlerts(v);
              }}
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
