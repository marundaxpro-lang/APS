
# 🚀 Quick Start Guide - Testing Your Backend Integration

## Overview
Your backend has been successfully integrated! This guide will help you test everything quickly.

## ✅ What's Been Integrated

1. **Password Requirements** - Enforced on signup (8+ chars, uppercase, lowercase, number)
2. **Welcome Emails** - Sent automatically on email/password AND OAuth signup
3. **Rest Day Message** - Shows when no workout is scheduled
4. **Auth Screen First** - New users see login/signup screen immediately
5. **Session Persistence** - Users stay logged in across app restarts

## 🧪 Quick Test (5 Minutes)

### Test 1: Invalid Password (Should Fail)
1. Open the app
2. Tap "Sign Up"
3. Enter:
   - Email: `test@example.com`
   - Password: `weak` (too short)
4. Tap "Sign Up"
5. ✅ **Expected**: Error message "Password must be at least 8 characters long"

### Test 2: Valid Signup (Should Succeed)
1. Enter:
   - Email: `test@example.com`
   - Password: `TestPass123` (meets all requirements)
   - Name: `Test User`
2. Tap "Sign Up"
3. ✅ **Expected**: 
   - Account created successfully
   - Welcome email sent to test@example.com
   - Redirected to onboarding screen

### Test 3: Complete Onboarding
1. Follow the onboarding steps:
   - Enter your name
   - Enter your motivation
   - Select your goal (e.g., "Build Muscle")
   - Select training days (e.g., Mon, Wed, Fri)
   - Select focus areas (e.g., "Chest", "Back", "Arms")
   - Select equipment (e.g., "Full Gym")
   - Enter stats (gender, weight, height, age)
2. Tap "Start My Journey"
3. ✅ **Expected**: Redirected to home screen

### Test 4: Rest Day Message
1. Navigate to "Training" tab
2. If today is a rest day (no workout scheduled):
   - ✅ **Expected**: See "Today is a Rest Day" message with recovery tips
3. If today has a workout:
   - ✅ **Expected**: See today's workout with exercises

### Test 5: Session Persistence
1. Close the app completely
2. Reopen the app
3. ✅ **Expected**: Still logged in, see home screen (not auth screen)

### Test 6: Google OAuth (Optional)
1. Sign out (if signed in)
2. Tap "Continue with Google"
3. Complete Google authentication
4. ✅ **Expected**: 
   - Account created/signed in
   - Welcome email sent (if new account)
   - Redirected to onboarding or home

## 📧 Check Your Email

After signing up, check your email inbox for:

**Subject**: Welcome to APS Fitness! 🎉

**Content**:
- Personalized greeting with your name
- Welcome message
- Call-to-action button
- Professional HTML formatting with teal branding

**Note**: If you don't see the email:
- Check spam/junk folder
- Verify email service is configured in backend
- Check backend logs for email sending status

## 🐛 Troubleshooting

### "Password must contain..." error
✅ **This is expected!** The validation is working correctly.
Use a password like `TestPass123` that meets all requirements.

### No welcome email received
1. Check spam/junk folder
2. Verify backend email service is configured
3. Check backend logs: `[Email] Sending welcome email to...`

### Not seeing auth screen first
1. Clear app data/cache
2. Uninstall and reinstall the app
3. The app now shows auth screen first for new users

### "Authentication token not found" error
1. Sign out and sign in again
2. Clear app data
3. Check that token is being stored correctly

## 📱 Platform-Specific Notes

### Web
- OAuth uses popup flow
- Token stored in localStorage
- Check browser console for logs

### iOS
- OAuth uses native flow
- Token stored in SecureStore (encrypted)
- Apple Sign In available
- Check Xcode console for logs

### Android
- OAuth uses native flow
- Token stored in SecureStore (encrypted)
- Check Android Studio logcat for logs

## 🎯 Success Criteria

After testing, you should have:

- ✅ Created an account with a strong password
- ✅ Received a welcome email
- ✅ Completed onboarding
- ✅ Seen the home screen
- ✅ Verified session persists after app restart
- ✅ Seen rest day message (if applicable)

## 📝 Sample Test Accounts

Use these credentials for testing:

```
Account 1:
Email: testuser1@example.com
Password: FitnessTest123

Account 2:
Email: testuser2@example.com
Password: WorkoutPass456

Account 3:
Email: demo@apsfitness.com
Password: DemoPass789
```

## 🔍 Debugging

### Enable Detailed Logging

All API calls and user actions are logged to the console with prefixes:

```
[AuthContext] Starting email signup for: test@example.com
[API] Calling: https://...app.specular.dev/api/auth/signup/email-with-welcome POST
[API] Success: { token: "...", user: {...} }
[AuthContext] Signup successful with welcome email
[AuthContext] User fetched after signup
```

### Check Console Logs

**Web**: Open browser DevTools → Console tab
**iOS**: Open Xcode → View → Debug Area → Show Debug Area
**Android**: Open Android Studio → Logcat

### Common Log Messages

**Successful Signup**:
```
[AuthContext] Starting email signup for: test@example.com
[API] Calling: .../api/auth/signup/email-with-welcome POST
[API] Success: {...}
[AuthContext] Signup successful with welcome email
```

**Password Validation Error**:
```
[AuthScreen] User tapped email auth button
[AuthScreen] Password validation failed: Password must contain at least one uppercase letter
```

**Session Check**:
```
[IndexScreen] Checking initial route
[IndexScreen] User: authenticated
[IndexScreen] Has profile: yes
[IndexScreen] Redirecting to home
```

## 🎉 Next Steps

After successful testing:

1. **Create Real Accounts**: Use real email addresses to test welcome emails
2. **Test All OAuth Providers**: Google, Apple (iOS only)
3. **Test on All Platforms**: Web, iOS, Android
4. **Verify Email Delivery**: Check that welcome emails arrive
5. **Test Edge Cases**: Weak passwords, invalid emails, network errors

## 📚 Additional Documentation

- `AUTHENTICATION_TESTING_GUIDE.md` - Comprehensive testing instructions
- `BACKEND_INTEGRATION_SUMMARY.md` - Technical integration details
- `INTEGRATION_VERIFICATION.md` - Verification checklist

## 🆘 Need Help?

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Review the troubleshooting section above
3. Verify backend is running and accessible
4. Check that email service is configured in backend

---

**Ready to test?** Start with Test 1 above and work your way through! 🚀
