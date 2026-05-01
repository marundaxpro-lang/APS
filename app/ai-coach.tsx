
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  ChevronLeft,
  ArrowUp,
  Brain,
  Play,
  Calendar,
  Zap,
  RefreshCw,
  Plane,
  UtensilsCrossed,
  Dumbbell,
} from 'lucide-react-native';
import {
  CoachContext,
  CoachMessage,
  CoachAction,
  detectIntent,
  generateCoachResponse,
  getStarterQuestions,
  getWelcomeMessage,
} from '@/utils/aiCoach';
import { calculateStreak, detectComebackState, STORAGE_KEYS } from '@/utils/momentumEngine';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#00D4AA';
const TEAL_DIM = 'rgba(0,212,170,0.15)';
const TEAL_BORDER = 'rgba(0,212,170,0.2)';
const CARD_BG = '#161616';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const SCREEN_BG = '#0A0A0A';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_SECONDARY = '#888';
const TEXT_MUTED = 'rgba(255,255,255,0.3)';
const INPUT_BG = '#111111';
const INPUT_FIELD_BG = '#1A1A1A';

// ─── Icon resolver ────────────────────────────────────────────────────────────

function ActionIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const props = { size, color };
  switch (name) {
    case 'Play': return <Play {...props} />;
    case 'Calendar': return <Calendar {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'RefreshCw': return <RefreshCw {...props} />;
    case 'Plane': return <Plane {...props} />;
    case 'UtensilsCrossed': return <UtensilsCrossed {...props} />;
    case 'Dumbbell': return <Dumbbell {...props} />;
    default: return <Brain {...props} />;
  }
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={typingStyles.container}>
      <Text style={typingStyles.label}>APEX COACH</Text>
      <View style={typingStyles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[typingStyles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { alignItems: 'flex-start', marginBottom: 16, paddingHorizontal: 20 },
  label: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD_BG, borderRadius: 16, borderTopLeftRadius: 4, padding: 14, borderWidth: 1, borderColor: CARD_BORDER },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: TEXT_SECONDARY },
});

// ─── Animated progress bar ────────────────────────────────────────────────────

function MiniProgressBar({ fraction }: { fraction: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(1, Math.max(0, fraction)), duration: 600, useNativeDriver: false }).start();
  }, [fraction, anim]);
  return (
    <View style={miniBarStyles.track}>
      <Animated.View style={[miniBarStyles.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const miniBarStyles = StyleSheet.create({
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', flex: 1 },
  fill: { height: 4, backgroundColor: TEAL, borderRadius: 2 },
});

// ─── Context banner ───────────────────────────────────────────────────────────

function ContextBanner({
  context,
  collapsed,
  onToggle,
}: {
  context: CoachContext;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const proteinFraction = context.proteinTarget > 0 ? context.proteinLogged / context.proteinTarget : 0;
  const proteinLoggedStr = String(Math.round(context.proteinLogged));
  const proteinTargetStr = String(Math.round(context.proteinTarget));
  const streakStr = String(context.currentStreak);
  const workoutLabel = context.todayWorkoutCompleted
    ? 'Completed'
    : context.todayWorkoutName
    ? 'Pending'
    : 'Rest day';
  const workoutName = context.todayWorkoutName ?? 'Rest Day';

  if (collapsed) {
    return (
      <TouchableOpacity style={bannerStyles.collapsed} onPress={onToggle} activeOpacity={0.8}>
        <Text style={bannerStyles.collapsedText}>▶ Show context</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={bannerStyles.card}>
      <View style={bannerStyles.row}>
        <View style={bannerStyles.item}>
          <Text style={bannerStyles.itemLabel}>TODAY</Text>
          <Text style={bannerStyles.itemValue} numberOfLines={1}>{workoutName}</Text>
          <Text style={[bannerStyles.itemStatus, { color: context.todayWorkoutCompleted ? TEAL : TEXT_SECONDARY }]}>{workoutLabel}</Text>
        </View>
        <View style={bannerStyles.divider} />
        <View style={bannerStyles.item}>
          <Text style={bannerStyles.itemLabel}>PROTEIN</Text>
          <View style={bannerStyles.proteinRow}>
            <Text style={bannerStyles.itemValue}>{proteinLoggedStr}</Text>
            <Text style={bannerStyles.itemValueMuted}>/{proteinTargetStr}g</Text>
          </View>
          <MiniProgressBar fraction={proteinFraction} />
        </View>
        <View style={bannerStyles.divider} />
        <View style={bannerStyles.item}>
          <Text style={bannerStyles.itemLabel}>STREAK</Text>
          <Text style={bannerStyles.itemValue}>{streakStr}</Text>
          <Text style={bannerStyles.itemStatus}>days</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onToggle} style={bannerStyles.toggle} activeOpacity={0.7}>
        <Text style={bannerStyles.toggleText}>▼ Hide context</Text>
      </TouchableOpacity>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  card: { backgroundColor: CARD_BG, borderRadius: 14, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: CARD_BORDER, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  item: { flex: 1, gap: 4 },
  itemLabel: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  itemValue: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  itemValueMuted: { fontSize: 12, color: TEXT_SECONDARY, marginLeft: 2, alignSelf: 'flex-end', marginBottom: 1 },
  itemStatus: { fontSize: 11, color: TEXT_SECONDARY },
  proteinRow: { flexDirection: 'row', alignItems: 'flex-end' },
  divider: { width: 1, backgroundColor: CARD_BORDER, alignSelf: 'stretch', marginHorizontal: 12 },
  toggle: { alignItems: 'center', marginTop: 10 },
  toggleText: { fontSize: 11, color: TEXT_MUTED },
  collapsed: { marginHorizontal: 20, marginBottom: 8, alignItems: 'center', paddingVertical: 6 },
  collapsedText: { fontSize: 11, color: TEXT_MUTED },
});

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onActionPress,
}: {
  message: CoachMessage;
  onActionPress: (route: string) => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={bubbleStyles.userWrapper}>
        <View style={bubbleStyles.userBubble}>
          <Text style={bubbleStyles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={bubbleStyles.coachWrapper}>
      <Text style={bubbleStyles.coachLabel}>APEX COACH</Text>
      <View style={bubbleStyles.coachBubble}>
        <Text style={bubbleStyles.coachText}>{message.content}</Text>
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <View style={bubbleStyles.actionsRow}>
            {message.suggestedActions.map(action => (
              <AnimatedPressable
                key={action.label}
                style={bubbleStyles.actionChip}
                onPress={() => {
                  console.log('[AICoach] User tapped action chip:', action.label, '→', action.route);
                  onActionPress(action.route);
                }}
              >
                <ActionIcon name={action.icon} size={14} color={TEAL} />
                <Text style={bubbleStyles.actionChipText}>{action.label}</Text>
              </AnimatedPressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  userWrapper: { alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 20 },
  userBubble: { maxWidth: '80%', backgroundColor: TEAL_DIM, borderRadius: 16, borderTopRightRadius: 4, borderWidth: 1, borderColor: TEAL_BORDER, paddingVertical: 12, paddingHorizontal: 16 },
  userText: { fontSize: 14, color: TEXT_PRIMARY, lineHeight: 20 },
  coachWrapper: { alignItems: 'flex-start', marginBottom: 16, paddingHorizontal: 20 },
  coachLabel: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  coachBubble: { maxWidth: '88%', backgroundColor: CARD_BG, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: CARD_BORDER, paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  coachText: { fontSize: 14, color: '#E5E5E5', lineHeight: 22 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,212,170,0.1)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: TEAL_BORDER },
  actionChipText: { fontSize: 12, color: TEXT_PRIMARY, fontWeight: '500' },
});

// ─── Starter questions grid ───────────────────────────────────────────────────

function StarterQuestions({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (q: string) => void;
}) {
  const pairs: string[][] = [];
  for (let i = 0; i < questions.length; i += 2) {
    pairs.push(questions.slice(i, i + 2));
  }

  return (
    <View style={sqStyles.container}>
      {pairs.map((pair, rowIdx) => (
        <View key={rowIdx} style={sqStyles.row}>
          {pair.map(q => (
            <AnimatedPressable
              key={q}
              style={sqStyles.pill}
              onPress={() => {
                console.log('[AICoach] User tapped starter question:', q);
                onSelect(q);
              }}
            >
              <Text style={sqStyles.pillText}>{q}</Text>
            </AnimatedPressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const sqStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, backgroundColor: CARD_BG, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12 },
  pillText: { fontSize: 13, color: TEXT_PRIMARY, lineHeight: 18 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AICoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<CoachMessage[]>([getWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [coachContext, setCoachContext] = useState<CoachContext>({
    todayWorkoutName: 'Upper Body Push',
    todayWorkoutCompleted: false,
    missedWorkoutsThisWeek: 0,
    currentWeekPlan: [],
    currentStreak: 0,
    weeklyAdherence: 0.6,
    daysIntoProgram: 1,
    proteinLogged: 0,
    proteinTarget: 175,
    caloriesLogged: 0,
    caloriesTarget: 2200,
    mealsLogged: 0,
    lastSleepHours: 0,
    comebackActive: false,
    daysMissed: 0,
    hour: new Date().getHours(),
    dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()],
    equipmentMode: 'full_gym',
  });

  const flatListRef = useRef<FlatList>(null);
  const hasUserMessages = messages.some(m => m.role === 'user');

  // ── Load context from AsyncStorage ──
  useEffect(() => {
    async function loadContext() {
      console.log('[AICoach] Loading context from AsyncStorage');
      try {
        const [datesRaw, nutritionRaw, targetsRaw, equipmentRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.COMPLETION_DATES),
          AsyncStorage.getItem('apex_meal_logs'),
          AsyncStorage.getItem('apex_nutrition_targets'),
          AsyncStorage.getItem(STORAGE_KEYS.EQUIPMENT_MODE),
        ]);

        const dates: string[] = datesRaw ? JSON.parse(datesRaw) : [];
        const streakData = calculateStreak(dates);
        const comebackState = detectComebackState(dates);

        const targets = targetsRaw ? JSON.parse(targetsRaw) : { protein: 175, calories: 2200 };

        // Compute today's nutrition from logs
        const today = new Date().toISOString().split('T')[0];
        const allLogs: Record<string, { totalProtein: number; totalCalories: number }[]> = nutritionRaw
          ? JSON.parse(nutritionRaw)
          : {};
        const todayLogs = allLogs[today] ?? [];
        const proteinLogged = todayLogs.reduce((s: number, l: { totalProtein: number }) => s + (l.totalProtein || 0), 0);
        const caloriesLogged = todayLogs.reduce((s: number, l: { totalCalories: number }) => s + (l.totalCalories || 0), 0);

        setCoachContext(prev => ({
          ...prev,
          currentStreak: streakData.currentStreak,
          comebackActive: comebackState.isActive,
          daysMissed: comebackState.daysMissed,
          proteinLogged,
          caloriesLogged,
          mealsLogged: todayLogs.length,
          proteinTarget: targets.protein ?? 175,
          caloriesTarget: targets.calories ?? 2200,
          equipmentMode: equipmentRaw ?? 'full_gym',
          hour: new Date().getHours(),
        }));

        console.log('[AICoach] Context loaded. Streak:', streakData.currentStreak, 'Comeback:', comebackState.isActive);
      } catch (e) {
        console.error('[AICoach] Context load error:', e);
      }
    }
    loadContext();
  }, []);

  const starterQuestions = useMemo(() => getStarterQuestions(coachContext), [coachContext]);

  const streakStr = String(coachContext.currentStreak);
  const dayStr = String(coachContext.daysIntoProgram);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    console.log('[AICoach] User sent message:', trimmed);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const userMsg: CoachMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    scrollToBottom();

    // Simulate thinking delay
    setTimeout(() => {
      const intent = detectIntent(trimmed);
      console.log('[AICoach] Detected intent:', intent);
      const response = generateCoachResponse(intent, coachContext, trimmed);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
      scrollToBottom();
    }, 800);
  }, [coachContext, scrollToBottom]);

  const handleActionPress = useCallback((route: string) => {
    console.log('[AICoach] User navigating to:', route);
    router.push(route as never);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: CoachMessage }) => (
    <MessageBubble message={item} onActionPress={handleActionPress} />
  ), [handleActionPress]);

  const inputEmpty = inputText.trim().length === 0;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── Custom Header ── */}
      <View style={s.header}>
        <AnimatedPressable
          style={s.backBtn}
          onPress={() => {
            console.log('[AICoach] User pressed back');
            router.back();
          }}
        >
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </AnimatedPressable>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>AI Coach</Text>
          <Text style={s.headerSubtitle}>Plan-aware · Always on</Text>
        </View>

        <View style={s.contextPill}>
          <Text style={s.contextPillText}>Day </Text>
          <Text style={s.contextPillValue}>{dayStr}</Text>
          <Text style={s.contextPillDot}> · </Text>
          <Text style={s.contextPillFire}>🔥</Text>
          <Text style={s.contextPillValue}>{streakStr}</Text>
        </View>
      </View>

      {/* ── Context Banner ── */}
      <ContextBanner
        context={coachContext}
        collapsed={bannerCollapsed}
        onToggle={() => {
          console.log('[AICoach] User toggled context banner');
          setBannerCollapsed(v => !v);
        }}
      />

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        ListFooterComponent={
          <>
            {isTyping && <TypingIndicator />}
            {!hasUserMessages && (
              <StarterQuestions
                questions={starterQuestions}
                onSelect={sendMessage}
              />
            )}
          </>
        }
      />

      {/* ── Input Bar ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.bottom}
      >
        <View style={[s.inputBar, { paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={s.textInput}
            placeholder="Ask your coach anything..."
            placeholderTextColor={TEXT_MUTED}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
            blurOnSubmit={false}
          />
          <AnimatedPressable
            style={[s.sendBtn, inputEmpty && s.sendBtnDisabled]}
            onPress={() => {
              console.log('[AICoach] User pressed send button');
              sendMessage(inputText);
            }}
          >
            <ArrowUp size={18} color={inputEmpty ? TEXT_MUTED : '#000'} />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: CARD_BORDER },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: TEXT_PRIMARY },
  headerSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  contextPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: CARD_BORDER },
  contextPillText: { fontSize: 11, color: TEXT_SECONDARY },
  contextPillValue: { fontSize: 11, fontWeight: '700', color: TEXT_PRIMARY },
  contextPillDot: { fontSize: 11, color: TEXT_MUTED },
  contextPillFire: { fontSize: 11 },

  // Messages
  messagesList: { paddingTop: 8, paddingBottom: 16 },

  // Input
  inputBar: { backgroundColor: INPUT_BG, borderTopWidth: 1, borderTopColor: CARD_BORDER, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  textInput: { flex: 1, backgroundColor: INPUT_FIELD_BG, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: TEXT_PRIMARY, maxHeight: 100, borderWidth: 1, borderColor: CARD_BORDER },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
});
