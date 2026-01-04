
import { FoodItem } from '@/types/fitness';

export const foodDatabase: FoodItem[] = [
  // Proteins
  { id: 'food-1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, per_100g: true },
  { id: 'food-2', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, per_100g: true },
  { id: 'food-3', name: 'Eggs', calories: 155, protein: 13, carbs: 1, fat: 11, per_100g: true },
  { id: 'food-4', name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, per_100g: true },
  { id: 'food-5', name: 'Tuna', calories: 132, protein: 28, carbs: 0, fat: 1.3, per_100g: true },
  { id: 'food-6', name: 'Turkey Breast', calories: 135, protein: 30, carbs: 0, fat: 1, per_100g: true },
  { id: 'food-7', name: 'Cottage Cheese', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, per_100g: true },
  { id: 'food-8', name: 'Protein Powder', calories: 120, protein: 24, carbs: 3, fat: 1.5, per_100g: true, premium: true },
  
  // Carbs
  { id: 'food-9', name: 'White Rice', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, per_100g: true },
  { id: 'food-10', name: 'Brown Rice', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, per_100g: true },
  { id: 'food-11', name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, per_100g: true },
  { id: 'food-12', name: 'Oats', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, per_100g: true },
  { id: 'food-13', name: 'Whole Wheat Bread', calories: 247, protein: 13, carbs: 41, fat: 3.4, per_100g: true },
  { id: 'food-14', name: 'Quinoa', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, per_100g: true },
  { id: 'food-15', name: 'Pasta', calories: 131, protein: 5, carbs: 25, fat: 1.1, per_100g: true },
  
  // Vegetables
  { id: 'food-16', name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, per_100g: true },
  { id: 'food-17', name: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, per_100g: true },
  { id: 'food-18', name: 'Asparagus', calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, per_100g: true },
  { id: 'food-19', name: 'Bell Peppers', calories: 31, protein: 1, carbs: 6, fat: 0.3, per_100g: true },
  { id: 'food-20', name: 'Tomatoes', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, per_100g: true },
  
  // Fruits
  { id: 'food-21', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, per_100g: true },
  { id: 'food-22', name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, per_100g: true },
  { id: 'food-23', name: 'Blueberries', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, per_100g: true },
  { id: 'food-24', name: 'Strawberries', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, per_100g: true },
  { id: 'food-25', name: 'Avocado', calories: 160, protein: 2, carbs: 8.5, fat: 15, per_100g: true },
  
  // Fats
  { id: 'food-26', name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, per_100g: true },
  { id: 'food-27', name: 'Peanut Butter', calories: 588, protein: 25, carbs: 20, fat: 50, per_100g: true },
  { id: 'food-28', name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, per_100g: true },
  { id: 'food-29', name: 'Walnuts', calories: 654, protein: 15, carbs: 14, fat: 65, per_100g: true },
  { id: 'food-30', name: 'Cashews', calories: 553, protein: 18, carbs: 30, fat: 44, per_100g: true },
  
  // Dairy
  { id: 'food-31', name: 'Whole Milk', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, per_100g: true },
  { id: 'food-32', name: 'Cheddar Cheese', calories: 403, protein: 25, carbs: 1.3, fat: 33, per_100g: true },
  { id: 'food-33', name: 'Mozzarella', calories: 280, protein: 28, carbs: 3.1, fat: 17, per_100g: true },
  
  // Premium Items
  { id: 'food-34', name: 'Grass-Fed Beef', calories: 250, protein: 26, carbs: 0, fat: 15, per_100g: true, premium: true },
  { id: 'food-35', name: 'Wild Salmon', calories: 182, protein: 25, carbs: 0, fat: 8, per_100g: true, premium: true },
  { id: 'food-36', name: 'Organic Eggs', calories: 147, protein: 13, carbs: 0.7, fat: 10, per_100g: true, premium: true },
  { id: 'food-37', name: 'Acai Bowl', calories: 211, protein: 3, carbs: 35, fat: 6, per_100g: true, premium: true },
  { id: 'food-38', name: 'Protein Bar', calories: 200, protein: 20, carbs: 22, fat: 7, per_100g: true, premium: true },
  { id: 'food-39', name: 'Pre-Workout', calories: 5, protein: 0, carbs: 1, fat: 0, per_100g: true, premium: true },
  { id: 'food-40', name: 'BCAA', calories: 0, protein: 5, carbs: 0, fat: 0, per_100g: true, premium: true },
  
  // More common foods
  { id: 'food-41', name: 'Beef Steak', calories: 271, protein: 26, carbs: 0, fat: 18, per_100g: true },
  { id: 'food-42', name: 'Pork Chop', calories: 242, protein: 27, carbs: 0, fat: 14, per_100g: true },
  { id: 'food-43', name: 'Shrimp', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, per_100g: true },
  { id: 'food-44', name: 'Tofu', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, per_100g: true },
  { id: 'food-45', name: 'Lentils', calories: 116, protein: 9, carbs: 20, fat: 0.4, per_100g: true },
  { id: 'food-46', name: 'Black Beans', calories: 132, protein: 8.9, carbs: 24, fat: 0.5, per_100g: true },
  { id: 'food-47', name: 'Chickpeas', calories: 164, protein: 8.9, carbs: 27, fat: 2.6, per_100g: true },
  { id: 'food-48', name: 'Hummus', calories: 166, protein: 8, carbs: 14, fat: 10, per_100g: true },
  { id: 'food-49', name: 'Bagel', calories: 257, protein: 10, carbs: 50, fat: 1.5, per_100g: true },
  { id: 'food-50', name: 'Granola', calories: 471, protein: 13, carbs: 64, fat: 20, per_100g: true },
];

export const getFoodsByCategory = () => {
  return {
    proteins: foodDatabase.filter(f => f.protein > 15),
    carbs: foodDatabase.filter(f => f.carbs > 20),
    fats: foodDatabase.filter(f => f.fat > 10),
    vegetables: foodDatabase.filter(f => f.calories < 50 && f.carbs < 10),
    all: foodDatabase,
  };
};
