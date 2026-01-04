
import { Exercise } from '@/types/fitness';

export const workoutDatabase = {
  chest: [
    { id: 'chest-1', name: 'Bench Press', sets: 4, reps: '8-10', category: 'chest' as const },
    { id: 'chest-2', name: 'Incline DB Press', sets: 3, reps: '10-12', category: 'chest' as const },
    { id: 'chest-3', name: 'Cable Flyes', sets: 3, reps: '12-15', category: 'chest' as const },
    { id: 'chest-4', name: 'Push-ups', sets: 3, reps: 'failure', category: 'chest' as const },
  ],
  shoulders: [
    { id: 'shoulders-1', name: 'Overhead Press', sets: 4, reps: '6-8', category: 'shoulders' as const },
    { id: 'shoulders-2', name: 'Lateral Raises', sets: 4, reps: '12-15', category: 'shoulders' as const },
    { id: 'shoulders-3', name: 'Face Pulls', sets: 3, reps: '15-20', category: 'shoulders' as const },
    { id: 'shoulders-4', name: 'Rear Delt Flyes', sets: 3, reps: '12-15', category: 'shoulders' as const },
  ],
  arms: [
    { id: 'arms-1', name: 'Barbell Curl', sets: 3, reps: '8-12', category: 'arms' as const },
    { id: 'arms-2', name: 'Tricep Dips', sets: 3, reps: '10-12', category: 'arms' as const },
    { id: 'arms-3', name: 'Hammer Curls', sets: 3, reps: '10-12', category: 'arms' as const },
    { id: 'arms-4', name: 'Overhead Extension', sets: 3, reps: '12-15', category: 'arms' as const },
  ],
  back: [
    { id: 'back-1', name: 'Deadlift', sets: 4, reps: '5-8', category: 'back' as const },
    { id: 'back-2', name: 'Pull-ups', sets: 3, reps: '8-12', category: 'back' as const },
    { id: 'back-3', name: 'Barbell Rows', sets: 4, reps: '8-10', category: 'back' as const },
    { id: 'back-4', name: 'Lat Pulldown', sets: 3, reps: '10-12', category: 'back' as const },
  ],
  legs: [
    { id: 'legs-1', name: 'Squats', sets: 4, reps: '8-10', category: 'legs' as const },
    { id: 'legs-2', name: 'Romanian Deadlift', sets: 3, reps: '10-12', category: 'legs' as const },
    { id: 'legs-3', name: 'Leg Press', sets: 3, reps: '12-15', category: 'legs' as const },
    { id: 'legs-4', name: 'Leg Curls', sets: 3, reps: '12-15', category: 'legs' as const },
  ],
  abs: [
    { id: 'abs-1', name: 'Planks', sets: 3, reps: '60s', category: 'abs' as const },
    { id: 'abs-2', name: 'Crunches', sets: 3, reps: '15-20', category: 'abs' as const },
    { id: 'abs-3', name: 'Russian Twists', sets: 3, reps: '20', category: 'abs' as const },
    { id: 'abs-4', name: 'Leg Raises', sets: 3, reps: '12-15', category: 'abs' as const },
  ],
  glutes: [
    { id: 'glutes-1', name: 'Hip Thrusts', sets: 4, reps: '10-12', category: 'glutes' as const },
    { id: 'glutes-2', name: 'Bulgarian Split Squats', sets: 3, reps: '10-12', category: 'glutes' as const },
    { id: 'glutes-3', name: 'Glute Bridges', sets: 3, reps: '15-20', category: 'glutes' as const },
    { id: 'glutes-4', name: 'Cable Kickbacks', sets: 3, reps: '12-15', category: 'glutes' as const },
  ],
};

export const getTodaysWorkout = (dayOfWeek: number): { type: 'Push' | 'Pull' | 'Legs'; exercises: Exercise[] } => {
  const day = dayOfWeek % 3;
  
  if (day === 0) {
    return {
      type: 'Push',
      exercises: [...workoutDatabase.chest, ...workoutDatabase.shoulders, ...workoutDatabase.arms.slice(1, 3)],
    };
  } else if (day === 1) {
    return {
      type: 'Pull',
      exercises: [...workoutDatabase.back, ...workoutDatabase.arms.slice(0, 2)],
    };
  } else {
    return {
      type: 'Legs',
      exercises: [...workoutDatabase.legs, ...workoutDatabase.glutes, ...workoutDatabase.abs.slice(0, 2)],
    };
  }
};
