
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Platform,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Plane,
  MapPin,
  Dumbbell,
  Utensils,
  Moon,
  Droplets,
  CheckCircle,
  ChevronRight,
  X,
  Zap,
  Clock,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  TRAVEL_WORKOUTS,
  TRAVEL_NUTRITION_GUIDES,
  JET_LAG_TIPS,
  TravelSession,
  TravelDayPriorities,
  generateTravelPriorities,
  getRecommendedWorkout,
  getTripDayNumber,
  getDaysRemaining,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_PRIORITIES,
} from '@/utils/travelModeEngine';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0A0D1A',
  surface: '#12162A',
  card: '#1A1E2E',
  primary: '#6C63FF',
  travel: '#0EA5E9',
  travelMuted: 'rgba(14,165,233,0.12)',
  travelBorder: 'rgba(14,165,233,0.25)',
  text: '#E8EAF6',
  textSecondary: '#8B9CC8',
  textTertiary: '#4A5580',
  border: 'rgba(108,99,255,0.15)',
  success: '#34D399',
  successMuted: 'rgba(52,211,153,0.12)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251,191,36,0.12)',
  danger: '#F87171',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function AnimatedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function IntensityBadge({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  const colorMap = { low: C.success, medium: C.warning, high: C.danger };
  const bgMap = { low: C.successMuted, medium: C.warningMuted, high: 'rgba(248,113,113,0.12)' };
  const labelMap = { low: 'Low', medium: 'Moderate', high: 'High' };
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[intensity] }]}>
      <Text style={[styles.badgeText, { color: colorMap[intensity] }]}>{labelMap[intensity]}</Text>
    </View>
  );
}

function FocusBadge({ focus }: { focus: string }) {
  const labelMap: Record<string, string> = {
    upper: 'Upper', lower: 'Lower', full_body: 'Full Body', cardio: 'Cardio', recovery: 'Recovery',
  };
  return (
    <View style={styles.focusBadge}>
      <Text style={styles.focusBadgeText}>{labelMap[focus] || focus}</Text>
    </View>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    workout: <Dumbbell size={14} color={C.travel} />,
    nutrition: <Utensils size={14} color={C.success} />,
    recovery: <Moon size={14} color='#A78BFA' />,
    hydration: <Droplets size={14} color='#38BDF8' />,
    mindset: <Zap size={14} color={C.warning} />,
  };
  return <>{iconMap[category] || <Zap size={14} color={C.textSecondary} />}</>;
}

const EQUIPMENT_OPTIONS: Array<{ value: TravelSession['equipmentAvailable']; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'bands', label: 'Resistance bands' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'full_gym', label: 'Full gym' },
];

const NUTRITION_ICONS: Record<string, React.ReactNode> = {
  airport: <Plane size={18} color={C.travel} />,
  hotel_breakfast: <Utensils size={18} color={C.success} />,
  restaurant: <Utensils size={18} color={C.warning} />,
  convenience_store: <MapPin size={18} color='#A78BFA' />,
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TravelModeScreen() {
  const router = useRouter();

  const [session, setSession] = useState<TravelSession | null>(null);
  const [priorities, setPriorities] = useState<TravelDayPriorities['priorities']>([]);
  const [loading, setLoading] = useState(true);

  // Setup form state
  const [destination, setDestination] = useState('');
  const [hotelHasGym, setHotelHasGym] = useState(false);
  const [equipment, setEquipment] = useState<TravelSession['equipmentAvailable']>('none');
  const [isLongFlight, setIsLongFlight] = useState(false);

  // UI state
  const [expandedNutrition, setExpandedNutrition] = useState<string | null>(null);
  const [jetLagExpanded, setJetLagExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    console.log('[TravelMode] Loading session from storage');
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) {
        const s: TravelSession = JSON.parse(raw);
        if (s.isActive) {
          setSession(s);
          await loadOrGeneratePriorities(s);
        }
      }
    } catch (e) {
      console.error('[TravelMode] Error loading session:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadOrGeneratePriorities = async (s: TravelSession) => {
    try {
      const today = new Date().toDateString();
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PRIORITIES);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.date === today) {
          setPriorities(saved.priorities);
          return;
        }
      }
      const dayNum = getTripDayNumber(s);
      const generated = generateTravelPriorities(dayNum, s.hotelHasGym, isLongFlight);
      const toSave = { date: today, priorities: generated };
      await AsyncStorage.setItem(STORAGE_KEY_PRIORITIES, JSON.stringify(toSave));
      setPriorities(generated);
    } catch (e) {
      console.error('[TravelMode] Error loading priorities:', e);
    }
  };

  const handleStartTrip = async () => {
    if (!destination.trim()) return;
    console.log('[TravelMode] User tapped Start travel mode — destination:', destination, 'gym:', hotelHasGym, 'equipment:', equipment);
    setSaving(true);
    try {
      const newSession: TravelSession = {
        id: Date.now().toString(),
        startDate: new Date().toISOString(),
        endDate: null,
        destination: destination.trim(),
        hotelHasGym,
        equipmentAvailable: equipment,
        isActive: true,
      };
      await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      const dayNum = getTripDayNumber(newSession);
      const generated = generateTravelPriorities(dayNum, hotelHasGym, isLongFlight);
      const today = new Date().toDateString();
      await AsyncStorage.setItem(STORAGE_KEY_PRIORITIES, JSON.stringify({ date: today, priorities: generated }));
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSession(newSession);
      setPriorities(generated);
    } catch (e) {
      console.error('[TravelMode] Error starting trip:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleEndTrip = async () => {
    console.log('[TravelMode] User tapped End trip');
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
      await AsyncStorage.removeItem(STORAGE_KEY_PRIORITIES);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSession(null);
      setPriorities([]);
      setDestination('');
      setHotelHasGym(false);
      setEquipment('none');
    } catch (e) {
      console.error('[TravelMode] Error ending trip:', e);
    }
  };

  const togglePriority = async (id: string) => {
    console.log('[TravelMode] User toggled priority:', id);
    const updated = priorities.map(p => p.id === id ? { ...p, completed: !p.completed } : p);
    setPriorities(updated);
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(STORAGE_KEY_PRIORITIES, JSON.stringify({ date: today, priorities: updated }));
    } catch (e) {
      console.error('[TravelMode] Error saving priority toggle:', e);
    }
  };

  const handleWorkoutPress = (workoutId: string) => {
    console.log('[TravelMode] User tapped workout card — navigating to travel-workout:', workoutId);
    router.push(`/travel-workout/${workoutId}` as any);
  };

  const handleNutritionPress = (scenario: string) => {
    console.log('[TravelMode] User tapped nutrition card:', scenario);
    setExpandedNutrition(prev => prev === scenario ? null : scenario);
  };

  const handleJetLagToggle = () => {
    console.log('[TravelMode] User toggled jet lag section:', !jetLagExpanded);
    setJetLagExpanded(v => !v);
  };

  // Derived values
  const dayNumber = session ? getTripDayNumber(session) : 1;
  const daysRemaining = session ? getDaysRemaining(session) : null;
  const recommendedWorkout = session ? getRecommendedWorkout(session, dayNumber) : null;
  const completedCount = priorities.filter(p => p.completed).length;
  const totalCount = priorities.length;
  const daysRemainingText = daysRemaining !== null ? `${daysRemaining} days remaining` : 'Open-ended';
  const dayNumberText = `Day ${dayNumber}`;

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Travel Mode', headerTransparent: true, headerTintColor: C.text, headerShadowVisible: false }} />
        <View style={styles.loadingContainer}>
          <Plane size={32} color={C.travel} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Travel Mode',
          headerTransparent: true,
          headerTintColor: C.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ── Hero Banner ── */}
        <AnimatedItem index={0}>
          <View style={styles.heroBanner}>
            <View style={styles.heroGradient}>
              <View style={styles.heroLeft}>
                <View style={styles.heroIconCircle}>
                  <Plane size={28} color="#fff" />
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>Travel Mode</Text>
                  <Text style={styles.heroSubtitle}>
                    {session ? `${session.destination} · ${dayNumberText}` : 'Train anywhere. Stay on track.'}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, session ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, session ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                  {session ? 'Active' : 'Set Up'}
                </Text>
              </View>
            </View>
          </View>
        </AnimatedItem>

        {/* ── Active session card ── */}
        {session && (
          <AnimatedItem index={1}>
            <View style={styles.sessionCard}>
              <View style={styles.sessionCardHeader}>
                <View style={styles.sessionCardLeft}>
                  <MapPin size={16} color={C.travel} />
                  <Text style={styles.sessionDestination}>{session.destination}</Text>
                </View>
                <AnimatedPressable onPress={handleEndTrip} style={styles.endTripButton}>
                  <X size={14} color={C.danger} />
                  <Text style={styles.endTripText}>End Trip</Text>
                </AnimatedPressable>
              </View>
              <View style={styles.sessionMeta}>
                <View style={styles.sessionMetaItem}>
                  <Calendar size={13} color={C.textTertiary} />
                  <Text style={styles.sessionMetaText}>{daysRemainingText}</Text>
                </View>
                <View style={styles.sessionMetaDot} />
                <View style={styles.sessionMetaItem}>
                  <Dumbbell size={13} color={C.textTertiary} />
                  <Text style={styles.sessionMetaText}>
                    {session.hotelHasGym ? 'Hotel gym' : 'No gym'}
                  </Text>
                </View>
                <View style={styles.sessionMetaDot} />
                <View style={styles.sessionMetaItem}>
                  <BarChart2 size={13} color={C.textTertiary} />
                  <Text style={styles.sessionMetaText}>
                    {session.equipmentAvailable === 'none' ? 'No equipment' :
                      session.equipmentAvailable === 'bands' ? 'Bands' :
                        session.equipmentAvailable === 'dumbbells' ? 'Dumbbells' : 'Full gym'}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Setup card (no active session) ── */}
        {!session && (
          <AnimatedItem index={1}>
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Start a trip</Text>
              <Text style={styles.setupSubtitle}>Define your travel context. We adapt your training and nutrition accordingly.</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Destination</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Dubai, Business trip"
                  placeholderTextColor={C.textTertiary}
                  value={destination}
                  onChangeText={setDestination}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formRowLeft}>
                  <Text style={styles.formLabel}>Hotel gym available?</Text>
                  <Text style={styles.formHint}>Enables gym-based sessions</Text>
                </View>
                <Switch
                  value={hotelHasGym}
                  onValueChange={(v) => {
                    console.log('[TravelMode] Hotel gym toggle:', v);
                    setHotelHasGym(v);
                  }}
                  trackColor={{ false: C.surface, true: C.travel }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formRowLeft}>
                  <Text style={styles.formLabel}>Long-haul flight?</Text>
                  <Text style={styles.formHint}>Adjusts day-one recovery priorities</Text>
                </View>
                <Switch
                  value={isLongFlight}
                  onValueChange={(v) => {
                    console.log('[TravelMode] Long flight toggle:', v);
                    setIsLongFlight(v);
                  }}
                  trackColor={{ false: C.surface, true: C.travel }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Available equipment</Text>
                <View style={styles.segmentedControl}>
                  {EQUIPMENT_OPTIONS.map(opt => {
                    const isSelected = equipment === opt.value;
                    return (
                      <AnimatedPressable
                        key={opt.value}
                        style={[styles.segmentOption, isSelected && styles.segmentOptionSelected]}
                        onPress={() => {
                          console.log('[TravelMode] Equipment selected:', opt.value);
                          setEquipment(opt.value);
                        }}
                      >
                        <Text style={[styles.segmentOptionText, isSelected && styles.segmentOptionTextSelected]}>
                          {opt.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <AnimatedPressable
                style={[styles.startButton, (!destination.trim() || saving) && styles.startButtonDisabled]}
                onPress={handleStartTrip}
                disabled={!destination.trim() || saving}
              >
                <Plane size={18} color="#fff" />
                <Text style={styles.startButtonText}>
                  {saving ? 'Activating...' : 'Activate'}
                </Text>
              </AnimatedPressable>
            </View>
          </AnimatedItem>
        )}

        {/* ── Today's priorities ── */}
        {session && priorities.length > 0 && (
          <AnimatedItem index={2}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today</Text>
                <Text style={styles.sectionMeta}>{completedCount} of {totalCount}</Text>
              </View>
              <View style={styles.prioritiesList}>
                {priorities.map((p, i) => {
                  const isCompleted = p.completed;
                  return (
                    <AnimatedPressable
                      key={p.id}
                      style={[styles.priorityRow, isCompleted && styles.priorityRowCompleted]}
                      onPress={() => togglePriority(p.id)}
                    >
                      <View style={[styles.priorityCheck, isCompleted && styles.priorityCheckDone]}>
                        {isCompleted && <CheckCircle size={16} color="#fff" />}
                      </View>
                      <View style={styles.priorityContent}>
                        <Text style={[styles.priorityTitle, isCompleted && styles.priorityTitleDone]} numberOfLines={1}>
                          {p.title}
                        </Text>
                        {p.durationMinutes > 0 && (
                          <Text style={styles.priorityDuration}>{p.durationMinutes} min</Text>
                        )}
                      </View>
                      <CategoryIcon category={p.category} />
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </AnimatedItem>
        )}

        {/* ── Today's workout ── */}
        {session && recommendedWorkout && (
          <AnimatedItem index={3}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Session</Text>
              <AnimatedPressable
                style={styles.featuredWorkoutCard}
                onPress={() => handleWorkoutPress(recommendedWorkout.id)}
              >
                <View style={styles.featuredWorkoutTop}>
                  <View style={styles.featuredWorkoutBadges}>
                    <FocusBadge focus={recommendedWorkout.focus} />
                    <IntensityBadge intensity={recommendedWorkout.intensity} />
                  </View>
                  <ChevronRight size={20} color={C.travel} />
                </View>
                <Text style={styles.featuredWorkoutTitle}>{recommendedWorkout.title}</Text>
                <View style={styles.featuredWorkoutMeta}>
                  <View style={styles.featuredWorkoutMetaItem}>
                    <Clock size={13} color={C.textSecondary} />
                    <Text style={styles.featuredWorkoutMetaText}>{recommendedWorkout.durationMinutes} min</Text>
                  </View>
                  <View style={styles.featuredWorkoutMetaItem}>
                    <Dumbbell size={13} color={C.textSecondary} />
                    <Text style={styles.featuredWorkoutMetaText}>{recommendedWorkout.exercises.length} exercises</Text>
                  </View>
                  <View style={styles.featuredWorkoutMetaItem}>
                    <MapPin size={13} color={C.textSecondary} />
                    <Text style={styles.featuredWorkoutMetaText}>{recommendedWorkout.equipment[0]}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </View>
          </AnimatedItem>
        )}

        {/* ── Nutrition guide ── */}
        <AnimatedItem index={4}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nutritionScrollContent}
            >
              {TRAVEL_NUTRITION_GUIDES.map(guide => {
                const isExpanded = expandedNutrition === guide.scenario;
                return (
                  <AnimatedPressable
                    key={guide.scenario}
                    style={[styles.nutritionCard, isExpanded && styles.nutritionCardExpanded]}
                    onPress={() => handleNutritionPress(guide.scenario)}
                  >
                    <View style={styles.nutritionCardHeader}>
                      <View style={styles.nutritionIconCircle}>
                        {NUTRITION_ICONS[guide.scenario]}
                      </View>
                      <Text style={styles.nutritionCardTitle}>{guide.title}</Text>
                    </View>
                    {isExpanded && (
                      <View style={styles.nutritionExpanded}>
                        <Text style={styles.nutritionSectionLabel}>Best choices</Text>
                        {guide.bestChoices.map((item, i) => (
                          <View key={i} style={styles.nutritionListRow}>
                            <View style={styles.nutritionDot} />
                            <Text style={styles.nutritionListText}>{item}</Text>
                          </View>
                        ))}
                        <Text style={[styles.nutritionSectionLabel, { marginTop: 10 }]}>Avoid</Text>
                        {guide.avoid.map((item, i) => (
                          <View key={i} style={styles.nutritionListRow}>
                            <View style={[styles.nutritionDot, { backgroundColor: C.danger }]} />
                            <Text style={styles.nutritionListText}>{item}</Text>
                          </View>
                        ))}
                        <Text style={[styles.nutritionSectionLabel, { marginTop: 10 }]}>Tips</Text>
                        {guide.tips.map((tip, i) => (
                          <Text key={i} style={styles.nutritionTipText}>{tip}</Text>
                        ))}
                      </View>
                    )}
                    <View style={styles.nutritionCardFooter}>
                      <Text style={styles.nutritionTapHint}>{isExpanded ? 'Collapse' : 'Expand'}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>
        </AnimatedItem>

        {/* ── Jet lag & recovery ── */}
        <AnimatedItem index={5}>
          <View style={styles.section}>
            <AnimatedPressable style={styles.jetLagHeader} onPress={handleJetLagToggle}>
              <View style={styles.jetLagHeaderLeft}>
                <Moon size={18} color='#A78BFA' />
                <Text style={styles.sectionTitle}>Jet lag and recovery</Text>
              </View>
              {jetLagExpanded ? <ChevronUp size={18} color={C.textSecondary} /> : <ChevronDown size={18} color={C.textSecondary} />}
            </AnimatedPressable>
            {jetLagExpanded && (
              <View style={styles.jetLagContent}>
                {JET_LAG_TIPS.map((tip, i) => (
                  <View key={i} style={styles.jetLagRow}>
                    <Text style={styles.jetLagIcon}>{tip.icon}</Text>
                    <View style={styles.jetLagText}>
                      <Text style={styles.jetLagTitle}>{tip.title}</Text>
                      <Text style={styles.jetLagBody}>{tip.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </AnimatedItem>

        {/* ── All travel workouts ── */}
        <AnimatedItem index={6}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All sessions</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workoutsScrollContent}
            >
              {TRAVEL_WORKOUTS.map(workout => (
                <AnimatedPressable
                  key={workout.id}
                  style={styles.workoutCompactCard}
                  onPress={() => handleWorkoutPress(workout.id)}
                >
                  <View style={styles.workoutCompactTop}>
                    <FocusBadge focus={workout.focus} />
                    <IntensityBadge intensity={workout.intensity} />
                  </View>
                  <Text style={styles.workoutCompactTitle} numberOfLines={2}>{workout.title}</Text>
                  <View style={styles.workoutCompactMeta}>
                    <Clock size={11} color={C.textTertiary} />
                    <Text style={styles.workoutCompactMetaText}>{workout.durationMinutes} min</Text>
                  </View>
                  <View style={styles.workoutCompactMeta}>
                    <Dumbbell size={11} color={C.textTertiary} />
                    <Text style={styles.workoutCompactMetaText}>{workout.exercises.length} exercises</Text>
                  </View>
                  <View style={styles.workoutCompactFooter}>
                    <Text style={styles.workoutCompactEquip} numberOfLines={1}>{workout.equipment[0]}</Text>
                    <ChevronRight size={12} color={C.travel} />
                  </View>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        </AnimatedItem>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  // Hero
  heroBanner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    backgroundColor: C.travel,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
    // Simulate gradient with a slightly darker overlay on the right
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    shadowColor: C.travel,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadgeTextActive: {
    color: '#fff',
  },
  statusBadgeTextInactive: {
    color: 'rgba(255,255,255,0.85)',
  },
  // Session card
  sessionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.travelBorder,
    padding: 16,
    gap: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDestination: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  endTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(248,113,113,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  endTripText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.danger,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
  sessionMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textTertiary,
  },
  // Setup card
  setupCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 20,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  setupSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    marginTop: -12,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  formHint: {
    fontSize: 12,
    color: C.textTertiary,
    marginTop: 1,
  },
  textInput: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formRowLeft: {
    flex: 1,
    gap: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentOptionSelected: {
    backgroundColor: C.travel,
  },
  segmentOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  segmentOptionTextSelected: {
    color: '#fff',
  },
  startButton: {
    backgroundColor: C.travel,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.travel,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.1,
  },
  // Section
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: C.travel,
  },
  // Priorities
  prioritiesList: {
    gap: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  priorityRowCompleted: {
    opacity: 0.6,
  },
  priorityCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCheckDone: {
    backgroundColor: C.travel,
    borderColor: C.travel,
  },
  priorityContent: {
    flex: 1,
    gap: 2,
  },
  priorityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  priorityTitleDone: {
    textDecorationLine: 'line-through',
    color: C.textTertiary,
  },
  priorityDuration: {
    fontSize: 12,
    color: C.textTertiary,
  },
  // Featured workout
  featuredWorkoutCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.travelBorder,
    padding: 18,
    gap: 10,
    shadowColor: C.travel,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  featuredWorkoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredWorkoutBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  featuredWorkoutTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  featuredWorkoutMeta: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  featuredWorkoutMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredWorkoutMetaText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  focusBadge: {
    backgroundColor: C.travelMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  focusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.travel,
    letterSpacing: 0.3,
  },
  // Nutrition
  nutritionScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  nutritionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: 220,
    gap: 10,
  },
  nutritionCardExpanded: {
    width: 280,
    borderColor: C.travelBorder,
  },
  nutritionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nutritionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.travelMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  nutritionExpanded: {
    gap: 4,
  },
  nutritionSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nutritionListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 3,
  },
  nutritionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.success,
    marginTop: 6,
  },
  nutritionListText: {
    fontSize: 13,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  nutritionTipText: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    marginBottom: 3,
  },
  nutritionCardFooter: {
    marginTop: 4,
  },
  nutritionTapHint: {
    fontSize: 11,
    color: C.travel,
    fontWeight: '600',
  },
  // Jet lag
  jetLagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  jetLagHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jetLagContent: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 16,
  },
  jetLagRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  jetLagIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  jetLagText: {
    flex: 1,
    gap: 3,
  },
  jetLagTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  jetLagBody: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
  },
  // All workouts scroll
  workoutsScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  workoutCompactCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    width: 160,
    gap: 8,
  },
  workoutCompactTop: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  workoutCompactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    lineHeight: 19,
  },
  workoutCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  workoutCompactMetaText: {
    fontSize: 12,
    color: C.textTertiary,
    fontWeight: '500',
  },
  workoutCompactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  workoutCompactEquip: {
    fontSize: 11,
    color: C.travel,
    fontWeight: '600',
    flex: 1,
  },
});
