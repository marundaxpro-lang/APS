
// ─── Next Best Action Engine ──────────────────────────────────────────────────

export type ActionCategory = 'workout' | 'nutrition' | 'recovery' | 'planning' | 'habit';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface NextBestAction {
  id: string;
  category: ActionCategory;
  title: string;
  subtitle: string;
  urgency: 'high' | 'medium' | 'low';
  ctaLabel: string;
  ctaRoute: string;
  icon: string;
  color: string;
  reasoning: string;
}

export interface UserDayContext {
  timeOfDay: TimeOfDay;
  hour: number;
  hasWorkoutToday: boolean;
  workoutCompleted: boolean;
  workoutName?: string;
  proteinTarget: number;
  proteinLogged: number;
  caloriesTarget: number;
  caloriesLogged: number;
  mealsLogged: number;
  totalMealsTarget: number;
  lastSleepHours: number;
  currentStreak: number;
  weeklyAdherence: number;
  missedWorkoutsThisWeek: number;
  prioritiesCompleted: number;
  totalPriorities: number;
  activeTimerSession?: string;
}

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  workout: '#00D4AA',
  nutrition: '#FF8C42',
  recovery: '#A78BFA',
  planning: '#F59E0B',
  habit: '#60A5FA',
};

export function getCurrentTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function getNextBestAction(context: UserDayContext): NextBestAction {
  const { hour, hasWorkoutToday, workoutCompleted, workoutName, proteinTarget, proteinLogged,
    mealsLogged, currentStreak, weeklyAdherence } = context;

  // 1. Workout scheduled today, not completed, reasonable hour
  if (hasWorkoutToday && !workoutCompleted && hour >= 6 && hour <= 21) {
    let title = `Complete ${workoutName ?? 'Today\'s Session'}`;
    let subtitle = 'Scheduled for today';
    let reasoning = 'Your workout is scheduled and the day is still going. Execute now.';

    if (hour < 10) {
      subtitle = 'Morning session · Start strong';
      reasoning = 'Morning sessions set the tone for the day. Get it done first.';
    } else if (hour >= 10 && hour <= 14) {
      subtitle = 'Midday window · Best time to execute';
      reasoning = 'You\'re in the optimal energy window. Don\'t let the afternoon slip by.';
    } else if (hour > 17) {
      subtitle = 'Evening session · Still time to execute';
      reasoning = 'Evening sessions still count. Consistency beats timing every time.';
    }

    return {
      id: 'nba-workout',
      category: 'workout',
      title,
      subtitle,
      urgency: hour > 19 ? 'high' : 'medium',
      ctaLabel: 'Start Session',
      ctaRoute: '/training-plan',
      icon: 'Dumbbell',
      color: CATEGORY_COLORS.workout,
      reasoning,
    };
  }

  // 2. Workout done but protein under 70%
  const proteinRatio = proteinTarget > 0 ? proteinLogged / proteinTarget : 1;
  if (workoutCompleted && proteinRatio < 0.7) {
    const remaining = Math.max(0, proteinTarget - proteinLogged);
    return {
      id: 'nba-protein',
      category: 'nutrition',
      title: 'Hit your protein target',
      subtitle: `${Math.round(proteinLogged)}g logged · ${Math.round(remaining)}g remaining`,
      urgency: 'high',
      ctaLabel: 'Log Nutrition',
      ctaRoute: '/(tabs)/nutrition',
      icon: 'Beef',
      color: CATEGORY_COLORS.nutrition,
      reasoning: 'You trained hard — now fuel recovery. Protein synthesis peaks in the hours after training.',
    };
  }

  // 3. Meals behind and it's past noon
  if (mealsLogged < 2 && hour > 12) {
    return {
      id: 'nba-meals',
      category: 'nutrition',
      title: 'Log your meals',
      subtitle: `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged · You\'re behind`,
      urgency: 'medium',
      ctaLabel: 'Log a Meal',
      ctaRoute: '/(tabs)/nutrition',
      icon: 'UtensilsCrossed',
      color: CATEGORY_COLORS.nutrition,
      reasoning: 'Tracking nutrition is half the battle. You can\'t manage what you don\'t measure.',
    };
  }

  // 4. Streak alive, evening, all workouts done
  if (currentStreak > 0 && hour > 20 && workoutCompleted) {
    return {
      id: 'nba-plan',
      category: 'planning',
      title: 'Log tomorrow\'s plan',
      subtitle: `${currentStreak}-day streak · Keep the momentum`,
      urgency: 'low',
      ctaLabel: 'View Training Plan',
      ctaRoute: '/training-plan',
      icon: 'CalendarCheck',
      color: CATEGORY_COLORS.planning,
      reasoning: 'Preparation the night before removes friction. Know what you\'re doing before you wake up.',
    };
  }

  // 5. Low weekly adherence
  if (weeklyAdherence < 0.5) {
    return {
      id: 'nba-recovery',
      category: 'recovery',
      title: 'Recovery check-in',
      subtitle: 'Review your week · Rebuild momentum',
      urgency: 'medium',
      ctaLabel: 'Review Week',
      ctaRoute: '/(tabs)/momentum',
      icon: 'Activity',
      color: CATEGORY_COLORS.recovery,
      reasoning: 'Adherence is below 50% this week. A quick review helps identify what\'s blocking you.',
    };
  }

  // 6. Wind down time
  if (hour > 21) {
    return {
      id: 'nba-winddown',
      category: 'habit',
      title: 'Wind down',
      subtitle: 'Prep for tomorrow · Protect your sleep',
      urgency: 'low',
      ctaLabel: 'Start Wind Down',
      ctaRoute: '/(tabs)/momentum',
      icon: 'Moon',
      color: CATEGORY_COLORS.habit,
      reasoning: 'Sleep is the most underrated performance tool. Protect it.',
    };
  }

  // 7. Default
  return {
    id: 'nba-default',
    category: 'planning',
    title: 'Stay on track',
    subtitle: 'Review today\'s priorities',
    urgency: 'low',
    ctaLabel: 'View Priorities',
    ctaRoute: '/(tabs)/momentum',
    icon: 'Target',
    color: CATEGORY_COLORS.planning,
    reasoning: 'Small consistent actions compound into big results. Review what\'s left today.',
  };
}

export function getActionQueue(context: UserDayContext): NextBestAction[] {
  const top = getNextBestAction(context);
  const queue: NextBestAction[] = [top];
  const usedCategories = new Set<ActionCategory>([top.category]);

  const candidates: NextBestAction[] = [];

  // Nutrition follow-up
  const proteinRatio = context.proteinTarget > 0 ? context.proteinLogged / context.proteinTarget : 1;
  if (!usedCategories.has('nutrition') && proteinRatio < 0.8) {
    const remaining = Math.max(0, context.proteinTarget - context.proteinLogged);
    candidates.push({
      id: 'q-protein',
      category: 'nutrition',
      title: `Reach ${Math.round(context.proteinTarget)}g protein`,
      subtitle: `${Math.round(context.proteinLogged)}g logged · ${Math.round(remaining)}g to go`,
      urgency: 'medium',
      ctaLabel: 'Log Nutrition',
      ctaRoute: '/(tabs)/nutrition',
      icon: 'Beef',
      color: CATEGORY_COLORS.nutrition,
      reasoning: 'Protein target is within reach today.',
    });
  }

  // Recovery if workout done
  if (!usedCategories.has('recovery') && context.workoutCompleted) {
    candidates.push({
      id: 'q-mobility',
      category: 'recovery',
      title: '10 min mobility cooldown',
      subtitle: 'Post-workout · Hip flexors & thoracic spine',
      urgency: 'low',
      ctaLabel: 'Start Timer',
      ctaRoute: '/(tabs)/momentum',
      icon: 'Zap',
      color: CATEGORY_COLORS.recovery,
      reasoning: 'Mobility work after training accelerates recovery and prevents injury.',
    });
  }

  // Habit check-in
  if (!usedCategories.has('habit') && context.currentStreak > 0) {
    candidates.push({
      id: 'q-checkin',
      category: 'habit',
      title: 'Evening check-in',
      subtitle: 'Log today\'s wins · Keep the streak',
      urgency: 'low',
      ctaLabel: 'Check In',
      ctaRoute: '/(tabs)/momentum',
      icon: 'CheckCircle',
      color: CATEGORY_COLORS.habit,
      reasoning: 'Reflection reinforces the habit loop.',
    });
  }

  // Planning
  if (!usedCategories.has('planning') && context.missedWorkoutsThisWeek > 0) {
    candidates.push({
      id: 'q-missed',
      category: 'planning',
      title: 'Review missed session',
      subtitle: `${context.missedWorkoutsThisWeek} missed this week · Reschedule`,
      urgency: 'medium',
      ctaLabel: 'View Plan',
      ctaRoute: '/training-plan',
      icon: 'AlertCircle',
      color: CATEGORY_COLORS.planning,
      reasoning: 'Missed sessions can be rescheduled or compressed. Don\'t let them pile up.',
    });
  }

  for (const c of candidates) {
    if (queue.length >= 5) break;
    if (!usedCategories.has(c.category)) {
      usedCategories.add(c.category);
      queue.push(c);
    }
  }

  return queue;
}
