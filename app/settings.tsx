import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/SettingsContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon,
  iosIcon,
  label,
  value,
  onPress,
  showChevron = true,
  disabled = false,
  comingSoon = false,
  last = false,
}: {
  icon: string;
  iosIcon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  last?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast, disabled && styles.rowDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <IconSymbol
            ios_icon_name={iosIcon}
            android_material_icon_name={icon}
            size={16}
            color={disabled ? 'rgba(255,255,255,0.25)' : colors.primary}
          />
        </View>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        {comingSoon && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>SOON</Text>
          </View>
        )}
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, disabled && styles.rowValueDisabled]}>{value}</Text>
        ) : null}
        {showChevron && !disabled && (
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={14}
            color="rgba(255,255,255,0.2)"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon,
  iosIcon,
  label,
  value,
  onToggle,
  disabled = false,
  comingSoon = false,
  last = false,
}: {
  icon: string;
  iosIcon: string;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <IconSymbol
            ios_icon_name={iosIcon}
            android_material_icon_name={icon}
            size={16}
            color={disabled ? 'rgba(255,255,255,0.25)' : colors.primary}
          />
        </View>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        {comingSoon && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>SOON</Text>
          </View>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary }}
        thumbColor="#fff"
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// ─── Inline picker for unit system ────────────────────────────────────────────

function UnitPicker({
  value,
  onChange,
}: {
  value: 'metric' | 'imperial';
  onChange: (v: 'metric' | 'imperial') => void;
}) {
  const { t } = useTranslation();
  const metricLabel = t('settings.metric');
  const imperialLabel = t('settings.imperial');
  const metricSub = 'kg · cm · km';
  const imperialSub = 'lbs · ft/in · mi';

  return (
    <View style={styles.segmentRow}>
      <TouchableOpacity
        style={[styles.segment, value === 'metric' && styles.segmentActive]}
        onPress={() => onChange('metric')}
        activeOpacity={0.8}
      >
        <Text style={[styles.segmentText, value === 'metric' && styles.segmentTextActive]}>
          {metricLabel}
        </Text>
        <Text style={[styles.segmentSub, value === 'metric' && styles.segmentSubActive]}>
          {metricSub}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segment, value === 'imperial' && styles.segmentActive]}
        onPress={() => onChange('imperial')}
        activeOpacity={0.8}
      >
        <Text style={[styles.segmentText, value === 'imperial' && styles.segmentTextActive]}>
          {imperialLabel}
        </Text>
        <Text style={[styles.segmentSub, value === 'imperial' && styles.segmentSubActive]}>
          {imperialSub}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Inline picker for date format ────────────────────────────────────────────

type DateFormatValue = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

const DATE_FORMAT_OPTIONS: { value: DateFormatValue; label: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

function DateFormatPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: DateFormatValue) => void;
}) {
  return (
    <View style={styles.optionList}>
      {DATE_FORMAT_OPTIONS.map(opt => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionRow, isActive && styles.optionRowActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
              {opt.label}
            </Text>
            <View style={[styles.optionCheck, isActive && styles.optionCheckActive]}>
              {isActive && <Text style={styles.optionCheckMark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Inline picker for first day of week ──────────────────────────────────────

function WeekStartPicker({
  value,
  onChange,
}: {
  value: 0 | 1;
  onChange: (v: 0 | 1) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.segmentRow}>
      <TouchableOpacity
        style={[styles.segment, value === 1 && styles.segmentActive]}
        onPress={() => onChange(1)}
        activeOpacity={0.8}
      >
        <Text style={[styles.segmentText, value === 1 && styles.segmentTextActive]}>
          {t('settings.monday')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segment, value === 0 && styles.segmentActive]}
        onPress={() => onChange(0)}
        activeOpacity={0.8}
      >
        <Text style={[styles.segmentText, value === 0 && styles.segmentTextActive]}>
          {t('settings.sunday')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { settings, updateSetting } = useSettings();

  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language);
  const currentLangLabel = currentLang?.nativeLabel ?? 'English';
  const unitLabel = settings.unitSystem === 'metric' ? t('settings.metric') : t('settings.imperial');
  const weekLabel = settings.firstDayOfWeek === 1 ? t('settings.monday') : t('settings.sunday');
  const versionText = t('settings.version');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LANGUAGE & REGION ── */}
        <SectionHeader title={t('settings.languageRegion')} />
        <Card>
          <SettingRow
            icon="language"
            iosIcon="globe"
            label={t('settings.language')}
            value={currentLangLabel}
            onPress={() => {
              console.log('[Settings] User tapped Language row');
              router.push('/language-select?from=settings');
            }}
          />
          <SettingRow
            icon="straighten"
            iosIcon="ruler"
            label={t('settings.units')}
            value={unitLabel}
            onPress={() => {
              console.log('[Settings] User tapped Units row, toggling picker');
              setShowUnitPicker(v => !v);
            }}
            showChevron={!showUnitPicker}
          />
          {showUnitPicker && (
            <UnitPicker
              value={settings.unitSystem}
              onChange={v => {
                console.log('[Settings] User selected unit system:', v);
                updateSetting('unitSystem', v);
                setShowUnitPicker(false);
              }}
            />
          )}
          <SettingRow
            icon="calendar_today"
            iosIcon="calendar"
            label={t('settings.dateFormat')}
            value={settings.dateFormat}
            onPress={() => {
              console.log('[Settings] User tapped Date Format row, toggling picker');
              setShowDatePicker(v => !v);
            }}
            showChevron={!showDatePicker}
          />
          {showDatePicker && (
            <DateFormatPicker
              value={settings.dateFormat}
              onChange={v => {
                console.log('[Settings] User selected date format:', v);
                updateSetting('dateFormat', v);
                setShowDatePicker(false);
              }}
            />
          )}
          <SettingRow
            icon="view_week"
            iosIcon="calendar.badge.clock"
            label={t('settings.weekStartsOn')}
            value={weekLabel}
            onPress={() => {
              console.log('[Settings] User tapped Week Starts On row, toggling picker');
              setShowWeekPicker(v => !v);
            }}
            showChevron={!showWeekPicker}
            last={!showWeekPicker}
          />
          {showWeekPicker && (
            <WeekStartPicker
              value={settings.firstDayOfWeek}
              onChange={v => {
                console.log('[Settings] User selected week start:', v);
                updateSetting('firstDayOfWeek', v);
                setShowWeekPicker(false);
              }}
            />
          )}
        </Card>

        {/* ── APPEARANCE ── */}
        <SectionHeader title={t('settings.appearance')} />
        <Card>
          <SettingRow
            icon="palette"
            iosIcon="paintbrush"
            label={t('settings.theme')}
            value={t('settings.themeDark')}
            onPress={() => {}}
            disabled
            comingSoon
            last
          />
        </Card>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title={t('settings.notifications')} />
        <Card>
          <ToggleRow
            icon="notifications"
            iosIcon="bell"
            label={t('settings.pushNotifications')}
            value={settings.notificationsEnabled}
            onToggle={v => {
              console.log('[Settings] User toggled Push Notifications:', v);
              updateSetting('notificationsEnabled', v);
            }}
          />
          <ToggleRow
            icon="email"
            iosIcon="envelope"
            label={t('settings.marketingEmails')}
            value={settings.marketingEmailsEnabled}
            onToggle={v => {
              console.log('[Settings] User toggled Marketing Emails:', v);
              updateSetting('marketingEmailsEnabled', v);
            }}
            last
          />
        </Card>

        {/* ── PRIVACY ── */}
        <SectionHeader title={t('settings.privacy')} />
        <Card>
          <ToggleRow
            icon="bar_chart"
            iosIcon="chart.bar"
            label={t('settings.analytics')}
            value={settings.analyticsEnabled}
            onToggle={v => {
              console.log('[Settings] User toggled Analytics:', v);
              updateSetting('analyticsEnabled', v);
            }}
          />
          <SettingRow
            icon="lock"
            iosIcon="lock.shield"
            label={t('settings.privacySecurity')}
            onPress={() => {
              console.log('[Settings] User tapped Privacy & Security');
              router.push('/privacy-security');
            }}
          />
          <SettingRow
            icon="description"
            iosIcon="doc.text"
            label={t('settings.termsOfService')}
            onPress={() => {}}
            disabled
            comingSoon
            last
          />
        </Card>

        {/* ── SUPPORT ── */}
        <SectionHeader title={t('settings.support')} />
        <Card>
          <SettingRow
            icon="help_outline"
            iosIcon="questionmark.circle"
            label={t('settings.helpSupport')}
            onPress={() => {
              console.log('[Settings] User tapped Help & Support');
              router.push('/help-support');
            }}
          />
          <SettingRow
            icon="info_outline"
            iosIcon="info.circle"
            label={t('settings.about')}
            onPress={() => {
              console.log('[Settings] User tapped About');
              router.push('/about');
            }}
            last
          />
        </Card>

        {/* ── CURRENCY ── */}
        <SectionHeader title={t('settings.currency')} />
        <Card>
          <SettingRow
            icon="attach_money"
            iosIcon="dollarsign.circle"
            label={t('settings.displayCurrency')}
            value={settings.currency}
            onPress={() => {}}
            disabled
            comingSoon
            last
          />
        </Card>

        <Text style={styles.versionText}>{versionText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(69,155,155,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    flexShrink: 1,
  },
  rowLabelDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  rowValueDisabled: {
    color: 'rgba(255,255,255,0.2)',
  },
  soonBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  soonBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 0.8,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(69,155,155,0.12)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  segmentTextActive: {
    color: colors.text,
  },
  segmentSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
  segmentSubActive: {
    color: 'rgba(255,255,255,0.5)',
  },
  optionList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  optionRowActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(69,155,155,0.1)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    fontVariant: ['tabular-nums'],
  },
  optionLabelActive: {
    color: colors.text,
  },
  optionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionCheckMark: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 32,
    letterSpacing: 0.5,
  },
});
