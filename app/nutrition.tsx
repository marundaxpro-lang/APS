
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  FoodItem,
  MealTemplate,
  MealLog,
  DailyNutrition,
  QUICK_FOODS,
  DEFAULT_MEAL_TEMPLATES,
  getProteinStatus,
  getDailyNutrition,
  logMealFromTemplate,
  logFoodItem,
  getFrequentTemplates,
  searchTemplates,
  getNutritionFeedback,
  MEAL_TYPE_LABELS,
  ProteinStatus,
} from '@/utils/nutritionEngine';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#00D4AA';
const TEAL_DIM = 'rgba(0,212,170,0.10)';
const TEAL_BORDER = 'rgba(0,212,170,0.25)';
const ORANGE = '#FF8C42';
const ORANGE_DIM = 'rgba(255,140,66,0.10)';
const BLUE = '#60A5FA';
const YELLOW = '#F59E0B';
const RED = '#EF4444';
const CARD_BG = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const SCREEN_BG = '#0A0A0A';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';

const STORAGE_KEYS = {
  MEAL_LOGS: 'apex_meal_logs',
  MEAL_TEMPLATES: 'apex_meal_templates',
  NUTRITION_TARGETS: 'apex_nutrition_targets',
} as const;

const DEFAULT_TARGETS = { calories: 2200, protein: 175, carbs: 220, fat: 70 };

type MealType = MealLog['mealType'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function todayDisplay(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function statusColor(status: ProteinStatus['status']): string {
  if (status === 'achieved' || status === 'on_track') return TEAL;
  if (status === 'behind') return ORANGE;
  return RED;
}

function statusLabel(status: ProteinStatus['status']): string {
  if (status === 'achieved') return 'Achieved';
  if (status === 'on_track') return 'On Track';
  if (status === 'behind') return 'Behind';
  return 'Critical';
}

function mealTypeColor(type: MealType): string {
  const map: Record<MealType, string> = {
    breakfast: TEAL,
    lunch: BLUE,
    dinner: '#A78BFA',
    snack: ORANGE,
    pre_workout: YELLOW,
    post_workout: TEAL,
  };
  return map[type];
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function AnimatedBar({ fraction, color, height = 8 }: { fraction: number; color: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(1, Math.max(0, fraction)), duration: 700, useNativeDriver: false }).start();
  }, [fraction, anim]);
  return (
    <View style={[barStyles.track, { height }]}>
      <Animated.View style={[barStyles.fill, { height, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' },
  fill: { borderRadius: 99 },
});

// ─── Animated List Item ───────────────────────────────────────────────────────

function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 45, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 45, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── Macro Mini Card ──────────────────────────────────────────────────────────

function MacroCard({ label, logged, target, color }: { label: string; logged: number; target: number; color: string }) {
  const fraction = target > 0 ? logged / target : 0;
  const loggedStr = String(Math.round(logged));
  const targetStr = String(Math.round(target));
  return (
    <View style={macroStyles.card}>
      <Text style={[macroStyles.label, { color }]}>{label}</Text>
      <View style={macroStyles.row}>
        <Text style={macroStyles.logged}>{loggedStr}</Text>
        <Text style={macroStyles.sep}>/</Text>
        <Text style={macroStyles.target}>{targetStr}</Text>
        <Text style={macroStyles.unit}>g</Text>
      </View>
      <AnimatedBar fraction={fraction} color={color} height={4} />
    </View>
  );
}

const macroStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: CARD_BORDER, gap: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  logged: { fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY },
  sep: { fontSize: 14, color: TEXT_MUTED, marginBottom: 2 },
  target: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 1 },
  unit: { fontSize: 11, color: TEXT_MUTED, marginBottom: 2 },
});

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onLog,
  onFavorite,
  horizontal = false,
}: {
  template: MealTemplate;
  onLog: () => void;
  onFavorite: () => void;
  horizontal?: boolean;
}) {
  const typeColor = mealTypeColor(template.mealType);
  const typeLabel = MEAL_TYPE_LABELS[template.mealType];
  const calStr = String(template.totalCalories);
  const proteinStr = String(Math.round(template.totalProtein));
  const heartColor = template.isFavorite ? ORANGE : TEXT_MUTED;

  if (horizontal) {
    return (
      <View style={tplStyles.hCard}>
        <View style={tplStyles.hTop}>
          <View style={[tplStyles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor + '40' }]}>
            <Text style={[tplStyles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => { console.log('[Nutrition] User toggled favorite:', template.name); onFavorite(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16, color: heartColor }}>♥</Text>
          </TouchableOpacity>
        </View>
        <Text style={tplStyles.hName} numberOfLines={2}>{template.name}</Text>
        <View style={tplStyles.hMacros}>
          <Text style={tplStyles.hCal}>{calStr}</Text>
          <Text style={tplStyles.hCalLabel}> kcal</Text>
          <Text style={tplStyles.hDot}> · </Text>
          <Text style={tplStyles.hProtein}>{proteinStr}g</Text>
          <Text style={tplStyles.hProteinLabel}> protein</Text>
        </View>
        <AnimatedPressable style={tplStyles.hLogBtn} onPress={() => { console.log('[Nutrition] User tapped Log template (horizontal):', template.name); onLog(); }}>
          <Text style={tplStyles.hLogBtnText}>Log</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={tplStyles.vCard}>
      <View style={tplStyles.vLeft}>
        <View style={[tplStyles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor + '40' }]}>
          <Text style={[tplStyles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        <Text style={tplStyles.vName}>{template.name}</Text>
        <View style={tplStyles.vMacros}>
          <Text style={tplStyles.vCal}>{calStr} kcal</Text>
          <Text style={tplStyles.vDot}> · </Text>
          <Text style={tplStyles.vProtein}>{proteinStr}g protein</Text>
        </View>
      </View>
      <View style={tplStyles.vRight}>
        <TouchableOpacity onPress={() => { console.log('[Nutrition] User toggled favorite:', template.name); onFavorite(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 18, color: heartColor }}>♥</Text>
        </TouchableOpacity>
        <AnimatedPressable style={tplStyles.vLogBtn} onPress={() => { console.log('[Nutrition] User tapped Log template:', template.name); onLog(); }}>
          <Text style={tplStyles.vLogBtnText}>Log</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const tplStyles = StyleSheet.create({
  // Horizontal
  hCard: { width: 180, backgroundColor: CARD_BG, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: CARD_BORDER, gap: 8, marginRight: 10 },
  hTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 20 },
  hMacros: { flexDirection: 'row', alignItems: 'baseline' },
  hCal: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  hCalLabel: { fontSize: 11, color: TEXT_SECONDARY },
  hDot: { fontSize: 11, color: TEXT_MUTED },
  hProtein: { fontSize: 14, fontWeight: '600', color: TEAL },
  hProteinLabel: { fontSize: 11, color: TEXT_SECONDARY },
  hLogBtn: { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  hLogBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  // Vertical
  vCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 8, gap: 12 },
  vLeft: { flex: 1, gap: 5 },
  vName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  vMacros: { flexDirection: 'row', alignItems: 'center' },
  vCal: { fontSize: 12, color: TEXT_SECONDARY },
  vDot: { fontSize: 12, color: TEXT_MUTED },
  vProtein: { fontSize: 12, color: TEAL, fontWeight: '600' },
  vRight: { alignItems: 'center', gap: 10 },
  vLogBtn: { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  vLogBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  // Shared
  typeBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ─── Food Chip ────────────────────────────────────────────────────────────────

function FoodChip({ food, onLog }: { food: FoodItem; onLog: () => void }) {
  const proteinStr = String(food.protein);
  const calStr = String(food.calories);
  return (
    <AnimatedPressable style={chipStyles.chip} onPress={() => { console.log('[Nutrition] User tapped quick-fix food chip:', food.name); onLog(); }}>
      <Text style={chipStyles.name} numberOfLines={1}>{food.name}</Text>
      <Text style={chipStyles.protein}>{proteinStr}g</Text>
      <Text style={chipStyles.cal}>{calStr} kcal</Text>
    </AnimatedPressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, minWidth: 90, borderWidth: 1, borderColor: CARD_BORDER },
  name: { fontSize: 11, fontWeight: '600', color: TEXT_PRIMARY, textAlign: 'center' },
  protein: { fontSize: 16, fontWeight: '800', color: TEAL },
  cal: { fontSize: 10, color: TEXT_SECONDARY },
});

// ─── Food Grid Card ───────────────────────────────────────────────────────────

function FoodGridCard({ food, onLog }: { food: FoodItem; onLog: () => void }) {
  const proteinStr = String(food.protein);
  const calStr = String(food.calories);
  return (
    <AnimatedPressable style={gridStyles.card} onPress={() => { console.log('[Nutrition] User tapped food grid card:', food.name); onLog(); }}>
      <Text style={gridStyles.name} numberOfLines={2}>{food.name}</Text>
      <Text style={gridStyles.serving}>{food.servingSize}</Text>
      <Text style={gridStyles.protein}>{proteinStr}g</Text>
      <Text style={gridStyles.proteinLabel}>protein</Text>
      <Text style={gridStyles.cal}>{calStr} kcal</Text>
    </AnimatedPressable>
  );
}

const gridStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: CARD_BORDER, gap: 3, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 18 },
  serving: { fontSize: 11, color: TEXT_MUTED },
  protein: { fontSize: 22, fontWeight: '800', color: TEAL, marginTop: 6 },
  proteinLabel: { fontSize: 10, color: TEXT_SECONDARY, letterSpacing: 0.5 },
  cal: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
});

// ─── Logged Meal Card ─────────────────────────────────────────────────────────

function LoggedMealCard({ log, onDelete }: { log: MealLog; onDelete: () => void }) {
  const typeColor = mealTypeColor(log.mealType);
  const calStr = String(Math.round(log.totalCalories));
  const proteinStr = String(Math.round(log.totalProtein));
  const carbsStr = String(Math.round(log.totalCarbs));
  const fatStr = String(Math.round(log.totalFat));
  const timeStr = formatTime(log.loggedAt);
  const templateName = log.items.length > 0 ? log.items.map(i => i.name).join(', ') : 'Custom meal';

  return (
    <View style={logStyles.card}>
      <View style={[logStyles.accent, { backgroundColor: typeColor }]} />
      <View style={logStyles.inner}>
        <View style={logStyles.topRow}>
          <Text style={logStyles.name} numberOfLines={1}>{templateName}</Text>
          <Text style={logStyles.time}>{timeStr}</Text>
        </View>
        <View style={logStyles.macroRow}>
          <Text style={logStyles.cal}>{calStr} kcal</Text>
          <Text style={logStyles.dot}> · </Text>
          <Text style={logStyles.protein}>{proteinStr}g P</Text>
          <Text style={logStyles.dot}> · </Text>
          <Text style={logStyles.carbs}>{carbsStr}g C</Text>
          <Text style={logStyles.dot}> · </Text>
          <Text style={logStyles.fat}>{fatStr}g F</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => { console.log('[Nutrition] User deleted meal log:', log.id); onDelete(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={logStyles.deleteBtn}>
        <Text style={logStyles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const logStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden', marginBottom: 8 },
  accent: { width: 3, alignSelf: 'stretch' },
  inner: { flex: 1, padding: 12, gap: 5 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: TEXT_MUTED },
  macroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cal: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  dot: { fontSize: 11, color: TEXT_MUTED },
  protein: { fontSize: 12, color: TEAL, fontWeight: '600' },
  carbs: { fontSize: 12, color: BLUE, fontWeight: '600' },
  fat: { fontSize: 12, color: YELLOW, fontWeight: '600' },
  deleteBtn: { padding: 14 },
  deleteText: { fontSize: 13, color: TEXT_MUTED },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [allLogs, setAllLogs] = useState<Record<string, MealLog[]>>({});
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loaded, setLoaded] = useState(false);

  const today = todayStr();
  const hour = new Date().getHours();
  const todayLogs: MealLog[] = useMemo(() => allLogs[today] ?? [], [allLogs, today]);

  // ── Load from AsyncStorage ──
  useEffect(() => {
    async function load() {
      console.log('[Nutrition] Loading data from AsyncStorage');
      try {
        const [logsRaw, tplRaw, targetsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MEAL_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.MEAL_TEMPLATES),
          AsyncStorage.getItem(STORAGE_KEYS.NUTRITION_TARGETS),
        ]);

        const savedLogs: Record<string, MealLog[]> = logsRaw ? JSON.parse(logsRaw) : {};
        setAllLogs(savedLogs);

        // Merge saved templates with defaults (by id)
        const savedTpls: MealTemplate[] = tplRaw ? JSON.parse(tplRaw) : [];
        const savedIds = new Set(savedTpls.map(t => t.id));
        const merged = [
          ...savedTpls,
          ...DEFAULT_MEAL_TEMPLATES.filter(t => !savedIds.has(t.id)),
        ];
        setTemplates(merged);

        if (targetsRaw) {
          setTargets(JSON.parse(targetsRaw));
        }

        console.log('[Nutrition] Loaded', Object.keys(savedLogs).length, 'log days,', merged.length, 'templates');
      } catch (e) {
        console.error('[Nutrition] Load error:', e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  // ── Derived state ──
  const daily: DailyNutrition = useMemo(
    () => getDailyNutrition(todayLogs, targets),
    [todayLogs, targets]
  );

  const proteinStatus: ProteinStatus = useMemo(
    () => getProteinStatus(daily.totalProtein, targets.protein, hour, true),
    [daily.totalProtein, targets.protein, hour]
  );

  const feedbackText = useMemo(() => getNutritionFeedback(daily, hour), [daily, hour]);

  const frequentTemplates = useMemo(() => getFrequentTemplates(templates), [templates]);

  const filteredTemplates = useMemo(
    () => searchTemplates(templates, searchQuery),
    [templates, searchQuery]
  );

  const proteinFoods = useMemo(
    () => QUICK_FOODS.filter(f => f.category === 'protein'),
    []
  );

  // Group today's logs by meal type
  const logsByMealType = useMemo(() => {
    const map: Partial<Record<MealType, MealLog[]>> = {};
    for (const log of todayLogs) {
      if (!map[log.mealType]) map[log.mealType] = [];
      map[log.mealType]!.push(log);
    }
    return map;
  }, [todayLogs]);

  const mealTypeOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];
  const activeMealTypes = mealTypeOrder.filter(t => (logsByMealType[t]?.length ?? 0) > 0);

  // ── Persist helpers ──
  const saveLogs = useCallback(async (newLogs: Record<string, MealLog[]>) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(newLogs));
  }, []);

  const saveTemplates = useCallback(async (newTpls: MealTemplate[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(newTpls));
  }, []);

  // ── Log meal from template ──
  const logMeal = useCallback(async (template: MealTemplate) => {
    console.log('[Nutrition] User logged meal from template:', template.name, template.mealType);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newLog = logMealFromTemplate(template, today);
    const updatedLogs = { ...allLogs, [today]: [...(allLogs[today] ?? []), newLog] };
    setAllLogs(updatedLogs);
    await saveLogs(updatedLogs);

    // Update template useCount + lastUsed
    const updatedTpls = templates.map(t =>
      t.id === template.id
        ? { ...t, useCount: t.useCount + 1, lastUsed: today }
        : t
    );
    setTemplates(updatedTpls);
    await saveTemplates(updatedTpls);
  }, [allLogs, templates, today, saveLogs, saveTemplates]);

  // ── Log food item directly ──
  const logFood = useCallback(async (food: FoodItem) => {
    console.log('[Nutrition] User logged food item:', food.name, food.protein + 'g protein');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newLog = logFoodItem(food, today);
    const updatedLogs = { ...allLogs, [today]: [...(allLogs[today] ?? []), newLog] };
    setAllLogs(updatedLogs);
    await saveLogs(updatedLogs);
  }, [allLogs, today, saveLogs]);

  // ── Delete meal log ──
  const deleteMeal = useCallback(async (logId: string) => {
    console.log('[Nutrition] User deleted meal log:', logId);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updatedToday = (allLogs[today] ?? []).filter(l => l.id !== logId);
    const updatedLogs = { ...allLogs, [today]: updatedToday };
    setAllLogs(updatedLogs);
    await saveLogs(updatedLogs);
  }, [allLogs, today, saveLogs]);

  // ── Toggle favorite ──
  const toggleFavorite = useCallback(async (templateId: string) => {
    console.log('[Nutrition] User toggled favorite template:', templateId);
    const updatedTpls = templates.map(t =>
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    setTemplates(updatedTpls);
    await saveTemplates(updatedTpls);
  }, [templates, saveTemplates]);

  // ── Derived display values ──
  const proteinLoggedStr = String(Math.round(daily.totalProtein));
  const proteinTargetStr = String(Math.round(targets.protein));
  const proteinPct = String(proteinStatus.percentage);
  const calLoggedStr = String(Math.round(daily.totalCalories));
  const calTargetStr = String(Math.round(targets.calories));
  const calFraction = targets.calories > 0 ? daily.totalCalories / targets.calories : 0;
  const proteinFraction = targets.protein > 0 ? daily.totalProtein / targets.protein : 0;
  const pColor = statusColor(proteinStatus.status);
  const pLabel = statusLabel(proteinStatus.status);
  const showQuickFixes = proteinStatus.status === 'critical' || proteinStatus.status === 'behind';

  if (!loaded) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.loadingState}>
          <Text style={s.loadingText}>Loading nutrition...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <AnimatedPressable onPress={() => { console.log('[Nutrition] User pressed back button'); router.back(); }} style={s.backBtn}>
              <Text style={s.backArrow}>‹</Text>
            </AnimatedPressable>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Nutrition</Text>
              <Text style={s.headerDate}>{todayDisplay()}</Text>
            </View>
            <View style={s.headerRight} />
          </View>
          <Text style={s.feedbackText}>{feedbackText}</Text>
        </View>

        {/* ── Protein Hero Card ── */}
        <View style={s.section}>
          <View style={s.proteinCard}>
            <Text style={s.proteinLabel}>PROTEIN</Text>
            <View style={s.proteinAmountRow}>
              <Text style={s.proteinLogged}>{proteinLoggedStr}</Text>
              <Text style={s.proteinSep}>g</Text>
              <Text style={s.proteinSlash}> / </Text>
              <Text style={s.proteinTarget}>{proteinTargetStr}g</Text>
            </View>
            <AnimatedBar fraction={proteinFraction} color={pColor} height={8} />
            <View style={s.proteinStatusRow}>
              <View style={[s.statusBadge, { backgroundColor: pColor + '20', borderColor: pColor + '50' }]}>
                <Text style={[s.statusBadgeText, { color: pColor }]}>{pLabel}</Text>
              </View>
              <Text style={s.proteinPct}>{proteinPct}%</Text>
            </View>
            <Text style={s.proteinMessage}>{proteinStatus.message}</Text>
            <Text style={s.proteinTraining}>{proteinStatus.trainingConnection}</Text>

            {showQuickFixes && (
              <View style={s.quickFixSection}>
                <Text style={s.quickFixLabel}>Quick fixes</Text>
                <View style={s.quickFixRow}>
                  {proteinStatus.quickFixes.map(food => (
                    <FoodChip key={food.id} food={food} onLog={() => logFood(food)} />
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Macro Summary Row ── */}
        <View style={s.section}>
          <View style={s.macroRow}>
            <MacroCard
              label="Calories"
              logged={daily.totalCalories}
              target={targets.calories}
              color={TEAL}
            />
            <MacroCard
              label="Carbs"
              logged={daily.totalCarbs}
              target={targets.carbs}
              color={BLUE}
            />
            <MacroCard
              label="Fat"
              logged={daily.totalFat}
              target={targets.fat}
              color={YELLOW}
            />
          </View>
        </View>

        {/* ── Today's Meals ── */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeader}>TODAY'S MEALS</Text>
            <AnimatedPressable
              style={s.logMealBtn}
              onPress={() => { console.log('[Nutrition] User tapped Log Meal button'); }}
            >
              <Text style={s.logMealBtnText}>+ Log Meal</Text>
            </AnimatedPressable>
          </View>

          {todayLogs.length === 0 ? (
            <View style={s.emptyMeals}>
              <Text style={s.emptyMealsIcon}>🍴</Text>
              <Text style={s.emptyMealsTitle}>No meals logged yet</Text>
              <Text style={s.emptyMealsSubtitle}>Tap a template below to log instantly</Text>
            </View>
          ) : (
            activeMealTypes.map((mealType, sectionIdx) => {
              const sectionLogs = logsByMealType[mealType] ?? [];
              const sectionCal = sectionLogs.reduce((s, l) => s + l.totalCalories, 0);
              const sectionProtein = sectionLogs.reduce((s, l) => s + l.totalProtein, 0);
              const sectionCalStr = String(Math.round(sectionCal));
              const sectionProteinStr = String(Math.round(sectionProtein));
              const typeColor = mealTypeColor(mealType);
              return (
                <AnimatedItem key={mealType} index={sectionIdx}>
                  <View style={s.mealSection}>
                    <View style={s.mealSectionHeader}>
                      <Text style={[s.mealSectionTitle, { color: typeColor }]}>{MEAL_TYPE_LABELS[mealType]}</Text>
                      <View style={s.mealSectionStats}>
                        <Text style={s.mealSectionCal}>{sectionCalStr} kcal</Text>
                        <Text style={s.mealSectionDot}> · </Text>
                        <Text style={s.mealSectionProtein}>{sectionProteinStr}g P</Text>
                      </View>
                    </View>
                    {sectionLogs.map(log => (
                      <LoggedMealCard key={log.id} log={log} onDelete={() => deleteMeal(log.id)} />
                    ))}
                  </View>
                </AnimatedItem>
              );
            })
          )}
        </View>

        {/* ── Quick Log ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>QUICK LOG</Text>
          <Text style={s.sectionSubtitle}>Tap to log in one tap</Text>

          {frequentTemplates.length > 0 && (
            <View style={s.subsection}>
              <Text style={s.subsectionTitle}>Your Frequent Meals</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
                {frequentTemplates.map((tpl, i) => (
                  <AnimatedItem key={tpl.id} index={i}>
                    <TemplateCard
                      template={tpl}
                      onLog={() => logMeal(tpl)}
                      onFavorite={() => toggleFavorite(tpl.id)}
                      horizontal
                    />
                  </AnimatedItem>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={s.subsection}>
            <Text style={s.subsectionTitle}>All Templates</Text>
            <View style={s.searchBar}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search meals..."
                placeholderTextColor={TEXT_MUTED}
                value={searchQuery}
                onChangeText={text => { console.log('[Nutrition] User searching templates:', text); setSearchQuery(text); }}
                returnKeyType="search"
              />
            </View>
            {filteredTemplates.map((tpl, i) => (
              <AnimatedItem key={tpl.id} index={i}>
                <TemplateCard
                  template={tpl}
                  onLog={() => logMeal(tpl)}
                  onFavorite={() => toggleFavorite(tpl.id)}
                />
              </AnimatedItem>
            ))}
            {filteredTemplates.length === 0 && (
              <View style={s.noResults}>
                <Text style={s.noResultsText}>No templates match "{searchQuery}"</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── High-Protein Foods Grid ── */}
        <View style={s.section}>
          <Text style={s.sectionHeader}>HIGH-PROTEIN FOODS</Text>
          <Text style={s.sectionSubtitle}>Tap to log instantly</Text>
          <View style={s.foodGrid}>
            {proteinFoods.map((food, i) => (
              <AnimatedItem key={food.id} index={i}>
                <FoodGridCard food={food} onLog={() => logFood(food)} />
              </AnimatedItem>
            ))}
          </View>
        </View>

        {/* ── Daily Insight ── */}
        <View style={s.section}>
          <View style={s.insightCard}>
            <Text style={s.insightIcon}>💡</Text>
            <Text style={s.insightText}>{feedbackText}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, color: TEXT_MUTED },

  // Header
  header: { marginBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: CARD_BORDER },
  backArrow: { fontSize: 26, color: TEXT_PRIMARY, lineHeight: 30, marginTop: -2 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  headerDate: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  headerRight: { width: 40 },
  feedbackText: { fontSize: 13, color: TEAL, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },

  // Section
  section: { marginBottom: 28 },
  sectionHeader: { fontSize: 11, fontWeight: '600', color: TEAL, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  sectionSubtitle: { fontSize: 12, color: TEXT_MUTED, marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },

  // Protein card
  proteinCard: { backgroundColor: CARD_BG, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: CARD_BORDER, gap: 12 },
  proteinLabel: { fontSize: 11, fontWeight: '600', color: TEAL, letterSpacing: 1.5, textTransform: 'uppercase' },
  proteinAmountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  proteinLogged: { fontSize: 40, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -1, lineHeight: 44 },
  proteinSep: { fontSize: 22, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 4 },
  proteinSlash: { fontSize: 18, color: TEXT_MUTED, marginBottom: 6 },
  proteinTarget: { fontSize: 20, fontWeight: '500', color: TEXT_SECONDARY, marginBottom: 4 },
  proteinStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  proteinPct: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  proteinMessage: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  proteinTraining: { fontSize: 13, color: TEXT_MUTED, fontStyle: 'italic', lineHeight: 18 },
  quickFixSection: { gap: 10 },
  quickFixLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  quickFixRow: { flexDirection: 'row', gap: 8 },

  // Macro row
  macroRow: { flexDirection: 'row', gap: 10 },

  // Log meal button
  logMealBtn: { backgroundColor: TEAL_DIM, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: TEAL_BORDER },
  logMealBtnText: { fontSize: 13, fontWeight: '600', color: TEAL },

  // Empty meals
  emptyMeals: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyMealsIcon: { fontSize: 36 },
  emptyMealsTitle: { fontSize: 16, fontWeight: '600', color: TEXT_SECONDARY },
  emptyMealsSubtitle: { fontSize: 13, color: TEXT_MUTED },

  // Meal sections
  mealSection: { marginBottom: 16 },
  mealSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mealSectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  mealSectionStats: { flexDirection: 'row', alignItems: 'center' },
  mealSectionCal: { fontSize: 12, color: TEXT_SECONDARY },
  mealSectionDot: { fontSize: 11, color: TEXT_MUTED },
  mealSectionProtein: { fontSize: 12, color: TEAL, fontWeight: '600' },

  // Subsections
  subsection: { marginBottom: 20 },
  subsectionTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 12 },
  hScroll: { paddingBottom: 4 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 14, gap: 10 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRIMARY },

  noResults: { paddingVertical: 20, alignItems: 'center' },
  noResultsText: { fontSize: 13, color: TEXT_MUTED },

  // Food grid
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Insight card
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: 'rgba(0,212,170,0.06)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(0,212,170,0.15)' },
  insightIcon: { fontSize: 20 },
  insightText: { flex: 1, fontSize: 14, color: TEXT_PRIMARY, lineHeight: 21 },
});
