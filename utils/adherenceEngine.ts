
export interface DayAdherence {
  date: string; // ISO 'YYYY-MM-DD'
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  workout: { planned: boolean; completed: boolean; skipped: boolean };
  nutrition: { calorieTarget: number; caloriesLogged: number; proteinTarget: number; proteinLogged: number };
  recovery: { stretchDone: boolean; sleepHours: number; sleepTarget: number };
  priorities: { completed: number; total: number };
}

export interface WeekAdherence {
  weekStartDate: string; // ISO Monday date
  days: DayAdherence[];  // 7 days Mon-Sun
  scores: {
    workout: number;     // 0-100
    nutrition: number;   // 0-100
    recovery: number;    // 0-100
    priorities: number;  // 0-100
    overall: number;     // weighted average
  };
  insights: WeekInsight[];
  projectedCompletion: number; // 0-100
}

export interface WeekInsight {
  type: 'on_track' | 'slipping' | 'strong' | 'needs_attention' | 'recovered';
  category: 'workout' | 'nutrition' | 'recovery' | 'priorities' | 'overall';
  message: string;
  actionable: string;
}

export function calculateDayAdherenceScore(day: DayAdherence): number {
  let score = 0;
  let weight = 0;

  // Workout (35%)
  if (day.workout.planned) {
    const workoutScore = day.workout.completed ? 100 : day.workout.skipped ? 0 : 50;
    score += workoutScore * 0.35;
    weight += 0.35;
  }

  // Nutrition (30%)
  const calRatio = day.nutrition.calorieTarget > 0
    ? Math.min(day.nutrition.caloriesLogged / day.nutrition.calorieTarget, 1.2)
    : 0;
  const calScore = calRatio >= 0.9 && calRatio <= 1.1 ? 100 : calRatio >= 0.75 ? 70 : calRatio >= 0.5 ? 40 : 20;
  const protRatio = day.nutrition.proteinTarget > 0
    ? Math.min(day.nutrition.proteinLogged / day.nutrition.proteinTarget, 1.2)
    : 0;
  const protScore = protRatio >= 0.9 ? 100 : protRatio >= 0.75 ? 70 : protRatio >= 0.5 ? 40 : 20;
  const nutritionScore = (calScore + protScore) / 2;
  score += nutritionScore * 0.30;
  weight += 0.30;

  // Recovery (15%)
  const sleepRatio = day.recovery.sleepTarget > 0
    ? day.recovery.sleepHours / day.recovery.sleepTarget
    : 0;
  const sleepScore = sleepRatio >= 0.9 ? 100 : sleepRatio >= 0.75 ? 70 : sleepRatio >= 0.6 ? 45 : 20;
  const stretchScore = day.recovery.stretchDone ? 100 : 0;
  const recoveryScore = (sleepScore * 0.7) + (stretchScore * 0.3);
  score += recoveryScore * 0.15;
  weight += 0.15;

  // Priorities (20%)
  const priorityScore = day.priorities.total > 0
    ? (day.priorities.completed / day.priorities.total) * 100
    : 100;
  score += priorityScore * 0.20;
  weight += 0.20;

  return weight > 0 ? Math.round(score / weight) : 0;
}

export function calculateWeekAdherence(days: DayAdherence[]): WeekAdherence {
  const filledDays = days.slice(0, 7);

  // Workout score: % of planned workouts completed
  const plannedWorkouts = filledDays.filter(d => d.workout.planned);
  const completedWorkouts = plannedWorkouts.filter(d => d.workout.completed);
  const workoutScore = plannedWorkouts.length > 0
    ? Math.round((completedWorkouts.length / plannedWorkouts.length) * 100)
    : 100;

  // Nutrition score: avg daily nutrition adherence
  const nutritionScores = filledDays.map(d => {
    const calRatio = d.nutrition.calorieTarget > 0
      ? Math.min(d.nutrition.caloriesLogged / d.nutrition.calorieTarget, 1.2)
      : 0;
    const calScore = calRatio >= 0.9 && calRatio <= 1.1 ? 100 : calRatio >= 0.75 ? 70 : calRatio >= 0.5 ? 40 : 20;
    const protRatio = d.nutrition.proteinTarget > 0
      ? Math.min(d.nutrition.proteinLogged / d.nutrition.proteinTarget, 1.2)
      : 0;
    const protScore = protRatio >= 0.9 ? 100 : protRatio >= 0.75 ? 70 : protRatio >= 0.5 ? 40 : 20;
    return (calScore + protScore) / 2;
  });
  const nutritionScore = Math.round(nutritionScores.reduce((a, b) => a + b, 0) / nutritionScores.length);

  // Recovery score: sleep + stretch composite
  const recoveryScores = filledDays.map(d => {
    const sleepRatio = d.recovery.sleepTarget > 0
      ? d.recovery.sleepHours / d.recovery.sleepTarget
      : 0;
    const sleepScore = sleepRatio >= 0.9 ? 100 : sleepRatio >= 0.75 ? 70 : sleepRatio >= 0.6 ? 45 : 20;
    const stretchScore = d.recovery.stretchDone ? 100 : 0;
    return (sleepScore * 0.7) + (stretchScore * 0.3);
  });
  const recoveryScore = Math.round(recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length);

  // Priorities score: % of priorities completed
  const totalPriorities = filledDays.reduce((a, d) => a + d.priorities.total, 0);
  const completedPriorities = filledDays.reduce((a, d) => a + d.priorities.completed, 0);
  const prioritiesScore = totalPriorities > 0
    ? Math.round((completedPriorities / totalPriorities) * 100)
    : 100;

  // Overall: workout 35%, nutrition 30%, recovery 15%, priorities 20%
  const overallScore = Math.round(
    workoutScore * 0.35 +
    nutritionScore * 0.30 +
    recoveryScore * 0.15 +
    prioritiesScore * 0.20
  );

  // Projected completion based on days remaining
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const pastDays = filledDays.filter(d => d.date <= todayStr);
  const projectedCompletion = pastDays.length > 0
    ? Math.min(100, Math.round(overallScore * (7 / pastDays.length) * 0.85))
    : overallScore;

  const weekStartDate = filledDays.length > 0 ? filledDays[0].date : todayStr;

  const week: WeekAdherence = {
    weekStartDate,
    days: filledDays,
    scores: {
      workout: workoutScore,
      nutrition: nutritionScore,
      recovery: recoveryScore,
      priorities: prioritiesScore,
      overall: overallScore,
    },
    insights: [],
    projectedCompletion,
  };

  week.insights = generateWeekInsights(week);
  return week;
}

export function generateWeekInsights(week: WeekAdherence): WeekInsight[] {
  const insights: WeekInsight[] = [];
  const { scores, days } = week;

  // Workout insights
  if (scores.workout >= 90) {
    insights.push({
      type: 'strong',
      category: 'workout',
      message: 'Workout consistency is excellent this week',
      actionable: 'Keep the momentum — consider adding a bonus mobility session',
    });
  } else if (scores.workout < 50) {
    const skipped = days.filter(d => d.workout.skipped).length;
    insights.push({
      type: 'needs_attention',
      category: 'workout',
      message: `Workouts are slipping — ${skipped} session${skipped !== 1 ? 's' : ''} skipped this week`,
      actionable: 'Schedule your next session now and treat it like a meeting',
    });
  } else if (scores.workout < 75) {
    insights.push({
      type: 'slipping',
      category: 'workout',
      message: 'Workout adherence is below target this week',
      actionable: 'Even a 20-minute session counts — don\'t let perfect be the enemy of good',
    });
  }

  // Nutrition insights
  const avgCalories = days.reduce((a, d) => a + d.nutrition.caloriesLogged, 0) / days.length;
  const avgTarget = days.reduce((a, d) => a + d.nutrition.calorieTarget, 0) / days.length;
  const calDiff = Math.round(avgTarget - avgCalories);

  if (scores.nutrition < 60) {
    insights.push({
      type: 'slipping',
      category: 'nutrition',
      message: `Nutrition is slipping — averaging ${calDiff > 0 ? calDiff + ' calories under' : Math.abs(calDiff) + ' calories over'} target`,
      actionable: calDiff > 0 ? 'Add a protein shake before bed tonight' : 'Swap one snack for a lower-calorie option',
    });
  } else if (scores.nutrition >= 85) {
    insights.push({
      type: 'strong',
      category: 'nutrition',
      message: 'Nutrition is on point this week',
      actionable: 'Great consistency — keep hitting your protein targets',
    });
  }

  // Recovery insights
  const avgSleep = days.reduce((a, d) => a + d.recovery.sleepHours, 0) / days.length;
  if (avgSleep < 6.5) {
    insights.push({
      type: 'needs_attention',
      category: 'recovery',
      message: `Sleep is below target — averaging ${avgSleep.toFixed(1)}h per night`,
      actionable: 'Consider an earlier bedtime tonight — even 30 minutes helps',
    });
  } else if (scores.recovery >= 80) {
    insights.push({
      type: 'on_track',
      category: 'recovery',
      message: 'Recovery habits are solid this week',
      actionable: 'Sleep and stretch consistency is paying off',
    });
  }

  // Priorities insights
  if (scores.priorities >= 80) {
    insights.push({
      type: 'strong',
      category: 'priorities',
      message: 'You\'re crushing your daily priorities',
      actionable: 'High task completion — consider adding a stretch goal',
    });
  } else if (scores.priorities < 50) {
    insights.push({
      type: 'slipping',
      category: 'priorities',
      message: 'Daily priorities are falling behind',
      actionable: 'Pick just 1 priority tomorrow and focus on completing it',
    });
  }

  // Mid-week slump detection (Wed/Thu low scores)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const wedThu = days.filter(d => (d.dayOfWeek === 'Wed' || d.dayOfWeek === 'Thu') && d.date <= todayStr);
  if (wedThu.length >= 1) {
    const wedThuAvg = wedThu.reduce((a, d) => a + calculateDayAdherenceScore(d), 0) / wedThu.length;
    const monTue = days.filter(d => (d.dayOfWeek === 'Mon' || d.dayOfWeek === 'Tue') && d.date <= todayStr);
    const monTueAvg = monTue.length > 0
      ? monTue.reduce((a, d) => a + calculateDayAdherenceScore(d), 0) / monTue.length
      : 0;
    if (monTueAvg > 0 && wedThuAvg < monTueAvg - 20) {
      insights.push({
        type: 'slipping',
        category: 'overall',
        message: 'Mid-week dip detected — push through today',
        actionable: 'A strong finish to the week can still make this a solid week overall',
      });
    }
  }

  // Overall strong week
  if (scores.overall >= 85 && insights.filter(i => i.type === 'strong').length === 0) {
    insights.push({
      type: 'strong',
      category: 'overall',
      message: 'Outstanding week across all categories',
      actionable: 'You\'re building real momentum — keep this standard next week',
    });
  }

  return insights.slice(0, 4);
}

export function getWeekSummaryLabel(overall: number): string {
  if (overall >= 90) return 'Exceptional week';
  if (overall >= 75) return 'Strong week';
  if (overall >= 60) return 'Solid week';
  if (overall >= 45) return 'Mixed week';
  return 'Tough week';
}

export function getNextWeekRecommendations(week: WeekAdherence): string[] {
  const recs: string[] = [];
  const { scores } = week;

  const weakest = Object.entries({
    workout: scores.workout,
    nutrition: scores.nutrition,
    recovery: scores.recovery,
    priorities: scores.priorities,
  }).sort((a, b) => a[1] - b[1]);

  for (const [category, score] of weakest) {
    if (recs.length >= 3) break;
    if (category === 'workout' && score < 80) {
      recs.push('Block workout time in your calendar at the start of next week');
    } else if (category === 'nutrition' && score < 80) {
      recs.push('Meal prep on Sunday to make hitting nutrition targets easier');
    } else if (category === 'recovery' && score < 80) {
      recs.push('Set a consistent bedtime alarm for next week — aim for 7.5h sleep');
    } else if (category === 'priorities' && score < 80) {
      recs.push('Write your top 3 priorities the night before each day');
    }
  }

  if (recs.length < 2) {
    recs.push('Maintain your current consistency — small improvements compound over time');
  }

  return recs.slice(0, 3);
}
