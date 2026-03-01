
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
import { apiPost } from "@/utils/api";

type Mode = "signin" | "signup" | "forgot-password" | "reset-password";

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

  // Forgot password state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Reset password state (for deep link token)
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

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

  // Check for password reset token in URL (web deep link)
  useEffect(() => {
    if (Platform.OS === "web") {
      try {
        // @ts-expect-error - window is available on web
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const resetMode = urlParams.get('mode');
        if (token && resetMode === 'reset-password') {
          console.log('[AuthScreen] Found reset token in URL, switching to reset mode');
          setResetToken(token);
          setMode('reset-password');
        }
      } catch (e) {
        // Not on web or URL parsing failed
      }
    }
  }, []);

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

  const handleForgotPassword = async () => {
    console.log('[AuthScreen] User tapped Forgot Password');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      showError("Please enter a valid email address");
      return;
    }

    setForgotLoading(true);
    try {
      console.log('[AuthScreen] Sending forgot password request for:', forgotEmail);
      await apiPost('/api/auth/forgot-password', { email: forgotEmail });
      console.log('[AuthScreen] Forgot password email sent successfully');
      setForgotSuccess(true);
    } catch (error: any) {
      console.error('[AuthScreen] Forgot password error:', error);
      // Still show success for security (don't reveal if email exists)
      setForgotSuccess(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPasswordModal(false);
    setForgotEmail("");
    setForgotSuccess(false);
    setForgotLoading(false);
  };

  const handleResetPassword = async () => {
    console.log('[AuthScreen] User tapped Reset Password');

    if (!newPassword || !confirmPassword) {
      showError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      showError(validation.message);
      return;
    }

    setLoading(true);
    try {
      console.log('[AuthScreen] Sending reset password request');
      await apiPost('/api/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      console.log('[AuthScreen] Password reset successful');
      setResetSuccess(true);
    } catch (error: any) {
      console.error('[AuthScreen] Reset password error:', error);
      const message = error.message?.includes('400')
        ? "This reset link has expired or is invalid. Please request a new one."
        : error.message || "Failed to reset password. Please try again.";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const modeTitle = mode === "signin" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password";
  const modeSubtitle = mode === "signin" 
    ? "Sign in to continue your fitness journey" 
    : mode === "signup"
    ? "Start your transformation today"
    : "Create a new password for your account";

  // Reset password success screen
  if (mode === "reset-password" && resetSuccess) {
    return (
      <View style={styles.container}>
        <ParticleBackground />
        <View style={styles.centeredContent}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={80}
            color={colors.success}
          />
          <Text style={styles.title}>Password Reset!</Text>
          <Text style={styles.subtitle}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setMode("signin");
              setResetSuccess(false);
              setNewPassword("");
              setConfirmPassword("");
            }}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
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

  // Reset password form (when token is present from email link)
  if (mode === "reset-password") {
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
                  ios_icon_name="lock.rotation"
                  android_material_icon_name="lock-reset"
                  size={64}
                  color={colors.primary}
                />
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.subtitle}>
                  Create a strong new password for your account
                </Text>
              </View>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.grey}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <Text style={styles.passwordHint}>
                    Must be 8+ characters with uppercase, lowercase, and number
                  </Text>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.grey}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setMode("signin")}
                  disabled={loading}
                >
                  <Text style={styles.switchModeText}>Back to Sign In</Text>
                </TouchableOpacity>
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
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  {mode === "signin" && (
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[AuthScreen] User tapped Forgot Password link');
                        setForgotEmail(email);
                        setForgotSuccess(false);
                        setShowForgotPasswordModal(true);
                      }}
                    >
                      <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}
                </View>
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

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseForgotPassword}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", maxWidth: 400 }}
          >
            <View style={styles.modalContent}>
              {forgotSuccess ? (
                <>
                  <IconSymbol
                    ios_icon_name="envelope.badge.checkmark.fill"
                    android_material_icon_name="mark-email-read"
                    size={56}
                    color={colors.success}
                  />
                  <Text style={styles.modalTitle}>Check Your Email</Text>
                  <Text style={styles.modalMessage}>
                    If an account exists for {forgotEmail}, you will receive a password reset link shortly.{"\n\n"}
                    The link expires in 1 hour. Check your spam folder if you don't see it.
                  </Text>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleCloseForgotPassword}
                  >
                    <Text style={styles.modalButtonText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="lock.rotation"
                    android_material_icon_name="lock-reset"
                    size={56}
                    color={colors.primary}
                  />
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalMessage}>
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>
                  <View style={styles.forgotInputContainer}>
                    <TextInput
                      style={styles.forgotInput}
                      placeholder="your@email.com"
                      placeholderTextColor={colors.grey}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.modalButton, forgotLoading && styles.buttonDisabled]}
                    onPress={handleForgotPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={handleCloseForgotPassword}
                    disabled={forgotLoading}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
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
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  modalCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotPasswordLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  forgotInputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  forgotInput: {
    height: 50,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
});
