
import { FitnessProfile, WorkoutDay, Exercise } from '@/types/fitness';

// Exercise database organized by muscle group and equipment
const exerciseDatabase = {
  chest: {
    gym: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/bench-press.gif' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/incline-db.gif' },
      { name: 'Cable Flyes', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-flyes.gif' },
      { name: 'Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/dips.gif' },
    ],
    'home-freeweights': [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-bench.gif' },
      { name: 'Dumbbell Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-flyes.gif' },
      { name: 'Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif' },
    ],
    'home-bodyweight': [
      { name: 'Push-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif' },
      { name: 'Diamond Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/diamond-pushups.gif' },
      { name: 'Decline Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/decline-pushups.gif' },
    ],
  },
  back: {
    gym: [
      { name: 'Deadlifts', sets: 4, reps: '6-8', equipment: ['barbell'], difficulty: 'advanced', videoUrl: 'https://example.com/deadlift.gif' },
      { name: 'Pull-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif' },
      { name: 'Barbell Rows', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/barbell-rows.gif' },
      { name: 'Lat Pulldowns', sets: 3, reps: '10-12', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/lat-pulldown.gif' },
      { name: 'Cable Rows', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-rows.gif' },
    ],
    'home-freeweights': [
      { name: 'Dumbbell Rows', sets: 4, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-rows.gif' },
      { name: 'Renegade Rows', sets: 3, reps: '8-10', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/renegade-rows.gif' },
      { name: 'Pull-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif' },
    ],
    'home-bodyweight': [
      { name: 'Pull-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif' },
      { name: 'Inverted Rows', sets: 4, reps: '10-15', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/inverted-rows.gif' },
      { name: 'Superman Holds', sets: 3, reps: '30-60s', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/superman.gif' },
    ],
  },
  legs: {
    gym: [
      { name: 'Barbell Squats', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/squats.gif' },
      { name: 'Romanian Deadlifts', sets: 4, reps: '10-12', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/rdl.gif' },
      { name: 'Leg Press', sets: 3, reps: '12-15', equipment: ['machine'], difficulty: 'beginner', videoUrl: 'https://example.com/leg-press.gif' },
      { name: 'Leg Curls', sets: 3, reps: '12-15', equipment: ['machine'], difficulty: 'beginner', videoUrl: 'https://example.com/leg-curls.gif' },
      { name: 'Calf Raises', sets: 4, reps: '15-20', equipment: ['machine'], difficulty: 'beginner', videoUrl: 'https://example.com/calf-raises.gif' },
    ],
    'home-freeweights': [
      { name: 'Goblet Squats', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/goblet-squats.gif' },
      { name: 'Dumbbell Lunges', sets: 3, reps: '10-12 each', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-lunges.gif' },
      { name: 'Dumbbell RDLs', sets: 4, reps: '10-12', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/db-rdl.gif' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12 each', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/bulgarian-split.gif' },
    ],
    'home-bodyweight': [
      { name: 'Bodyweight Squats', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/bw-squats.gif' },
      { name: 'Lunges', sets: 3, reps: '12-15 each', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/lunges.gif' },
      { name: 'Single Leg Deadlifts', sets: 3, reps: '10-12 each', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/single-leg-dl.gif' },
      { name: 'Jump Squats', sets: 3, reps: '10-15', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/jump-squats.gif' },
    ],
  },
  glutes: {
    gym: [
      { name: 'Hip Thrusts', sets: 4, reps: '10-12', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/hip-thrust.gif' },
      { name: 'Cable Kickbacks', sets: 3, reps: '12-15 each', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-kickbacks.gif' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12 each', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/bulgarian-split.gif' },
      { name: 'Glute Bridges', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/glute-bridge.gif' },
    ],
    'home-freeweights': [
      { name: 'Dumbbell Hip Thrusts', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-hip-thrust.gif' },
      { name: 'Dumbbell Sumo Squats', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/sumo-squats.gif' },
      { name: 'Single Leg Glute Bridges', sets: 3, reps: '12-15 each', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/single-leg-bridge.gif' },
    ],
    'home-bodyweight': [
      { name: 'Glute Bridges', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/glute-bridge.gif' },
      { name: 'Single Leg Glute Bridges', sets: 3, reps: '12-15 each', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/single-leg-bridge.gif' },
      { name: 'Donkey Kicks', sets: 3, reps: '15-20 each', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/donkey-kicks.gif' },
      { name: 'Fire Hydrants', sets: 3, reps: '15-20 each', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/fire-hydrants.gif' },
    ],
  },
  shoulders: {
    gym: [
      { name: 'Overhead Press', sets: 4, reps: '6-8', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/ohp.gif' },
      { name: 'Lateral Raises', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/lateral-raises.gif' },
      { name: 'Face Pulls', sets: 3, reps: '15-20', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/face-pulls.gif' },
      { name: 'Rear Delt Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/rear-delt-flyes.gif' },
    ],
    'home-freeweights': [
      { name: 'Dumbbell Shoulder Press', sets: 4, reps: '8-10', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-shoulder-press.gif' },
      { name: 'Lateral Raises', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/lateral-raises.gif' },
      { name: 'Front Raises', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/front-raises.gif' },
      { name: 'Bent Over Reverse Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/reverse-flyes.gif' },
    ],
    'home-bodyweight': [
      { name: 'Pike Push-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pike-pushups.gif' },
      { name: 'Handstand Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'advanced', videoUrl: 'https://example.com/handstand-pushups.gif' },
      { name: 'Plank to Down Dog', sets: 3, reps: '10-15', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/plank-downdog.gif' },
    ],
  },
  arms: {
    gym: [
      { name: 'Barbell Curls', sets: 3, reps: '10-12', equipment: ['barbell'], difficulty: 'beginner', videoUrl: 'https://example.com/barbell-curls.gif' },
      { name: 'Tricep Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/tricep-dips.gif' },
      { name: 'Cable Tricep Pushdowns', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/tricep-pushdowns.gif' },
      { name: 'Hammer Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/hammer-curls.gif' },
    ],
    'home-freeweights': [
      { name: 'Dumbbell Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-curls.gif' },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/overhead-tricep.gif' },
      { name: 'Hammer Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/hammer-curls.gif' },
      { name: 'Tricep Kickbacks', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/tricep-kickbacks.gif' },
    ],
    'home-bodyweight': [
      { name: 'Close Grip Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/close-pushups.gif' },
      { name: 'Tricep Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/tricep-dips.gif' },
      { name: 'Chin-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/chinups.gif' },
    ],
  },
};

export function generateWorkoutSplit(profile: FitnessProfile): WorkoutDay[] {
  const { trainingDays, focusAreas, equipment, gender } = profile;
  
  // Prioritize glutes for female users
  const adjustedFocusAreas = gender === 'female' && !focusAreas.includes('glutes')
    ? [...focusAreas, 'glutes']
    : focusAreas;

  const workoutSplit: WorkoutDay[] = [];

  if (trainingDays === 2) {
    workoutSplit.push(
      { day: 'Monday', name: 'Upper Body', exercises: getExercises(['chest', 'back', 'shoulders', 'arms'], equipment, 4) },
      { day: 'Thursday', name: 'Lower Body', exercises: getExercises(['legs', 'glutes'], equipment, 5) }
    );
  } else if (trainingDays === 3) {
    workoutSplit.push(
      { day: 'Monday', name: 'Push', exercises: getExercises(['chest', 'shoulders'], equipment, 5) },
      { day: 'Wednesday', name: 'Pull', exercises: getExercises(['back', 'arms'], equipment, 5) },
      { day: 'Friday', name: 'Legs', exercises: getExercises(['legs', 'glutes'], equipment, 5) }
    );
  } else if (trainingDays === 4) {
    workoutSplit.push(
      { day: 'Monday', name: 'Upper Body A', exercises: getExercises(['chest', 'back'], equipment, 5) },
      { day: 'Tuesday', name: 'Lower Body A', exercises: getExercises(['legs', 'glutes'], equipment, 5) },
      { day: 'Thursday', name: 'Upper Body B', exercises: getExercises(['shoulders', 'arms'], equipment, 5) },
      { day: 'Friday', name: 'Lower Body B', exercises: getExercises(['legs', 'glutes'], equipment, 5) }
    );
  } else if (trainingDays === 5) {
    workoutSplit.push(
      { day: 'Monday', name: 'Chest & Triceps', exercises: getExercises(['chest', 'arms'], equipment, 5) },
      { day: 'Tuesday', name: 'Back & Biceps', exercises: getExercises(['back', 'arms'], equipment, 5) },
      { day: 'Wednesday', name: 'Legs', exercises: getExercises(['legs', 'glutes'], equipment, 5) },
      { day: 'Thursday', name: 'Shoulders', exercises: getExercises(['shoulders'], equipment, 5) },
      { day: 'Friday', name: 'Glutes & Legs', exercises: getExercises(['glutes', 'legs'], equipment, 5) }
    );
  } else if (trainingDays >= 6) {
    workoutSplit.push(
      { day: 'Monday', name: 'Chest', exercises: getExercises(['chest'], equipment, 5) },
      { day: 'Tuesday', name: 'Back', exercises: getExercises(['back'], equipment, 5) },
      { day: 'Wednesday', name: 'Legs', exercises: getExercises(['legs'], equipment, 5) },
      { day: 'Thursday', name: 'Shoulders', exercises: getExercises(['shoulders'], equipment, 5) },
      { day: 'Friday', name: 'Arms', exercises: getExercises(['arms'], equipment, 5) },
      { day: 'Saturday', name: 'Glutes', exercises: getExercises(['glutes'], equipment, 5) }
    );
  }

  return workoutSplit;
}

function getExercises(muscleGroups: string[], equipment: string, count: number): Exercise[] {
  const exercises: Exercise[] = [];
  
  muscleGroups.forEach(group => {
    const groupExercises = exerciseDatabase[group as keyof typeof exerciseDatabase]?.[equipment as keyof typeof exerciseDatabase.chest] || [];
    exercises.push(...groupExercises.slice(0, Math.ceil(count / muscleGroups.length)));
  });

  return exercises.slice(0, count).map((ex, idx) => ({
    id: `${Date.now()}-${idx}`,
    muscleGroup: muscleGroups[0],
    instructions: [`Perform ${ex.sets} sets of ${ex.reps} reps`, 'Rest 60-90 seconds between sets', 'Focus on proper form'],
    ...ex,
  }));
}

export function getTodaysWorkout(profile: FitnessProfile): WorkoutDay | null {
  const split = generateWorkoutSplit(profile);
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const dayMap: { [key: number]: string } = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    0: 'Sunday',
  };

  const todayName = dayMap[today];
  return split.find(day => day.day === todayName) || null;
}
