
export type ChangeType =
  | 'workout_swap'
  | 'week_reshuffle'
  | 'nutrition_fix'
  | 'priority_change'
  | 'intensity_drop'
  | 'intensity_increase'
  | 'rest_day_added'
  | 'recovery_suggested';

export interface CoachChange {
  id: string;
  type: ChangeType;
  timestamp: string; // ISO 8601
  title: string;
  shortReason: string;
  fullReason: string;
  dataPoints: string[];
  confidence: 'high' | 'medium' | 'low';
  impact: 'positive' | 'neutral' | 'caution';
  dismissed: boolean;
}

type TemplateSet = {
  title: string;
  shortReason: string;
  fullReason: string;
};

function pick<T>(arr: T[], seed?: number): T {
  const idx = seed !== undefined ? seed % arr.length : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

const templates: Record<ChangeType, TemplateSet[]> = {
  workout_swap: [
    {
      title: 'Leg Day Swapped for Upper Body',
      shortReason: "Swapped leg day for upper body — your quads logged soreness 2 days ago.",
      fullReason: "Your recent session notes flagged quad soreness, and you've had back-to-back lower body days. Training through unresolved soreness increases injury risk and reduces output quality. Upper body work today keeps your momentum without compromising recovery.",
    },
    {
      title: 'Push Day Moved to Tomorrow',
      shortReason: "Moved push day to tomorrow — you completed a heavy chest session 36 hours ago.",
      fullReason: "Chest and tricep tissue typically needs 48–72 hours to recover after a high-volume session. Repeating push movements too soon leads to diminishing returns and elevated injury risk. Tomorrow's slot gives you the full recovery window.",
    },
    {
      title: 'Cardio Swapped for Strength',
      shortReason: "Swapped cardio for strength today — your weekly volume is below target.",
      fullReason: "You're currently 2 strength sessions behind your weekly target with 3 days left. Prioritising resistance training now ensures you hit your muscle-building stimulus before the week closes. Cardio can be slotted into a lighter day.",
    },
    {
      title: 'Pull Day Replaced with Full Body',
      shortReason: "Replaced pull day with full body — you've missed 2 sessions this week.",
      fullReason: "With 2 missed sessions and limited days remaining, a full-body workout is the most efficient way to hit all major muscle groups. This preserves your weekly training stimulus without requiring extra sessions.",
    },
  ],
  week_reshuffle: [
    {
      title: 'Weekly Schedule Reshuffled',
      shortReason: "Reshuffled this week's plan — you have a rest day gap that was breaking your training flow.",
      fullReason: "Your original schedule had two consecutive rest days mid-week followed by three training days in a row. The new layout distributes load more evenly, reducing fatigue accumulation and improving session quality across the week.",
    },
    {
      title: 'Training Days Reordered',
      shortReason: "Reordered your training days — push and pull were back-to-back, stressing the same muscles.",
      fullReason: "Having push and pull sessions on consecutive days creates overlap in shoulder and elbow joint stress. Separating them by a day allows connective tissue to recover and lets you train at full capacity in each session.",
    },
    {
      title: 'Week Layout Optimised',
      shortReason: "Optimised your week layout — heavy compound days now align with your best-energy days.",
      fullReason: "Based on your logged session ratings, your energy and performance peak mid-week. Heavy compound lifts have been moved to Wednesday and Thursday to take advantage of this pattern, with accessory work on lower-energy days.",
    },
    {
      title: 'Schedule Adjusted for Recovery',
      shortReason: "Adjusted your schedule — you had 4 training days in a row with no recovery break.",
      fullReason: "Four consecutive training days without a rest day is above the recommended threshold for most training levels. A mid-block rest day has been inserted to prevent cumulative fatigue from degrading your performance and recovery.",
    },
  ],
  nutrition_fix: [
    {
      title: 'Protein Target Increased',
      shortReason: "Bumped your protein target by 15g — you've been 18g short on average this week.",
      fullReason: "Your logged meals show a consistent protein deficit averaging 18g per day over the past 5 days. At your current training volume, this shortfall can slow muscle protein synthesis. The adjusted target accounts for your actual eating patterns.",
    },
    {
      title: 'Calorie Goal Recalibrated',
      shortReason: "Recalibrated your calorie goal — your activity level increased but intake stayed flat.",
      fullReason: "Your workout frequency increased from 3 to 5 sessions this week, raising your total daily energy expenditure. Without adjusting intake, you'd be in a larger deficit than intended, which can impair recovery and performance.",
    },
    {
      title: 'Pre-Workout Nutrition Flagged',
      shortReason: "Flagged your pre-workout nutrition — you've been training on an empty stomach 3 days running.",
      fullReason: "Training fasted occasionally is fine, but 3 consecutive sessions without pre-workout fuel can reduce strength output and increase muscle breakdown. A small carb and protein snack 60–90 minutes before training would improve session quality.",
    },
    {
      title: 'Carb Timing Adjusted',
      shortReason: "Adjusted carb timing — most of your carbs are logged late in the day, away from training.",
      fullReason: "Carbohydrates are most effective when consumed around training windows. Your current pattern places the majority of carb intake at dinner, leaving your workouts under-fuelled. Shifting some carbs to pre- and post-workout will improve energy and recovery.",
    },
  ],
  priority_change: [
    {
      title: 'Recovery Prioritised Over Performance',
      shortReason: "Shifted priority to recovery — your readiness score has been declining for 3 days.",
      fullReason: "Your readiness indicators — including sleep quality, session ratings, and logged fatigue — have trended downward for 3 consecutive days. Pushing performance targets during this window typically leads to poor sessions and extended recovery time. A short recovery phase now protects your long-term progress.",
    },
    {
      title: 'Strength Focus Elevated',
      shortReason: "Elevated strength as your primary focus — you're 4 weeks from your stated goal date.",
      fullReason: "With your goal date approaching, the training plan has shifted to prioritise strength-specific rep ranges and progressive overload. Accessory volume has been trimmed to keep total fatigue manageable while maximising strength stimulus.",
    },
    {
      title: 'Mobility Work Moved Up',
      shortReason: "Moved mobility work higher in your plan — you've flagged tightness 4 times this week.",
      fullReason: "Repeated tightness flags in your session notes suggest mobility is becoming a limiting factor in your training. Addressing it proactively prevents it from developing into a movement restriction or injury that would require more significant time off.",
    },
    {
      title: 'Nutrition Compliance Prioritised',
      shortReason: "Prioritised nutrition compliance — your training is consistent but diet tracking has gaps.",
      fullReason: "Your workout adherence is strong, but nutrition logging has been inconsistent over the past 10 days. Since diet accounts for a significant portion of body composition change, improving tracking consistency will unlock more of the results your training is already earning.",
    },
  ],
  intensity_drop: [
    {
      title: 'Today\'s Intensity Reduced 20%',
      shortReason: "Reduced today's intensity by 20% — your sleep average dropped to 5.4h this week.",
      fullReason: "Sleep below 6 hours significantly impairs strength output, reaction time, and recovery. Training at full intensity on poor sleep increases injury risk and produces suboptimal adaptations. A reduced-intensity session today still provides training stimulus while respecting your body's current state.",
    },
    {
      title: 'Volume Scaled Back',
      shortReason: "Scaled back today's volume — you've trained 6 days in the last 8 without a full rest day.",
      fullReason: "High training density without adequate rest leads to accumulated fatigue that compounds over time. Reducing today's volume by removing 2 accessory sets keeps you active and maintains habit consistency without adding to your recovery debt.",
    },
    {
      title: 'Load Reduced for Today',
      shortReason: "Reduced load targets today — your last 3 sessions showed declining rep quality.",
      fullReason: "Declining rep quality across sessions is an early indicator of accumulated fatigue or insufficient recovery. Reducing load by 10–15% today allows you to maintain movement quality and technique, which is more valuable than grinding through heavy sets with poor form.",
    },
    {
      title: 'Intensity Dialled Down',
      shortReason: "Dialled down intensity — HRV data suggests your nervous system needs a lighter day.",
      fullReason: "Heart rate variability is a reliable proxy for nervous system recovery status. Your recent readings are trending below your personal baseline, indicating your body is under more stress than usual. A lighter session today supports recovery without breaking your training streak.",
    },
  ],
  intensity_increase: [
    {
      title: 'Intensity Bumped Up',
      shortReason: "Bumped up today's intensity — you've been consistently hitting targets for 2 weeks.",
      fullReason: "Two weeks of consistent target achievement signals that your current load is no longer providing sufficient stimulus for adaptation. A 5–10% intensity increase applies progressive overload, which is the primary driver of continued strength and fitness gains.",
    },
    {
      title: 'Progressive Overload Applied',
      shortReason: "Applied progressive overload — your last 4 sessions were completed with reps in reserve.",
      fullReason: "Finishing sessions with multiple reps in reserve indicates your working weights are below your current capacity. Increasing load ensures you're training in the effective stimulus range, where muscle and strength adaptations actually occur.",
    },
    {
      title: 'Challenge Level Increased',
      shortReason: "Increased your challenge level — recovery metrics are excellent this week.",
      fullReason: "Your sleep, readiness, and session quality scores are all above your personal average this week. This is an optimal window to push harder — your body is primed to absorb and adapt to a higher training stimulus.",
    },
    {
      title: 'Volume Increased This Week',
      shortReason: "Increased weekly volume — you've adapted to the current load over the past 3 weeks.",
      fullReason: "Consistent performance at the same volume for 3+ weeks indicates your body has adapted to the current stimulus. Adding one additional working set per major muscle group this week applies the progressive overload needed to continue driving adaptation.",
    },
  ],
  rest_day_added: [
    {
      title: 'Rest Day Added Thursday',
      shortReason: "Added a rest day Thursday — you've trained 5 days straight without a recovery session.",
      fullReason: "Five consecutive training days exceeds the recovery capacity of most athletes at moderate-to-high intensity. Inserting a rest day now prevents the performance decline and injury risk that comes with accumulated fatigue. Your remaining sessions this week will be higher quality as a result.",
    },
    {
      title: 'Recovery Day Inserted',
      shortReason: "Inserted a recovery day — your session ratings have dropped 3 days in a row.",
      fullReason: "Declining session ratings are a reliable signal that fatigue is outpacing recovery. Rather than pushing through and compounding the deficit, a rest day now allows your body to catch up. You'll return to your next session with better energy and output.",
    },
    {
      title: 'Active Rest Day Scheduled',
      shortReason: "Scheduled an active rest day — your body needs a break but light movement helps recovery.",
      fullReason: "Complete rest isn't always optimal — light activity like walking or mobility work increases blood flow to muscles, accelerating the removal of metabolic waste products. An active rest day gives your joints and nervous system a break while supporting the recovery process.",
    },
    {
      title: 'Extra Rest Day This Week',
      shortReason: "Added an extra rest day — you logged high stress and poor sleep two nights running.",
      fullReason: "External stressors like poor sleep and high life stress draw from the same recovery resources as training. When both are elevated simultaneously, the body's ability to adapt to training is significantly reduced. An extra rest day this week is the smart play for long-term progress.",
    },
  ],
  recovery_suggested: [
    {
      title: 'Recovery Protocol Suggested',
      shortReason: "Suggested a recovery protocol — your muscle soreness has persisted for 4 days.",
      fullReason: "Soreness lasting more than 72 hours can indicate incomplete recovery or low-grade muscle damage. A targeted recovery protocol — including foam rolling, contrast showers, and increased protein intake — can accelerate the process and get you back to full training capacity sooner.",
    },
    {
      title: 'Sleep Optimisation Recommended',
      shortReason: "Recommended sleep optimisation — your average is 5.8h, well below the 7–9h target.",
      fullReason: "Sleep is the single most impactful recovery tool available. At 5.8 hours average, you're missing out on the deep sleep stages where growth hormone is released and muscle repair occurs. Even a 45-minute improvement in sleep duration would meaningfully improve your training adaptations.",
    },
    {
      title: 'Deload Week Suggested',
      shortReason: "Suggested a deload week — you've been in progressive overload for 6 consecutive weeks.",
      fullReason: "Six weeks of progressive overload without a planned reduction in volume or intensity is approaching the upper limit of what most athletes can sustain. A deload week — typically 40–60% of normal volume — allows accumulated fatigue to dissipate while preserving fitness gains.",
    },
    {
      title: 'Mobility Session Recommended',
      shortReason: "Recommended a mobility session — you've flagged joint stiffness in 3 of your last 5 sessions.",
      fullReason: "Recurring joint stiffness is often a precursor to movement restrictions that limit training quality and increase injury risk. A dedicated 20–30 minute mobility session targeting your flagged areas can resolve the issue before it becomes a training limitation.",
    },
  ],
};

export function generateExplanation(
  type: ChangeType,
  context: Record<string, unknown>
): Omit<CoachChange, 'id' | 'timestamp' | 'dismissed'> {
  const seed = context.seed as number | undefined;
  const templateSet = templates[type];
  const template = pick(templateSet, seed);

  // Override with context values if provided
  const title = (context.title as string) || template.title;
  const shortReason = (context.shortReason as string) || template.shortReason;
  const fullReason = (context.fullReason as string) || template.fullReason;
  const dataPoints = (context.dataPoints as string[]) || defaultDataPoints(type);
  const confidence = (context.confidence as CoachChange['confidence']) || defaultConfidence(type);
  const impact = (context.impact as CoachChange['impact']) || defaultImpact(type);

  return { type, title, shortReason, fullReason, dataPoints, confidence, impact };
}

function defaultDataPoints(type: ChangeType): string[] {
  const map: Record<ChangeType, string[]> = {
    workout_swap: ['Quad soreness logged', '36h since last leg session', 'Upper body: 2 days rest'],
    week_reshuffle: ['2 consecutive rest days', 'Push/pull overlap detected', 'Load distribution uneven'],
    nutrition_fix: ['Protein avg: 112g/day', 'Target: 130g/day', '5-day deficit streak'],
    priority_change: ['Readiness score: 58/100', '3-day declining trend', 'Session ratings dropping'],
    intensity_drop: ['Sleep avg: 5.4h this week', 'HRV below baseline', '6 sessions in 8 days'],
    intensity_increase: ['2 weeks on-target', 'Reps in reserve: 3+', 'Recovery score: 84/100'],
    rest_day_added: ['5 consecutive training days', 'Session rating trend: -12%', 'Fatigue score elevated'],
    recovery_suggested: ['Soreness: 4 days persistent', 'Sleep avg: 5.8h', 'HRV: 12% below baseline'],
  };
  return map[type];
}

function defaultConfidence(type: ChangeType): CoachChange['confidence'] {
  const map: Record<ChangeType, CoachChange['confidence']> = {
    workout_swap: 'high',
    week_reshuffle: 'medium',
    nutrition_fix: 'high',
    priority_change: 'medium',
    intensity_drop: 'high',
    intensity_increase: 'medium',
    rest_day_added: 'high',
    recovery_suggested: 'medium',
  };
  return map[type];
}

function defaultImpact(type: ChangeType): CoachChange['impact'] {
  const map: Record<ChangeType, CoachChange['impact']> = {
    workout_swap: 'neutral',
    week_reshuffle: 'positive',
    nutrition_fix: 'positive',
    priority_change: 'neutral',
    intensity_drop: 'caution',
    intensity_increase: 'positive',
    rest_day_added: 'caution',
    recovery_suggested: 'caution',
  };
  return map[type];
}
