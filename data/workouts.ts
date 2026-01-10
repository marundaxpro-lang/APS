
import { FitnessProfile, WorkoutDay, Exercise } from '@/types/fitness';

// Exercise database organized by muscle group and equipment
const exerciseDatabase = {
  chest: {
    gym: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/bench-press.gif', muscleGroup: 'chest' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/incline-db.gif', muscleGroup: 'chest' },
      { name: 'Cable Flyes', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-flyes.gif', muscleGroup: 'chest' },
      { name: 'Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/dips.gif', muscleGroup: 'chest' },
    ],
    home: [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-bench.gif', muscleGroup: 'chest' },
      { name: 'Dumbbell Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-flyes.gif', muscleGroup: 'chest' },
      { name: 'Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif', muscleGroup: 'chest' },
    ],
    minimal: [
      { name: 'Push-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif', muscleGroup: 'chest' },
      { name: 'Diamond Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/diamond-pushups.gif', muscleGroup: 'chest' },
      { name: 'Decline Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/decline-pushups.gif', muscleGroup: 'chest' },
    ],
  },
  back: {
    gym: [
      { name: 'Deadlifts', sets: 4, reps: '6-8', equipment: ['barbell'], difficulty: 'advanced', videoUrl: 'https://example.com/deadlift.gif', muscleGroup: 'back' },
      { name: 'Pull-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif', muscleGroup: 'back' },
      { name: 'Barbell Rows', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/barbell-rows.gif', muscleGroup: 'back' },
      { name: 'Lat Pulldowns', sets: 3, reps: '10-12', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/lat-pulldown.gif', muscleGroup: 'back' },
      { name: 'Cable Rows', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-rows.gif', muscleGroup: 'back' },
    ],
    home: [
      { name: 'Dumbbell Rows', sets: 4, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-rows.gif', muscleGroup: 'back' },
      { name: 'Renegade Rows', sets: 3, reps: '8-10', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/renegade-rows.gif', muscleGroup: 'back' },
      { name: 'Pull-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif', muscleGroup: 'back' },
    ],
    minimal: [
      { name: 'Pull-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif', muscleGroup: 'back' },
      { name: 'Inverted Rows', sets: 4, reps: '10-15', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/inverted-rows.gif', muscleGroup: 'back' },
      { name: 'Superman Holds', sets: 3, reps: '30-60s', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/superman.gif', muscleGroup: 'back' },
    ],
  },
  legs: {
    gym: [
      { name: 'Barbell Squats', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/squats.gif', muscleGroup: 'legs' },
      { name: 'Romanian Deadlifts', sets: 4, reps: '10-12', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/rdl.gif', muscleGroup: 'legs' },
      { name: 'Leg Press', sets: 3, reps: '12-15', equipment: ['machine'], difficulty: 'beginner', videoUrl: 'https://example.com/leg-press.gif', muscleGroup: 'legs' },
      { name: 'Leg Curls', sets: 3, reps: '12-15', equipment: ['machine'], difficulty: 'beginner', videoUrl: 'https://example.com/leg-curls.gif', muscleGroup: 'legs' },
      { name: 'Calf Raises', sets: 4, reps: '15-20', equipment: ['machine'], difficulty: 'beginner', videoUrl: 'https://example.com/calf-raises.gif', muscleGroup: 'legs' },
    ],
    home: [
      { name: 'Goblet Squats', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/goblet-squats.gif', muscleGroup: 'legs' },
      { name: 'Dumbbell Lunges', sets: 3, reps: '10-12 each', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-lunges.gif', muscleGroup: 'legs' },
      { name: 'Dumbbell RDLs', sets: 4, reps: '10-12', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/db-rdl.gif', muscleGroup: 'legs' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12 each', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/bulgarian-split.gif', muscleGroup: 'legs' },
    ],
    minimal: [
      { name: 'Bodyweight Squats', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/bw-squats.gif', muscleGroup: 'legs' },
      { name: 'Lunges', sets: 3, reps: '12-15 each', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/lunges.gif', muscleGroup: 'legs' },
      { name: 'Single Leg Deadlifts', sets: 3, reps: '10-12 each', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/single-leg-dl.gif', muscleGroup: 'legs' },
      { name: 'Jump Squats', sets: 3, reps: '10-15', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/jump-squats.gif', muscleGroup: 'legs' },
    ],
  },
  glutes: {
    gym: [
      { name: 'Hip Thrusts', sets: 4, reps: '10-12', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/hip-thrust.gif', muscleGroup: 'glutes' },
      { name: 'Cable Kickbacks', sets: 3, reps: '12-15 each', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-kickbacks.gif', muscleGroup: 'glutes' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12 each', equipment: ['dumbbells'], difficulty: 'intermediate', videoUrl: 'https://example.com/bulgarian-split.gif', muscleGroup: 'glutes' },
      { name: 'Glute Bridges', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/glute-bridge.gif', muscleGroup: 'glutes' },
    ],
    home: [
      { name: 'Dumbbell Hip Thrusts', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-hip-thrust.gif', muscleGroup: 'glutes' },
      { name: 'Dumbbell Sumo Squats', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/sumo-squats.gif', muscleGroup: 'glutes' },
      { name: 'Single Leg Glute Bridges', sets: 3, reps: '12-15 each', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/single-leg-bridge.gif', muscleGroup: 'glutes' },
    ],
    minimal: [
      { name: 'Glute Bridges', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/glute-bridge.gif', muscleGroup: 'glutes' },
      { name: 'Single Leg Glute Bridges', sets: 3, reps: '12-15 each', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/single-leg-bridge.gif', muscleGroup: 'glutes' },
      { name: 'Donkey Kicks', sets: 3, reps: '15-20 each', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/donkey-kicks.gif', muscleGroup: 'glutes' },
      { name: 'Fire Hydrants', sets: 3, reps: '15-20 each', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/fire-hydrants.gif', muscleGroup: 'glutes' },
    ],
  },
  shoulders: {
    gym: [
      { name: 'Overhead Press', sets: 4, reps: '6-8', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/ohp.gif', muscleGroup: 'shoulders' },
      { name: 'Lateral Raises', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/lateral-raises.gif', muscleGroup: 'shoulders' },
      { name: 'Face Pulls', sets: 3, reps: '15-20', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/face-pulls.gif', muscleGroup: 'shoulders' },
      { name: 'Rear Delt Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/rear-delt-flyes.gif', muscleGroup: 'shoulders' },
    ],
    home: [
      { name: 'Dumbbell Shoulder Press', sets: 4, reps: '8-10', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-shoulder-press.gif', muscleGroup: 'shoulders' },
      { name: 'Lateral Raises', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/lateral-raises.gif', muscleGroup: 'shoulders' },
      { name: 'Front Raises', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/front-raises.gif', muscleGroup: 'shoulders' },
      { name: 'Bent Over Reverse Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/reverse-flyes.gif', muscleGroup: 'shoulders' },
    ],
    minimal: [
      { name: 'Pike Push-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pike-pushups.gif', muscleGroup: 'shoulders' },
      { name: 'Handstand Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'advanced', videoUrl: 'https://example.com/handstand-pushups.gif', muscleGroup: 'shoulders' },
      { name: 'Plank to Down Dog', sets: 3, reps: '10-15', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/plank-downdog.gif', muscleGroup: 'shoulders' },
    ],
  },
  arms: {
    gym: [
      { name: 'Barbell Curls', sets: 3, reps: '10-12', equipment: ['barbell'], difficulty: 'beginner', videoUrl: 'https://example.com/barbell-curls.gif', muscleGroup: 'arms' },
      { name: 'Tricep Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/tricep-dips.gif', muscleGroup: 'arms' },
      { name: 'Cable Tricep Pushdowns', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/tricep-pushdowns.gif', muscleGroup: 'arms' },
      { name: 'Hammer Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/hammer-curls.gif', muscleGroup: 'arms' },
    ],
    home: [
      { name: 'Dumbbell Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-curls.gif', muscleGroup: 'arms' },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/overhead-tricep.gif', muscleGroup: 'arms' },
      { name: 'Hammer Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/hammer-curls.gif', muscleGroup: 'arms' },
      { name: 'Tricep Kickbacks', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/tricep-kickbacks.gif', muscleGroup: 'arms' },
    ],
    minimal: [
      { name: 'Close Grip Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/close-pushups.gif', muscleGroup: 'arms' },
      { name: 'Tricep Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/tricep-dips.gif', muscleGroup: 'arms' },
      { name: 'Chin-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/chinups.gif', muscleGroup: 'arms' },
    ],
  },
  chest: {
    gym: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/bench-press.gif', muscleGroup: 'chest' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/incline-db.gif', muscleGroup: 'chest' },
      { name: 'Cable Flyes', sets: 3, reps: '12-15', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-flyes.gif', muscleGroup: 'chest' },
      { name: 'Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/dips.gif', muscleGroup: 'chest' },
    ],
    home: [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-bench.gif', muscleGroup: 'chest' },
      { name: 'Dumbbell Flyes', sets: 3, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-flyes.gif', muscleGroup: 'chest' },
      { name: 'Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif', muscleGroup: 'chest' },
    ],
    minimal: [
      { name: 'Push-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif', muscleGroup: 'chest' },
      { name: 'Diamond Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/diamond-pushups.gif', muscleGroup: 'chest' },
      { name: 'Decline Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/decline-pushups.gif', muscleGroup: 'chest' },
    ],
  },
  core: {
    gym: [
      { name: 'Cable Crunches', sets: 3, reps: '15-20', equipment: ['cable'], difficulty: 'beginner', videoUrl: 'https://example.com/cable-crunches.gif', muscleGroup: 'core' },
      { name: 'Hanging Leg Raises', sets: 3, reps: '10-15', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/hanging-leg-raises.gif', muscleGroup: 'core' },
      { name: 'Ab Wheel Rollouts', sets: 3, reps: '10-12', equipment: ['ab wheel'], difficulty: 'advanced', videoUrl: 'https://example.com/ab-wheel.gif', muscleGroup: 'core' },
      { name: 'Plank', sets: 3, reps: '60s', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/plank.gif', muscleGroup: 'core' },
    ],
    home: [
      { name: 'Crunches', sets: 3, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/crunches.gif', muscleGroup: 'core' },
      { name: 'Bicycle Crunches', sets: 3, reps: '20-30', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/bicycle-crunches.gif', muscleGroup: 'core' },
      { name: 'Russian Twists', sets: 3, reps: '20-30', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/russian-twists.gif', muscleGroup: 'core' },
      { name: 'Plank', sets: 3, reps: '60s', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/plank.gif', muscleGroup: 'core' },
    ],
    minimal: [
      { name: 'Crunches', sets: 3, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/crunches.gif', muscleGroup: 'core' },
      { name: 'Bicycle Crunches', sets: 3, reps: '20-30', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/bicycle-crunches.gif', muscleGroup: 'core' },
      { name: 'Russian Twists', sets: 3, reps: '20-30', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/russian-twists.gif', muscleGroup: 'core' },
      { name: 'Plank', sets: 3, reps: '60s', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/plank.gif', muscleGroup: 'core' },
    ],
  },
  'upper body': {
    gym: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/bench-press.gif', muscleGroup: 'chest' },
      { name: 'Barbell Rows', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/barbell-rows.gif', muscleGroup: 'back' },
      { name: 'Overhead Press', sets: 3, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/ohp.gif', muscleGroup: 'shoulders' },
      { name: 'Pull-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif', muscleGroup: 'back' },
    ],
    home: [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-bench.gif', muscleGroup: 'chest' },
      { name: 'Dumbbell Rows', sets: 4, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-rows.gif', muscleGroup: 'back' },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '8-10', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-shoulder-press.gif', muscleGroup: 'shoulders' },
      { name: 'Dumbbell Curls', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-curls.gif', muscleGroup: 'arms' },
    ],
    minimal: [
      { name: 'Push-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif', muscleGroup: 'chest' },
      { name: 'Pull-ups', sets: 4, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif', muscleGroup: 'back' },
      { name: 'Pike Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pike-pushups.gif', muscleGroup: 'shoulders' },
      { name: 'Tricep Dips', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/tricep-dips.gif', muscleGroup: 'arms' },
    ],
  },
  'full body': {
    gym: [
      { name: 'Barbell Squats', sets: 4, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/squats.gif', muscleGroup: 'legs' },
      { name: 'Barbell Bench Press', sets: 3, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/bench-press.gif', muscleGroup: 'chest' },
      { name: 'Deadlifts', sets: 3, reps: '6-8', equipment: ['barbell'], difficulty: 'advanced', videoUrl: 'https://example.com/deadlift.gif', muscleGroup: 'back' },
      { name: 'Overhead Press', sets: 3, reps: '8-10', equipment: ['barbell'], difficulty: 'intermediate', videoUrl: 'https://example.com/ohp.gif', muscleGroup: 'shoulders' },
    ],
    home: [
      { name: 'Goblet Squats', sets: 4, reps: '12-15', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/goblet-squats.gif', muscleGroup: 'legs' },
      { name: 'Dumbbell Bench Press', sets: 3, reps: '8-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-bench.gif', muscleGroup: 'chest' },
      { name: 'Dumbbell Rows', sets: 3, reps: '10-12', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-rows.gif', muscleGroup: 'back' },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '8-10', equipment: ['dumbbells'], difficulty: 'beginner', videoUrl: 'https://example.com/db-shoulder-press.gif', muscleGroup: 'shoulders' },
    ],
    minimal: [
      { name: 'Bodyweight Squats', sets: 4, reps: '15-20', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/bw-squats.gif', muscleGroup: 'legs' },
      { name: 'Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'beginner', videoUrl: 'https://example.com/pushups.gif', muscleGroup: 'chest' },
      { name: 'Pull-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pullups.gif', muscleGroup: 'back' },
      { name: 'Pike Push-ups', sets: 3, reps: 'to failure', equipment: ['bodyweight'], difficulty: 'intermediate', videoUrl: 'https://example.com/pike-pushups.gif', muscleGroup: 'shoulders' },
    ],
  },
};

// Map focus areas to muscle groups
const focusAreaToMuscleGroups: { [key: string]: string[] } = {
  'Glutes': ['glutes', 'legs'],
  'Legs': ['legs', 'glutes'],
  'Core': ['core'],
  'Upper Body': ['chest', 'back', 'shoulders', 'arms'],
  'Full Body': ['legs', 'chest', 'back', 'shoulders'],
  'Chest': ['chest'],
  'Back': ['back'],
  'Arms': ['arms'],
  'Shoulders': ['shoulders'],
};

export function generateWorkoutSplit(profile: FitnessProfile): WorkoutDay[] {
  const { trainingDays, focusAreas, equipmentType, gender } = profile;
  
  console.log('Generating workout split with profile:', profile);
  
  // Prioritize glutes for female users
  const adjustedFocusAreas = gender === 'female' && !focusAreas.includes('Glutes')
    ? [...focusAreas, 'Glutes']
    : focusAreas;

  const workoutSplit: WorkoutDay[] = [];

  if (trainingDays === 2) {
    workoutSplit.push(
      { day: 'Monday', name: 'Upper Body', exercises: getExercises(['chest', 'back', 'shoulders', 'arms'], equipmentType, 6), dayIndex: 1 },
      { day: 'Thursday', name: 'Lower Body', exercises: getExercises(['legs', 'glutes'], equipmentType, 6), dayIndex: 4 }
    );
  } else if (trainingDays === 3) {
    workoutSplit.push(
      { day: 'Monday', name: 'Push', exercises: getExercises(['chest', 'shoulders', 'arms'], equipmentType, 6), dayIndex: 1 },
      { day: 'Wednesday', name: 'Pull', exercises: getExercises(['back', 'arms'], equipmentType, 6), dayIndex: 3 },
      { day: 'Friday', name: 'Legs', exercises: getExercises(['legs', 'glutes'], equipmentType, 6), dayIndex: 5 }
    );
  } else if (trainingDays === 4) {
    workoutSplit.push(
      { day: 'Monday', name: 'Upper Body A', exercises: getExercises(['chest', 'back'], equipmentType, 6), dayIndex: 1 },
      { day: 'Tuesday', name: 'Lower Body A', exercises: getExercises(['legs', 'glutes'], equipmentType, 6), dayIndex: 2 },
      { day: 'Thursday', name: 'Upper Body B', exercises: getExercises(['shoulders', 'arms'], equipmentType, 6), dayIndex: 4 },
      { day: 'Friday', name: 'Lower Body B', exercises: getExercises(['legs', 'glutes', 'core'], equipmentType, 6), dayIndex: 5 }
    );
  } else if (trainingDays === 5) {
    workoutSplit.push(
      { day: 'Monday', name: 'Chest & Triceps', exercises: getExercises(['chest', 'arms'], equipmentType, 6), dayIndex: 1 },
      { day: 'Tuesday', name: 'Back & Biceps', exercises: getExercises(['back', 'arms'], equipmentType, 6), dayIndex: 2 },
      { day: 'Wednesday', name: 'Legs', exercises: getExercises(['legs'], equipmentType, 6), dayIndex: 3 },
      { day: 'Thursday', name: 'Shoulders', exercises: getExercises(['shoulders', 'core'], equipmentType, 6), dayIndex: 4 },
      { day: 'Friday', name: 'Glutes & Legs', exercises: getExercises(['glutes', 'legs'], equipmentType, 6), dayIndex: 5 }
    );
  } else if (trainingDays >= 6) {
    workoutSplit.push(
      { day: 'Monday', name: 'Chest', exercises: getExercises(['chest'], equipmentType, 6), dayIndex: 1 },
      { day: 'Tuesday', name: 'Back', exercises: getExercises(['back'], equipmentType, 6), dayIndex: 2 },
      { day: 'Wednesday', name: 'Legs', exercises: getExercises(['legs'], equipmentType, 6), dayIndex: 3 },
      { day: 'Thursday', name: 'Shoulders', exercises: getExercises(['shoulders'], equipmentType, 6), dayIndex: 4 },
      { day: 'Friday', name: 'Arms', exercises: getExercises(['arms'], equipmentType, 6), dayIndex: 5 },
      { day: 'Saturday', name: 'Glutes & Core', exercises: getExercises(['glutes', 'core'], equipmentType, 6), dayIndex: 6 }
    );
  }

  console.log('Generated workout split:', workoutSplit);
  return workoutSplit;
}

function getExercises(muscleGroups: string[], equipmentType: string, count: number): Exercise[] {
  console.log('Getting exercises for:', { muscleGroups, equipmentType, count });
  
  const exercises: Exercise[] = [];
  const exercisesPerGroup = Math.ceil(count / muscleGroups.length);
  
  muscleGroups.forEach(group => {
    const groupKey = group.toLowerCase();
    const equipmentKey = equipmentType as 'gym' | 'home' | 'minimal';
    
    console.log('Looking for exercises:', { groupKey, equipmentKey });
    
    // Get exercises for this muscle group and equipment type
    const groupExercises = exerciseDatabase[groupKey as keyof typeof exerciseDatabase]?.[equipmentKey];
    
    if (groupExercises && groupExercises.length > 0) {
      console.log(`Found ${groupExercises.length} exercises for ${groupKey} with ${equipmentKey}`);
      exercises.push(...groupExercises.slice(0, exercisesPerGroup));
    } else {
      console.log(`No exercises found for ${groupKey} with ${equipmentKey}`);
    }
  });

  // Map exercises to the correct format with unique IDs
  const mappedExercises = exercises.slice(0, count).map((ex, idx) => ({
    id: `${Date.now()}-${idx}`,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    videoUrl: ex.videoUrl,
    muscleGroups: [ex.muscleGroup],
    equipment: ex.equipment,
    muscleGroup: ex.muscleGroup,
    difficulty: ex.difficulty,
    instructions: [
      `Perform ${ex.sets} sets of ${ex.reps} reps`,
      'Rest 60-90 seconds between sets',
      'Focus on proper form and controlled movements'
    ],
  }));

  console.log('Mapped exercises:', mappedExercises);
  return mappedExercises;
}

export function getTodaysWorkout(profile: FitnessProfile): WorkoutDay | null {
  console.log('Getting today\'s workout for profile:', profile);
  
  const split = generateWorkoutSplit(profile);
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  console.log('Today is day:', today);
  console.log('Generated split:', split);
  
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
  const workout = split.find(day => day.day === todayName);
  
  console.log('Found workout for today:', workout);
  
  return workout || null;
}
