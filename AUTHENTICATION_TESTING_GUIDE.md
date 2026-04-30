
# 🔐 Authentication Testing Guide

## Overview
The backend has been enhanced with password requirements and welcome email functionality. This guide will help you test all authentication flows.

## ✅ What Was Integrated

### 1. Password Requirements (Frontend + Backend)
- **Minimum 8 characters**
- **At least 1 uppercase letter**
- **At least 1 lowercase letter**
- **At least 1 number**
- Real-time validation with clear error messages

### 2. Welcome Email on Signup
- **Email/Password Signup**: Uses custom endpoint `/api/auth/signup/email-with-welcome`
- **OAuth Signup**: Backend automatically sends welcome emails for new Google/Apple users
- **Email Content**:
  - Personalized greeting with user's name
  - Welcome message: "Welcome to APS Fitness! We're excited to help you achieve your fitness goals."
  - Brief overview and call-to-action
  - Professional HTML formatting with teal branding (#459b9b)

### 3. Rest Day Message
- Already implemented in the Training screen
- Shows when no workout is scheduled for the day
- Displays recovery tips and link to view full training plan

## 🧪 Testing Instructions

### Test 1: Email/Password Signup with Password Validation

1. **Open the app** - You should see the auth screen first (as requested)
2. **Tap "Sign Up"** to switch to signup mode
3. **Test Invalid Passwords**:
   - Try `short` → Should show: "Password must be at least 8 characters long"
   - Try `alllowercase123` → Should show: "Password must contain at least one uppercase letter"
   - Try `ALLUPPERCASE123` → Should show: "Password must contain at least one lowercase letter"
   - Try `NoNumbers` → Should show: "Password must contain at least one number"

4. **Test Valid Signup**:
   ```
   Email: test@example.com
   Password: TestPass123
   Name: John Doe (optional)
   ```
   - Tap "Sign Up"
   - Should successfully create account
   - **Check your email** for the welcome message
   - Should redirect to onboarding screen

### Test 2: Google OAuth Signup

1. **Tap "Continue with Google"**
2. Complete Google authentication
3. **Check your email** (the one associated with your Google account)
4. Should receive welcome email if this is a new account
5. Should redirect to onboarding or home (if profile exists)

### Test 3: Apple OAuth Signup (iOS only)

1. **Tap "Continue with Apple"**
2. Complete Apple authentication
3. **Check your email** (the one associated with your Apple ID)
4. Should receive welcome email if this is a new account
5. Should redirect to onboarding or home (if profile exists)

### Test 4: Sign In Flow

1. **Use existing credentials**:
   ```
   Email: test@example.com
   Password: TestPass123
   ```
2. Tap "Sign In"
3. Should successfully authenticate
4. Should redirect to home (if profile exists) or onboarding

### Test 5: Rest Day Message

1. **Complete onboarding** to set up your fitness profile
2. **Navigate to Training tab**
3. If today is a rest day (no workout scheduled):
   - Should see "Today is a Rest Day" message
   - Should see recovery tips
   - Should see "View Full Training Plan" button
4. **Tap "View Full Training Plan"** → Should navigate to Plan screen

### Test 6: Guest Mode

1. **Tap "Continue as Guest"**
2. Should allow access without authentication
3. Should redirect to onboarding or home
4. Can create account later to sync progress

## 📧 Sample Welcome Email

When you sign up, you should receive an email like this:

```
Subject: Welcome to APS Fitness! 🎉

Hi [Your Name],

Welcome to APS Fitness! We're excited to help you achieve your fitness goals.

Get started by completing your fitness profile and exploring your personalized workout plans.

[Start Your Journey] (Button)

Best regards,
The APS Fitness Team
```

## 🔍 Debugging

### Check Console Logs

Look for these log messages:

**Signup:**
```
[AuthContext] Starting email signup for: test@example.com
[AuthContext] Signup successful with welcome email
[AuthContext] User fetched after signup
```

**OAuth:**
```
[AuthContext] Starting Google sign in
[AuthContext] Google sign in complete - welcome email sent by backend for new users
```

**Rest Day:**
```
[Training] Today's workout: null
[Training] Showing rest day message
```

### Common Issues

1. **"Password must contain..." error**
   - ✅ This is expected! The validation is working
   - Use a password like `TestPass123`

2. **No welcome email received**
   - Check spam/junk folder
   - Verify email service is configured in backend
   - Check backend logs for email sending status

3. **Not seeing auth screen first**
   - Clear app data/cache
   - The app now shows auth screen first for new users (as requested)

## 🎯 Success Criteria

✅ Password validation works and shows clear error messages
✅ Valid passwords are accepted (8+ chars, uppercase, lowercase, number)
✅ Welcome email is sent on email/password signup
✅ Welcome email is sent on OAuth signup (Google/Apple)
✅ Rest day message appears when no workout is scheduled
✅ Auth screen is shown first for new users
✅ Session persists after app reload

## 📝 Sample Test Accounts

Create these accounts to test:

1. **Email/Password User**:
   - Email: `testuser1@example.com`
   - Password: `FitnessTest123`

2. **Email/Password User 2**:
   - Email: `testuser2@example.com`
   - Password: `WorkoutPass456`

3. **OAuth Users**: Use your real Google/Apple accounts

## 🚀 Next Steps

After testing:
1. Verify all authentication flows work correctly
2. Check that welcome emails are received
3. Confirm password validation prevents weak passwords
4. Test rest day message appears correctly
5. Verify session persistence across app restarts

---

**Need Help?** Check the console logs for detailed debugging information.
