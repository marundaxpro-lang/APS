
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
import { apiPost } from "@/utils/api";

const TEAL = "#00D4AA";

type Mode = "signin" | "signup" | "forgot-password" | "reset-password";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // NOTE: No mount-time redirect here. AuthGuard in _layout.tsx is the single
  // source of truth for auth-based navigation. Redirecting from both places
  // causes screens to stack on top of each other.

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

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: "Password must contain an uppercase letter" };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: "Password must contain a lowercase letter" };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: "Password must contain a number" };
    }
    return { valid: true, message: "" };
  };

  const handleEmailAuth = async () => {
    console.log('[AuthScreen] User tapped email auth button, mode:', mode);

    if (!validateEmail(email)) return;

    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    if (mode === "signup") {
      const validation = validatePassword(password);
      if (!validation.valid) {
        setPasswordError(validation.message);
        return;
      }
    }

    setPasswordError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        console.log('[AuthScreen] Signing in with email');
        await signInWithEmail(email, password);
        // Navigation is handled by the useEffect watching user + onboardingCompleted
        console.log('[AuthScreen] Sign in successful, navigation will trigger via useEffect');
      } else {
        console.log('[AuthScreen] Signing up with email');
        await signUpWithEmail(email, password, name);
        console.log('[AuthScreen] Sign up successful, navigation will trigger via useEffect');
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
      // Navigation is handled by the useEffect watching user + onboardingCompleted
      console.log('[AuthScreen] Social auth successful, navigation will trigger via useEffect');
    } catch (error: any) {
      console.error('[AuthScreen] Social auth error:', error);
      showError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    console.log('[AuthScreen] User tapped Create account link');
    setMode("signup");
    setEmailError("");
    setPasswordError("");
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

  const ErrorModal = () => (
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
  );

  if (mode === "reset-password" && resetSuccess) {
    return (
      <View style={styles.container}>
        <ParticleBackground />
        <View style={styles.centeredContent}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={80}
            color={TEAL}
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
        <ErrorModal />
      </View>
    );
  }

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
                  color={TEAL}
                />
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.subtitle}>
                  Create a strong new password for your account
                </Text>
              </View>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.grey}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <IconSymbol
                        ios_icon_name={showPassword ? "eye.slash.fill" : "eye.fill"}
                        android_material_icon_name={showPassword ? "visibility-off" : "visibility"}
                        size={20}
                        color={colors.grey}
                      />
                    </TouchableOpacity>
                  </View>
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
                    secureTextEntry={!showPassword}
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
        <ErrorModal />
      </View>
    );
  }

  const isSignIn = mode === "signin";
  const modeTitle = isSignIn ? "Train Smarter.\nPerform Better." : "Start Your Journey";
  const modeSubtitle = isSignIn
    ? "Your progress, goals & plans — all saved."
    : "Personalized fitness that adapts to you";

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
            {/* Hero */}
            <View style={styles.header}>
              <IconSymbol
                ios_icon_name="figure.strengthtraining.traditional"
                android_material_icon_name="fitness-center"
                size={56}
                color={TEAL}
              />
              <Text style={styles.title}>{modeTitle}</Text>
              <Text style={styles.heroSubtitle}>{modeSubtitle}</Text>

              {/* Trust bullets — compact row */}
              <View style={styles.trustRow}>
                <View style={styles.trustItem}>
                  <Text style={styles.trustCheck}>✓</Text>
                  <Text style={styles.trustText}>AI-personalized plans</Text>
                </View>
                <View style={styles.trustItem}>
                  <Text style={styles.trustCheck}>✓</Text>
                  <Text style={styles.trustText}>Gym, home, or bodyweight</Text>
                </View>
                <View style={styles.trustItem}>
                  <Text style={styles.trustCheck}>✓</Text>
                  <Text style={styles.trustText}>Auto progress tracking</Text>
                </View>
              </View>
            </View>

            {/* Form */}
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
                  style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.grey}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) validateEmail(text);
                  }}
                  onBlur={() => validateEmail(email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  {isSignIn && (
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[AuthScreen] User tapped Forgot Password link');
                        setForgotEmail(email);
                        setForgotSuccess(false);
                        setShowForgotPasswordModal(true);
                      }}
                      style={styles.forgotPasswordButton}
                    >
                      <Text style={styles.forgotPasswordLink}>Forgot?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[styles.passwordInput, passwordError ? styles.inputError : null]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.grey}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError("");
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType={isSignIn ? "password" : "newPassword"}
                    autoComplete={isSignIn ? "password" : "password-new"}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <IconSymbol
                      ios_icon_name={showPassword ? "eye.slash.fill" : "eye.fill"}
                      android_material_icon_name={showPassword ? "visibility-off" : "visibility"}
                      size={20}
                      color={colors.grey}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                {mode === "signup" && !passwordError && (
                  <Text style={styles.passwordHint}>
                    8+ characters with uppercase, lowercase, and number
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
                    {isSignIn ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social buttons — Apple first on iOS (App Store requirement) */}
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
                      size={22}
                      color="#fff"
                    />
                    <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                      Continue with Apple
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialAuth("google")}
                disabled={loading}
              >
                <View style={styles.socialButtonContent}>
                  <IconSymbol
                    ios_icon_name="g.circle.fill"
                    android_material_icon_name="g-translate"
                    size={22}
                    color={colors.text}
                  />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </View>
              </TouchableOpacity>

              {/* Create account / switch mode */}
              <View style={styles.bottomLinks}>
                {isSignIn && (
                  <View style={styles.createAccountRow}>
                    <Text style={styles.createAccountLabel}>New to Apex? </Text>
                    <TouchableOpacity onPress={handleCreateAccount}>
                      <Text style={styles.createAccountLink}>Create account</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isSignIn && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log('[AuthScreen] User switched to sign in mode');
                      setMode("signin");
                      setEmailError("");
                      setPasswordError("");
                    }}
                  >
                    <Text style={styles.switchModeText}>Already have an account? Sign In</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal />

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
                    color={TEAL}
                  />
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalMessage}>
                    Enter your email and we'll send you a reset link.
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
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
    minHeight: 600,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  trustRow: {
    gap: 8,
    alignItems: "flex-start",
    width: "100%",
    paddingHorizontal: 8,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trustCheck: {
    fontSize: 13,
    color: "#00D4AA",
    fontWeight: "700",
  },
  trustText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  form: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  passwordInputWrapper: {
    position: "relative",
  },
  passwordInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 52,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
    opacity: 0.7,
  },
  primaryButton: {
    height: 54,
    backgroundColor: "#00D4AA",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 14,
    color: colors.textSecondary,
    fontSize: 13,
    opacity: 0.6,
  },
  socialButton: {
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
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
    fontWeight: "600",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  bottomLinks: {
    marginTop: 24,
    alignItems: "center",
    gap: 14,
  },
  guestLink: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  createAccountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  createAccountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  createAccountLink: {
    fontSize: 14,
    color: "#00D4AA",
    fontWeight: "600",
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 8,
  },
  switchModeText: {
    color: "#00D4AA",
    fontSize: 14,
    fontWeight: "500",
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
    backgroundColor: "#00D4AA",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 120,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
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
    marginBottom: 8,
  },
  forgotPasswordButton: {
    padding: 4,
  },
  forgotPasswordLink: {
    color: "#00D4AA",
    fontSize: 13,
    fontWeight: "600",
  },
  forgotInputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  forgotInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
});
