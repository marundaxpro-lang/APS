
// ─── AI Coach Engine ──────────────────────────────────────────────────────────

import { getNextBestAction, UserDayContext } from './nextBestAction';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CoachContext {
  // Training
  todayWorkoutName?: string;
  todayWorkoutCompleted: boolean;
  missedWorkoutsThisWeek: number;
  currentWeekPlan: string[];
  currentStreak: number;
  weeklyAdherence: number;
  daysIntoProgram: number;
  // Nutrition
  proteinLogged: number;
  proteinTarget: number;
  caloriesLogged: number;
  caloriesTarget: number;
  mealsLogged: number;
  // Recovery
  lastSleepHours: number;
  comebackActive: boolean;
  daysMissed: number;
  // Time
  hour: number;
  dayOfWeek: string;
  // Equipment
  equipmentMode: string;
}

export interface CoachAction {
  label: string;
  route: string;
  icon: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
  suggestedActions?: CoachAction[];
  relatedPriority?: string;
}

// ── Intent detection ──────────────────────────────────────────────────────────

export type CoachIntent =
  | 'missed_workout'
  | 'short_on_time'
  | 'low_energy'
  | 'protein_help'
  | 'plan_explanation'
  | 'travel_mode'
  | 'comeback'
  | 'streak_question'
  | 'what_to_do_now'
  | 'nutrition_tonight'
  | 'workout_today'
  | 'general';

export function detectIntent(userMessage: string): CoachIntent {
  const msg = userMessage.toLowerCase();

  if (['missed', 'skipped', "didn't train", 'missed my workout', "couldn't make it"].some(k => msg.includes(k))) {
    return 'missed_workout';
  }
  if (['short on time', 'only have', 'minutes', '15 min', '20 min', 'quick workout', 'no time'].some(k => msg.includes(k))) {
    return 'short_on_time';
  }
  if (['tired', 'exhausted', 'no energy', 'low energy', 'feeling off', 'not feeling it'].some(k => msg.includes(k))) {
    return 'low_energy';
  }
  if (['protein', 'hit my protein', 'protein target', 'enough protein', 'protein tonight'].some(k => msg.includes(k))) {
    return 'protein_help';
  }
  if (['why', 'changed my plan', 'different workout', 'plan changed', 'why is today'].some(k => msg.includes(k))) {
    return 'plan_explanation';
  }
  if (['travelling', 'traveling', 'hotel', 'no gym', 'away', 'on the road'].some(k => msg.includes(k))) {
    return 'travel_mode';
  }
  if (['coming back', 'been away', 'getting back', 'restart', 'start again', 'fell off'].some(k => msg.includes(k))) {
    return 'comeback';
  }
  if (['streak', 'days in a row', 'consistency', 'how long'].some(k => msg.includes(k))) {
    return 'streak_question';
  }
  if (['what should i do', 'what now', 'next', 'what to do', 'where to start'].some(k => msg.includes(k))) {
    return 'what_to_do_now';
  }
  if (['tonight', 'dinner', 'what to eat', 'eat tonight', 'evening meal'].some(k => msg.includes(k))) {
    return 'nutrition_tonight';
  }
  if (['should i train', 'train today', 'workout today', 'do i need to', 'skip today'].some(k => msg.includes(k))) {
    return 'workout_today';
  }

  return 'general';
}

// ── Response generator ────────────────────────────────────────────────────────

function extractMinutes(message: string): number | null {
  const match = message.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : null;
}

export function generateCoachResponse(
  intent: CoachIntent,
  context: CoachContext,
  userMessage: string
): CoachMessage {
  const id = `coach_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();
  const workoutName = context.todayWorkoutName ?? 'your session';

  switch (intent) {
    case 'missed_workout': {
      let content: string;
      let suggestedActions: CoachAction[];

      if (context.missedWorkoutsThisWeek === 0) {
        content = `One missed session won't derail you. ${workoutName} is still on for today — want to push it to this evening?`;
      } else if (context.missedWorkoutsThisWeek === 1) {
        content = `You've missed one session this week. I'd recommend keeping today's ${workoutName} and dropping Friday's if needed. Quality over quantity.`;
      } else {
        content = `Two missed sessions this week. Let's simplify — pick the 2 most important sessions and drop the rest. Which days work best for you?`;
      }

      suggestedActions = [{ label: 'View plan', route: '/training-plan', icon: 'Calendar' }];
      return { id, role: 'coach', content, timestamp, suggestedActions };
    }

    case 'short_on_time': {
      const mins = extractMinutes(userMessage);
      let content: string;

      if (mins !== null && mins < 20) {
        content = `With ${mins} minutes, do a focused compound circuit: 3 rounds of squats, push-ups, rows, and a plank. That's your session done.`;
      } else if (mins !== null && mins <= 30) {
        content = `30 minutes is enough for a solid session. Hit the main lifts only — skip accessories. ${workoutName} compressed to the essentials.`;
      } else {
        content = `You have enough time for a full session. Start with the compound movements and cut rest periods to 60s if needed.`;
      }

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'Compress workout', route: '/training-plan', icon: 'Zap' }],
      };
    }

    case 'low_energy': {
      let content: string;

      if (context.weeklyAdherence > 0.7) {
        content = `Low energy after a strong week is normal — your body is adapting. Train anyway but drop intensity by 20%. Movement will help more than rest today.`;
      } else {
        content = `If energy is consistently low, recovery might be the issue. How's your sleep been? Aim for 7-8 hours and consider a deload this week.`;
      }

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'Start session', route: '/training-plan', icon: 'Play' }],
      };
    }

    case 'protein_help': {
      const remaining = context.proteinTarget - context.proteinLogged;
      let content: string;

      if (remaining <= 0) {
        content = `You've already hit your protein target — ${context.proteinLogged}g logged. Great work.`;
      } else if (remaining <= 30) {
        content = `You're ${remaining}g away. A Greek yogurt or protein shake will close it easily.`;
      } else if (remaining <= 60) {
        content = `You need ${remaining}g more. A chicken breast or tuna bowl will get you there. Log it in the nutrition tab.`;
      } else {
        content = `You're ${remaining}g short — that's two full protein meals. Front-load protein at dinner and add a shake before bed.`;
      }

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'Log meal', route: '/nutrition', icon: 'UtensilsCrossed' }],
      };
    }

    case 'plan_explanation': {
      const equipmentNote = context.equipmentMode !== 'full_gym'
        ? ` It's currently set to ${context.equipmentMode} mode, so exercises are substituted for available equipment.`
        : '';
      const content = `Your plan adapts based on your schedule, recovery, and adherence.${equipmentNote} The goal is to keep you progressing without burning out.`;

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'View full plan', route: '/training-plan', icon: 'Calendar' }],
      };
    }

    case 'travel_mode': {
      const alreadyActive = context.equipmentMode === 'travel' ? " It's already active." : '';
      const content = `Travel mode is built in. Your plan switches to bodyweight and band alternatives automatically.${alreadyActive} Go to Training Plan → Equipment to switch modes.`;

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'Switch equipment mode', route: '/training-plan', icon: 'Plane' }],
      };
    }

    case 'comeback': {
      let content: string;

      if (context.comebackActive) {
        content = `Welcome back. Your plan has been simplified for re-entry — ${context.daysMissed} days off means we start lighter and build back up. Don't rush it.`;
      } else {
        content = `Getting back on track is the hardest part — you've already done it by opening the app. Start with one session today, even a short one.`;
      }

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'Start comeback session', route: '/training-plan', icon: 'RefreshCw' }],
      };
    }

    case 'streak_question': {
      let content: string;

      if (context.currentStreak === 0) {
        content = `Your streak is at 0 right now. Complete one priority today to start it back up — that's all it takes.`;
      } else if (context.currentStreak < 7) {
        content = `You're on a ${context.currentStreak}-day streak. Keep it going — one action per day is all that counts.`;
      } else {
        content = `${context.currentStreak} days straight. That's real consistency. The goal now is protecting it — don't let perfect be the enemy of good.`;
      }

      return { id, role: 'coach', content, timestamp };
    }

    case 'what_to_do_now': {
      const userDayCtx: UserDayContext = {
        timeOfDay: context.hour < 11 ? 'morning' : context.hour < 17 ? 'afternoon' : context.hour < 22 ? 'evening' : 'night',
        hour: context.hour,
        hasWorkoutToday: !!context.todayWorkoutName,
        workoutCompleted: context.todayWorkoutCompleted,
        workoutName: context.todayWorkoutName,
        proteinTarget: context.proteinTarget,
        proteinLogged: context.proteinLogged,
        caloriesTarget: context.caloriesTarget,
        caloriesLogged: context.caloriesLogged,
        mealsLogged: context.mealsLogged,
        totalMealsTarget: 4,
        lastSleepHours: context.lastSleepHours,
        currentStreak: context.currentStreak,
        weeklyAdherence: context.weeklyAdherence,
        missedWorkoutsThisWeek: context.missedWorkoutsThisWeek,
        prioritiesCompleted: 0,
        totalPriorities: 5,
      };

      const nextAction = getNextBestAction(userDayCtx);
      const content = `Right now, your top priority is ${nextAction.title}. ${nextAction.reasoning} Tap below to get started.`;

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: nextAction.ctaLabel, route: nextAction.ctaRoute, icon: nextAction.icon }],
      };
    }

    case 'nutrition_tonight': {
      const remaining = context.proteinTarget - context.proteinLogged;
      const caloriesLeft = context.caloriesTarget - context.caloriesLogged;
      const remainingStr = String(Math.max(0, remaining));
      const caloriesLeftStr = String(Math.max(0, caloriesLeft));

      let extra = '';
      if (remaining > 40) {
        extra = ' A chicken breast with rice and a protein shake will close the gap.';
      } else if (caloriesLeft < 200) {
        extra = " You're close to your calorie limit — stick to a lean protein source only.";
      }

      const content = `You have ${remainingStr}g protein and ${caloriesLeftStr} calories left for tonight.${extra}`;

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'See meal ideas', route: '/nutrition', icon: 'UtensilsCrossed' }],
      };
    }

    case 'workout_today': {
      let content: string;

      if (context.todayWorkoutCompleted) {
        content = `You've already completed ${workoutName} today. Rest up and focus on nutrition and recovery.`;
      } else if (context.todayWorkoutName && !context.todayWorkoutCompleted) {
        const timingNote = context.hour < 12
          ? ' Morning sessions set the tone for the day.'
          : context.hour > 18
          ? ' Evening sessions are fine — just make sure you eat enough beforehand.'
          : '';
        content = `Yes — ${workoutName} is on your plan today.${timingNote}`;
      } else {
        content = `Today is a rest day on your plan. Active recovery — a walk or mobility work — is always a good option.`;
      }

      return {
        id, role: 'coach', content, timestamp,
        suggestedActions: [{ label: 'Start session', route: '/training-plan', icon: 'Play' }],
      };
    }

    default: {
      const content = `I'm here to help with your training, nutrition, and recovery. Ask me anything specific — like what to do if you missed a session, how to hit your protein tonight, or whether to train on low energy.`;
      return { id, role: 'coach', content, timestamp };
    }
  }
}

// ── Starter questions ─────────────────────────────────────────────────────────

export function getStarterQuestions(context: CoachContext): string[] {
  const questions: string[] = ['What should I do right now?'];

  if (!context.todayWorkoutCompleted && context.todayWorkoutName) {
    questions.push('Should I train today?');
  }
  if (context.proteinLogged < context.proteinTarget * 0.7) {
    questions.push('What should I eat tonight to hit protein?');
  }
  if (context.missedWorkoutsThisWeek > 0) {
    questions.push('I missed a session — what now?');
  }
  if (context.comebackActive) {
    questions.push('How do I get back on track?');
  }
  if (context.equipmentMode !== 'full_gym') {
    questions.push('How does travel mode work?');
  }
  if (context.currentStreak > 5) {
    questions.push('How do I protect my streak?');
  }

  const fillers = [
    "How does my plan adapt?",
    "I'm short on time today",
    "I'm feeling low energy",
  ];

  for (const f of fillers) {
    if (questions.length >= 4) break;
    if (!questions.includes(f)) questions.push(f);
  }

  // Deduplicate and return exactly 4
  const unique = [...new Set(questions)];
  return unique.slice(0, 4);
}

// ── Welcome message ───────────────────────────────────────────────────────────

export function getWelcomeMessage(): CoachMessage {
  return {
    id: 'welcome',
    role: 'coach',
    content: "I'm your Apex coach. I know your plan, your progress, and where you're at today.\nAsk me anything — missed sessions, nutrition, energy, or what to do right now.",
    timestamp: new Date().toISOString(),
  };
}
