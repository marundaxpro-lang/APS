
import { Exercise, WorkoutDay, FitnessProfile } from '@/types/fitness';

// Exercise database by muscle group
export const exerciseDatabase = {
  chest: [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10', restTime: 90, muscleGroup: 'chest' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restTime: 60, muscleGroup: 'chest' },
    { name: 'Cable Flyes', sets: 3, reps: '12-15', restTime: 60, muscleGroup: 'chest' },
    { name: 'Push-ups', sets: 3, reps: 'To Failure', restTime: 45, muscleGroup: 'chest' },
  ],
  back: [
    { name: 'Deadlift', sets: 4, reps: '6-8', restTime: 120, muscleGroup: 'back' },
    { name: 'Pull-ups', sets: 4, reps: '8-12', restTime: 90, muscleGroup: 'back' },
    { name: 'Barbell Rows', sets: 4, reps: '8-10', restTime: 90, muscleGroup: 'back' },
    { name: 'Face Pulls', sets: 3, reps: '15-20', restTime: 60, muscleGroup: 'back' },
  ],
  legs: [
    { name: 'Barbell Squat', sets: 4, reps: '8-10', restTime: 120, muscleGroup: 'legs' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restTime: 90, muscleGroup: 'legs' },
    { name: 'Leg Press', sets: 3, reps: '12-15', restTime: 90, muscleGroup: 'legs' },
    { name: 'Leg Curls', sets: 3, reps: '12-15', restTime: 60, muscleGroup: 'legs' },
  ],
  shoulders: [
    { name: 'Overhead Press', sets: 4, reps: '6-8', restTime: 90, muscleGroup: 'shoulders' },
    { name: 'Lateral Raises', sets: 4, reps: '12-15', restTime: 60, muscleGroup: 'shoulders' },
    { name: 'Face Pulls', sets: 3, reps: '15-20', restTime: 60, muscleGroup: 'shoulders' },
    { name: 'Rear Delt Flyes', sets: 3, reps: '12-15', restTime: 60, muscleGroup: 'shoulders' },
  ],
  arms: [
    { name: 'Barbell Curl', sets: 3, reps: '10-12', restTime: 60, muscleGroup: 'arms' },
    { name: 'Tricep Dips', sets: 3, reps: '10-12', restTime: 60, muscleGroup: 'arms' },
    { name: 'Hammer Curls', sets: 3, reps: '12-15', restTime: 45, muscleGroup: 'arms' },
    { name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', restTime: 45, muscleGroup: 'arms' },
  ],
};

// Generate workout split based on user profile
export function generateWorkoutSplit(profile: FitnessProfile): WorkoutDay[] {
  const { trainingFrequency, splitType, experience } = profile;

  // Adjust volume based on experience
  const volumeMultiplier = experience === 'beginner' ? 0.8 : experience === 'advanced' ? 1.2 : 1;

  if (splitType === 'ppl') {
    // Push Pull Legs split
    const split: WorkoutDay[] = [
      {
        day: 'Monday',
        type: 'Push (Chest, Shoulders, Triceps)',
        exercises: [
          ...exerciseDatabase.chest.slice(0, 2),
          ...exerciseDatabase.shoulders.slice(0, 2),
          ...exerciseDatabase.arms.slice(1, 2), // Triceps
        ].map((ex, i) => ({ ...ex, id: `push-${i}` })),
      },
      {
        day: 'Tuesday',
        type: 'Pull (Back, Biceps)',
        exercises: [
          ...exerciseDatabase.back,
          ...exerciseDatabase.arms.slice(0, 1), // Biceps
        ].map((ex, i) => ({ ...ex, id: `pull-${i}` })),
      },
      {
        day: 'Wednesday',
        type: 'Legs',
        exercises: exerciseDatabase.legs.map((ex, i) => ({ ...ex, id: `legs-${i}` })),
      },
    ];

    if (trainingFrequency >= 6) {
      return [...split, ...split.map(d => ({ ...d, day: d.day === 'Monday' ? 'Thursday' : d.day === 'Tuesday' ? 'Friday' : 'Saturday' }))];
    } else if (trainingFrequency >= 4) {
      return [...split, split[0]]; // Repeat push day
    }
    return split;
  }

  if (splitType === 'upper-lower') {
    return [
      {
        day: 'Monday',
        type: 'Upper Body',
        exercises: [
          ...exerciseDatabase.chest.slice(0, 2),
          ...exerciseDatabase.back.slice(0, 2),
          ...exerciseDatabase.shoulders.slice(0, 1),
        ].map((ex, i) => ({ ...ex, id: `upper-${i}` })),
      },
      {
        day: 'Wednesday',
        type: 'Lower Body',
        exercises: exerciseDatabase.legs.map((ex, i) => ({ ...ex, id: `lower-${i}` })),
      },
      {
        day: 'Friday',
        type: 'Upper Body',
        exercises: [
          ...exerciseDatabase.chest.slice(2),
          ...exerciseDatabase.back.slice(2),
          ...exerciseDatabase.arms,
        ].map((ex, i) => ({ ...ex, id: `upper2-${i}` })),
      },
    ];
  }

  if (splitType === 'full-body') {
    const fullBodyWorkout: WorkoutDay = {
      day: 'Full Body',
      type: 'Full Body',
      exercises: [
        exerciseDatabase.legs[0],
        exerciseDatabase.chest[0],
        exerciseDatabase.back[1],
        exerciseDatabase.shoulders[0],
      ].map((ex, i) => ({ ...ex, id: `full-${i}` })),
    };

    return Array(trainingFrequency).fill(null).map((_, i) => ({
      ...fullBodyWorkout,
      day: ['Monday', 'Wednesday', 'Friday', 'Tuesday', 'Thursday', 'Saturday'][i],
    }));
  }

  // Bro split (5-6 days)
  return [
    { day: 'Monday', type: 'Chest', exercises: exerciseDatabase.chest.map((ex, i) => ({ ...ex, id: `chest-${i}` })) },
    { day: 'Tuesday', type: 'Back', exercises: exerciseDatabase.back.map((ex, i) => ({ ...ex, id: `back-${i}` })) },
    { day: 'Wednesday', type: 'Shoulders', exercises: exerciseDatabase.shoulders.map((ex, i) => ({ ...ex, id: `shoulders-${i}` })) },
    { day: 'Thursday', type: 'Legs', exercises: exerciseDatabase.legs.map((ex, i) => ({ ...ex, id: `legs-${i}` })) },
    { day: 'Friday', type: 'Arms', exercises: exerciseDatabase.arms.map((ex, i) => ({ ...ex, id: `arms-${i}` })) },
  ];
}

export function getTodaysWorkout(profile: FitnessProfile): WorkoutDay | null {
  const split = generateWorkoutSplit(profile);
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const dayMap: { [key: number]: string } = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };

  const todayName = dayMap[today];
  return split.find(d => d.day === todayName) || split[0];
}
