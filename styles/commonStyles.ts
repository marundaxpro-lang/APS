
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  primary: '#459b9b',    // Teal primary
  secondary: '#357a7a',  // Darker teal
  accent: '#5fb5b5',     // Light teal
  background: '#050608', // Dark background
  backgroundAlt: '#0a0e12', // Slightly lighter dark
  text: '#e3e3e3',       // Light text
  textSecondary: '#9ca3af', // Gray text
  grey: '#374151',       // Dark grey
  card: 'rgba(255, 255, 255, 0.05)', // Glass morphism card
  cardBorder: 'rgba(255, 255, 255, 0.1)', // Glass morphism border
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginVertical: 8,
    width: '100%',
  },
  glassCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginVertical: 8,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
