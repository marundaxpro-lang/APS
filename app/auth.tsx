
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import ParticleBackground from "@/components/ParticleBackground";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, user } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    console.log('[AuthScreen] Checking if user is already authenticated');
    const checkAuthAndOnboarding = async () => {
      if (user) {
        console.log('[AuthScreen] User is authenticated, checking onboarding status');
        const hasProfile = await AsyncStorage.getItem('fitnessProfile');
        if (hasProfile) {
          console.log('[AuthScreen] User has completed onboarding, redirecting to home');
          router.replace('/(tabs)/(home)');
        } else {
          console.log('[AuthScreen] User needs to complete onboarding');
          router.replace('/onboarding');
        }
      }
    };
    checkAuthAndOnboarding();
  }, [user, router]);

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true, message: "" };
  };

  const handleEmailAuth = async () => {
    console.log('[AuthScreen] User tapped email auth button');
    if (!email || !password) {
      showError("Please enter email and password");
      return;
    }

    // Validate password for signup
    if (mode === "signup") {
      const validation = validatePassword(password);
      if (!validation.valid) {
        showError(validation.message);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        console.log('[AuthScreen] Signing in with email');
        await signInWithEmail(email, password);
        console.log('[AuthScreen] Sign in successful, checking onboarding');
        const hasProfile = await AsyncStorage.getItem('fitnessProfile');
        if (hasProfile) {
          router.replace('/(tabs)/(home)');
        } else {
          router.replace('/onboarding');
        }
      } else {
        console.log('[AuthScreen] Signing up with email');
        await signUpWithEmail(email, password, name);
        console.log('[AuthScreen] Sign up successful, redirecting to onboarding');
        router.replace('/onboarding');
      }
    } catch (error: any) {
      console.error('[AuthScreen] Email auth error:', error);
      showError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    console.log('[AuthScreen] User tapped social auth:', provider);
    setLoading(true);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      }
      console.log('[AuthScreen] Social auth successful, checking onboarding');
      const hasProfile = await AsyncStorage.getItem('fitnessProfile');
      if (hasProfile) {
        router.replace('/(tabs)/(home)');
      } else {
        router.replace('/onboarding');
      }
    } catch (error: any) {
      console.error('[AuthScreen] Social auth error:', error);
      showError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    console.log('[AuthScreen] User tapped Continue as Guest');
    try {
      await AsyncStorage.setItem('isGuestUser', 'true');
      const hasProfile = await AsyncStorage.getItem('fitnessProfile');
      if (hasProfile) {
        console.log('[AuthScreen] Guest has profile, redirecting to home');
        router.replace('/(tabs)/(home)');
      } else {
        console.log('[AuthScreen] Guest needs onboarding');
        router.replace('/onboarding');
      }
    } catch (error) {
      console.error('[AuthScreen] Error setting guest mode:', error);
    }
  };

  const modeTitle = mode === "signin" ? "Welcome Back" : "Create Account";
  const modeSubtitle = mode === "signin" 
    ? "Sign in to continue your fitness journey" 
    : "Start your transformation today";

  return (
    <View style={styles.container}>
      <ParticleBackground />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <IconSymbol
                ios_icon_name="figure.strengthtraining.traditional"
                android_material_icon_name="fitness-center"
                size={64}
                color={colors.primary}
              />
              <Text style={styles.title}>{modeTitle}</Text>
              <Text style={styles.subtitle}>{modeSubtitle}</Text>
            </View>

            <View style={styles.form}>
              {mode === "signup" && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Name (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.grey}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.grey}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.grey}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {mode === "signup" && (
                  <Text style={styles.passwordHint}>
                    Must be 8+ characters with uppercase, lowercase, and number
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleEmailAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === "signin" ? "Sign In" : "Sign Up"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => {
                  console.log('[AuthScreen] User switched mode');
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
              >
                <Text style={styles.switchModeText}>
                  {mode === "signin"
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Sign In"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialAuth("google")}
                disabled={loading}
              >
                <View style={styles.socialButtonContent}>
                  <IconSymbol
                    ios_icon_name="g.circle.fill"
                    android_material_icon_name="g-translate"
                    size={24}
                    color={colors.text}
                  />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </View>
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  onPress={() => handleSocialAuth("apple")}
                  disabled={loading}
                >
                  <View style={styles.socialButtonContent}>
                    <IconSymbol
                      ios_icon_name="apple.logo"
                      android_material_icon_name="apple"
                      size={24}
                      color="#fff"
                    />
                    <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                      Continue with Apple
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.guestSection}>
                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={handleContinueAsGuest}
                >
                  <Text style={styles.guestButtonText}>Continue as Guest</Text>
                </TouchableOpacity>
                <Text style={styles.guestNote}>
                  You can create an account later to sync your progress
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="error"
              size={48}
              color={colors.error}
            />
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    minHeight: 600,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  primaryButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 8,
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  socialButton: {
    height: 50,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  socialButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socialButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  guestSection: {
    marginTop: 32,
    alignItems: "center",
  },
  guestButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  guestButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  guestNote: {
    fontSize: 12,
    color: colors.grey,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 120,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
