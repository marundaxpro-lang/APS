
export interface TravelSession {
  id: string;
  startDate: string;
  endDate: string | null;
  destination: string;
  hotelHasGym: boolean;
  equipmentAvailable: 'none' | 'bands' | 'dumbbells' | 'full_gym';
  isActive: boolean;
}

export interface TravelWorkout {
  id: string;
  title: string;
  type: 'hotel_room' | 'hotel_gym' | 'bodyweight_outdoor' | 'quick_circuit';
  durationMinutes: number;
  equipment: string[];
  exercises: TravelExercise[];
  focus: 'upper' | 'lower' | 'full_body' | 'cardio' | 'recovery';
  intensity: 'low' | 'medium' | 'high';
}

export interface TravelExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  tip: string;
}

export interface TravelNutritionGuide {
  scenario: 'airport' | 'hotel_breakfast' | 'restaurant' | 'convenience_store' | 'room_service';
  title: string;
  tips: string[];
  bestChoices: string[];
  avoid: string[];
}

export interface TravelDayPriorities {
  date: string;
  priorities: {
    id: string;
    title: string;
    category: 'workout' | 'nutrition' | 'recovery' | 'hydration' | 'mindset';
    completed: boolean;
    durationMinutes: number;
  }[];
}

export const TRAVEL_WORKOUTS: TravelWorkout[] = [
  {
    id: 'hotel_upper_no_equipment',
    title: 'Hotel Upper Body',
    type: 'hotel_room',
    durationMinutes: 22,
    equipment: ['No equipment'],
    focus: 'upper',
    intensity: 'medium',
    exercises: [
      { name: 'Push-up', sets: 4, reps: '12-15', restSeconds: 45, tip: 'Use the floor space between the bed and wall' },
      { name: 'Pike push-up', sets: 3, reps: '10-12', restSeconds: 45, tip: 'Elevate feet on the bed for more shoulder emphasis' },
      { name: 'Tricep dip (chair)', sets: 3, reps: '12-15', restSeconds: 45, tip: 'Use a sturdy desk chair' },
      { name: 'Plank shoulder tap', sets: 3, reps: '20 total', restSeconds: 30, tip: 'Keep hips square' },
      { name: 'Diamond push-up', sets: 3, reps: '8-10', restSeconds: 60, tip: 'Slow the eccentric for more tension' },
    ],
  },
  {
    id: 'hotel_lower_no_equipment',
    title: 'Hotel Lower Body',
    type: 'hotel_room',
    durationMinutes: 25,
    equipment: ['No equipment'],
    focus: 'lower',
    intensity: 'medium',
    exercises: [
      { name: 'Bulgarian split squat (bed)', sets: 4, reps: '10 each', restSeconds: 60, tip: 'Rear foot elevated on the bed edge' },
      { name: 'Glute bridge', sets: 4, reps: '15-20', restSeconds: 45, tip: 'Pause 2 seconds at the top' },
      { name: 'Reverse lunge', sets: 3, reps: '12 each', restSeconds: 45, tip: 'Use the wall for balance if needed' },
      { name: 'Wall sit', sets: 3, reps: '45 sec', restSeconds: 30, tip: 'Thighs parallel to floor' },
      { name: 'Single-leg calf raise', sets: 3, reps: '20 each', restSeconds: 30, tip: 'Use the wall for light balance support' },
    ],
  },
  {
    id: 'hotel_full_body_circuit',
    title: '20-Min Full Body Circuit',
    type: 'quick_circuit',
    durationMinutes: 20,
    equipment: ['No equipment'],
    focus: 'full_body',
    intensity: 'high',
    exercises: [
      { name: 'Burpee', sets: 4, reps: '8', restSeconds: 30, tip: 'Step back instead of jumping if space is tight' },
      { name: 'Push-up', sets: 4, reps: '10', restSeconds: 20, tip: 'Chest to floor' },
      { name: 'Jump squat', sets: 4, reps: '10', restSeconds: 30, tip: 'Land softly — be mindful of hotel floors' },
      { name: 'Mountain climber', sets: 4, reps: '20 total', restSeconds: 20, tip: '30 seconds continuous' },
      { name: 'Plank', sets: 4, reps: '30 sec', restSeconds: 20, tip: 'Squeeze glutes and core throughout' },
    ],
  },
  {
    id: 'hotel_recovery',
    title: 'Travel Recovery Flow',
    type: 'hotel_room',
    durationMinutes: 15,
    equipment: ['No equipment'],
    focus: 'recovery',
    intensity: 'low',
    exercises: [
      { name: 'Hip flexor stretch', sets: 1, reps: '60 sec each', restSeconds: 0, tip: 'Great for long flights — hip flexors tighten badly' },
      { name: 'Thoracic rotation', sets: 1, reps: '10 each side', restSeconds: 0, tip: 'Lie on your side, rotate upper body' },
      { name: 'Hamstring stretch', sets: 1, reps: '45 sec each', restSeconds: 0, tip: 'Use the bed edge for support' },
      { name: 'Shoulder cross-body stretch', sets: 1, reps: '30 sec each', restSeconds: 0, tip: 'Counteracts carrying luggage' },
      { name: "Child's pose", sets: 1, reps: '60 sec', restSeconds: 0, tip: 'Breathe deeply — decompress the spine' },
    ],
  },
  {
    id: 'outdoor_cardio',
    title: 'Outdoor Cardio & Core',
    type: 'bodyweight_outdoor',
    durationMinutes: 30,
    equipment: ['No equipment'],
    focus: 'cardio',
    intensity: 'medium',
    exercises: [
      { name: '10-min brisk walk/jog', sets: 1, reps: '10 min', restSeconds: 0, tip: 'Explore the area — makes it feel less like exercise' },
      { name: 'Park bench step-up', sets: 3, reps: '15 each', restSeconds: 30, tip: 'Find any bench or low wall' },
      { name: 'Sprint interval', sets: 6, reps: '20 sec on / 40 sec off', restSeconds: 0, tip: 'Use a straight path or park path' },
      { name: 'Plank', sets: 3, reps: '45 sec', restSeconds: 30, tip: 'Find a flat surface' },
      { name: '5-min cool-down walk', sets: 1, reps: '5 min', restSeconds: 0, tip: 'Explore on the way back' },
    ],
  },
  {
    id: 'hotel_gym_strength',
    title: 'Hotel Gym Strength',
    type: 'hotel_gym',
    durationMinutes: 35,
    equipment: ['Dumbbells', 'Cable machine'],
    focus: 'full_body',
    intensity: 'high',
    exercises: [
      { name: 'Dumbbell Romanian deadlift', sets: 4, reps: '10-12', restSeconds: 60, tip: 'Go heavier than you think — hotel dumbbells are often light' },
      { name: 'Dumbbell bench press', sets: 4, reps: '10-12', restSeconds: 60, tip: 'Use the bench if available, floor press otherwise' },
      { name: 'Cable row (or band row)', sets: 3, reps: '12-15', restSeconds: 45, tip: 'Squeeze shoulder blades at the end' },
      { name: 'Dumbbell shoulder press', sets: 3, reps: '10-12', restSeconds: 45, tip: 'Seated for stability' },
      { name: 'Dumbbell curl + press', sets: 3, reps: '10', restSeconds: 45, tip: 'Superset for time efficiency' },
    ],
  },
];

export const TRAVEL_NUTRITION_GUIDES: TravelNutritionGuide[] = [
  {
    scenario: 'airport',
    title: 'Airport nutrition',
    tips: ['Eat before you fly if possible', 'Avoid alcohol — it dehydrates at altitude', 'Carry a protein bar as backup'],
    bestChoices: ['Grilled chicken wrap', 'Sushi (avoid tempura)', 'Greek yogurt + fruit', 'Protein bar + water'],
    avoid: ['Fast food combos', 'Pastries and muffins', 'Sugary drinks', 'Alcohol before a long flight'],
  },
  {
    scenario: 'hotel_breakfast',
    title: 'Hotel breakfast',
    tips: ['Load up on protein first — eggs, Greek yogurt, smoked salmon', 'Skip the pastry section entirely', "Fruit is fine but don't make it the main event"],
    bestChoices: ['Scrambled eggs + smoked salmon', 'Greek yogurt + berries', 'Omelette station if available', 'Whole grain toast + nut butter'],
    avoid: ['Croissants and pastries', 'Sugary cereals', 'Fruit juice (liquid sugar)', 'Processed meats like sausages'],
  },
  {
    scenario: 'restaurant',
    title: 'Restaurant eating',
    tips: ['Ask for sauces on the side', 'Protein + vegetables is always a safe order', "Don't skip meals — it leads to overeating later"],
    bestChoices: ['Grilled fish or chicken', 'Steak + salad', 'Sushi (sashimi-heavy)', 'Any protein + roasted vegetables'],
    avoid: ['Creamy pasta dishes', 'Fried starters', 'Bread basket (eat one piece max)', "Dessert unless it's a special occasion"],
  },
  {
    scenario: 'convenience_store',
    title: 'Convenience store',
    tips: ['Most convenience stores have better options than you think', 'Protein + fat keeps you full longer than carbs alone'],
    bestChoices: ['Hard-boiled eggs', 'String cheese or babybel', 'Nuts (unsalted)', 'Protein bar (check sugar < 10g)', 'Greek yogurt'],
    avoid: ['Crisps and snack bags', 'Chocolate bars', 'Energy drinks', 'Sandwiches with mayo-heavy fillings'],
  },
];

export const JET_LAG_TIPS = [
  { icon: '💧', title: 'Hydrate aggressively', body: 'Drink 500ml of water immediately on landing. Cabin air is extremely dry — you arrive dehydrated.' },
  { icon: '☀️', title: 'Get morning light', body: 'Expose yourself to natural light within 1 hour of waking. This is the single most effective jet lag reset.' },
  { icon: '🚫', title: 'Avoid napping > 20 min', body: 'Short power naps are fine. Long naps lock in the wrong sleep cycle and extend jet lag by days.' },
  { icon: '🌙', title: 'Sleep at local time', body: 'Even if you feel fine, go to bed at the local bedtime. Melatonin 0.5mg can help shift your rhythm.' },
  { icon: '🥩', title: 'Prioritise protein', body: 'High-protein meals help stabilise energy and reduce the brain fog that comes with circadian disruption.' },
  { icon: '🏃', title: 'Move within 2 hours of landing', body: 'Even a 15-min walk resets your body clock faster than rest. The recovery flow workout is perfect here.' },
];

export function getRecommendedWorkout(
  session: TravelSession,
  dayNumber: number
): TravelWorkout {
  const { hotelHasGym, equipmentAvailable } = session;

  if (dayNumber === 1) {
    return TRAVEL_WORKOUTS.find(w => w.id === 'hotel_recovery')!;
  }

  if (hotelHasGym || equipmentAvailable === 'full_gym' || equipmentAvailable === 'dumbbells') {
    return TRAVEL_WORKOUTS.find(w => w.id === 'hotel_gym_strength')!;
  }

  const rotation = [
    'hotel_upper_no_equipment',
    'hotel_lower_no_equipment',
    'hotel_full_body_circuit',
    'outdoor_cardio',
  ];
  const idx = (dayNumber - 2) % rotation.length;
  return TRAVEL_WORKOUTS.find(w => w.id === rotation[idx]) || TRAVEL_WORKOUTS[0];
}

export function generateTravelPriorities(
  dayNumber: number,
  hotelHasGym: boolean,
  isLongFlight: boolean
): TravelDayPriorities['priorities'] {
  if (dayNumber === 1 && isLongFlight) {
    return [
      { id: 'hydrate_arrival', title: 'Drink 500ml water on arrival', category: 'hydration', completed: false, durationMinutes: 1 },
      { id: 'recovery_flow', title: 'Do the 15-min recovery flow', category: 'recovery', completed: false, durationMinutes: 15 },
      { id: 'light_walk', title: 'Take a 10-min walk outside', category: 'workout', completed: false, durationMinutes: 10 },
      { id: 'protein_meal', title: 'Eat a high-protein meal', category: 'nutrition', completed: false, durationMinutes: 20 },
      { id: 'sleep_local', title: 'Sleep at local bedtime', category: 'mindset', completed: false, durationMinutes: 0 },
    ];
  }

  if (dayNumber === 1) {
    return [
      { id: 'hydrate_checkin', title: 'Hydrate — 2L target today', category: 'hydration', completed: false, durationMinutes: 0 },
      { id: 'hotel_explore', title: 'Scope out the hotel gym', category: 'workout', completed: false, durationMinutes: 5 },
      { id: 'protein_first', title: 'Prioritise protein at every meal', category: 'nutrition', completed: false, durationMinutes: 0 },
      { id: 'sleep_early', title: 'Aim for 8 hours tonight', category: 'recovery', completed: false, durationMinutes: 0 },
    ];
  }

  const gymWorkout = hotelHasGym
    ? { id: 'gym_session', title: 'Complete hotel gym session', category: 'workout' as const, completed: false, durationMinutes: 35 }
    : { id: 'room_workout', title: 'Complete hotel room workout', category: 'workout' as const, completed: false, durationMinutes: 22 };

  return [
    gymWorkout,
    { id: 'protein_target', title: 'Hit 30g protein at breakfast', category: 'nutrition', completed: false, durationMinutes: 0 },
    { id: 'hydration_daily', title: 'Drink 2L water today', category: 'hydration', completed: false, durationMinutes: 0 },
    { id: 'steps_goal', title: 'Hit 8,000 steps exploring', category: 'workout', completed: false, durationMinutes: 0 },
    { id: 'mindset_checkin', title: 'One mindful minute — breathe', category: 'mindset', completed: false, durationMinutes: 1 },
  ];
}

export function getTripDayNumber(session: TravelSession): number {
  const start = new Date(session.startDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function getDaysRemaining(session: TravelSession): number | null {
  if (!session.endDate) return null;
  const end = new Date(session.endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export const STORAGE_KEY_SESSION = 'travel_mode_session';
export const STORAGE_KEY_PRIORITIES = 'travel_mode_priorities';
export const STORAGE_KEY_COMPLETED_WORKOUTS = 'travel_mode_completed_workouts';
