
# 🧪 Testing Guide - Authentication & Profile Integration

## Quick Test Scenarios

### Scenario 1: New User Email Signup
**Goal:** Test email signup and welcome email

1. Open the app
2. You should see the auth screen
3. Tap "Sign Up" (if on Sign In screen)
4. Enter:
   - Name: `John Doe`
   - Email: `john.doe@example.com`
   - Password: `SecurePass123!`
5. Tap "Sign Up"
6. **Expected:**
   - ✅ Account created
   - ✅ Welcome email sent to john.doe@example.com
   - ✅ Redirected to onboarding
7. Complete onboarding (7 steps)
8. **Expected:**
   - ✅ Profile saved to backend
   - ✅ Caloric goal calculated
   - ✅ Redirected to home screen

---

### Scenario 2: Existing User Sign In
**Goal:** Test sign in and profile loading

1. Open the app
2. Tap "Sign In"
3. Enter:
   - Email: `john.doe@example.com`
   - Password: `SecurePass123!`
4. Tap "Sign In"
5. **Expected:**
   - ✅ Authenticated successfully
   - ✅ Redirected to home screen (if onboarding complete)
   - ✅ Profile data loaded from backend

---

### Scenario 3: Google OAuth (Web Only)
**Goal:** Test Google sign in and welcome email

1. Open the app in a **web browser**
2. Tap "Continue with Google"
3. **Expected:**
   - ✅ Popup window opens
   - ✅ Google sign in page loads
4. Sign in with Google account
5. **Expected:**
   - ✅ Popup closes automatically
   - ✅ Welcome email sent (if new user)
   - ✅ Redirected to onboarding (new user) or home (existing user)

**Note:** If popup is blocked, allow popups for the site and try again.

---

### Scenario 4: Profile Display
**Goal:** Verify profile data shows correctly (not "Not set")

1. Sign in with an account that completed onboarding
2. Go to **Profile** tab
3. **Expected:**
   - ✅ Name shows correctly
   - ✅ Email shows correctly (if not guest)
   - ✅ Gender shows "Male" or "Female" (not "Not set")
   - ✅ Age shows number (not "Not set")
   - ✅ Weight shows "XX kg" (not "Not set")
   - ✅ Height shows "XX cm" (not "Not set")
   - ✅ Experience Level shows "Beginner", "Intermediate", or "Advanced" (not "Not set")
   - ✅ Goal shows "Get Stronger", "Build Muscle", etc. (not "Not set")
   - ✅ Training Days shows "X days/week" (not "Not set")

**If any field shows "Not set":**
- Check console logs for `[ProfileScreen]` messages
- Verify backend returned data
- Check field mapping in profile.tsx

---

### Scenario 5: Edit Profile
**Goal:** Test profile editing and backend sync

1. Go to **Profile** tab
2. Tap "Edit Profile"
3. Change:
   - Weight: `75` kg
   - Height: `180` cm
   - Training Days: `5` days
4. Tap "Save Changes"
5. **Expected:**
   - ✅ Success modal appears
   - ✅ Profile updated in backend
   - ✅ Caloric goal recalculated
   - ✅ Workout plan regenerated
6. Go back to Profile tab
7. **Expected:**
   - ✅ New values displayed
   - ✅ Weight shows "75 kg"
   - ✅ Height shows "180 cm"
   - ✅ Training Days shows "5 days/week"

---

### Scenario 6: Sign Out
**Goal:** Test sign out and token cleanup

1. Go to **Profile** tab
2. Tap "Sign Out"
3. Confirm sign out
4. **Expected:**
   - ✅ Redirected to auth screen
   - ✅ Tokens cleared from storage
   - ✅ Cannot access protected routes
5. Try to go to Profile tab
6. **Expected:**
   - ✅ Redirected to auth screen

---

### Scenario 7: Guest Mode
**Goal:** Test guest mode (no account)

1. Open the app
2. Tap "Continue as Guest"
3. **Expected:**
   - ✅ Redirected to onboarding
4. Complete onboarding
5. **Expected:**
   - ✅ Profile saved locally only
   - ✅ Redirected to home screen
6. Go to Profile tab
7. **Expected:**
   - ✅ Banner shows "You're using Guest Mode"
   - ✅ "Create Account" button visible
   - ✅ Email field hidden
8. Tap "Create Account"
9. **Expected:**
   - ✅ Redirected to auth screen

---

## 🔍 Debugging Tips

### Check Console Logs
Look for these prefixes:
- `[API]` - API calls and responses
- `[AuthContext]` - Authentication flow
- `[OAuth]` - OAuth popup flow
- `[ProfileScreen]` - Profile loading and display
- `[Onboarding]` - Onboarding flow
- `[EditProfile]` - Profile editing

### Common Issues

**"Authentication token not found"**
- Sign in again
- Check if token is in storage (localStorage on web, SecureStore on native)

**"Fitness profile not found"**
- Complete onboarding
- Check if profile was saved to backend

**Profile shows "Not set"**
- Check console logs for field mapping
- Verify backend returned data
- Check if backend uses snake_case (experience_level vs experienceLevel)

**Google OAuth not working**
- Check if popups are blocked
- Check console logs for `[OAuth]` messages
- Verify backend OAuth is configured

**Welcome email not received**
- Check spam folder
- Check backend logs for email sending
- Verify email service is configured

---

## 📊 Expected API Calls

### On Signup:
1. `POST /api/auth/sign-up/email` - Create account
2. Backend sends welcome email
3. `GET /api/auth/get-session` - Get session

### On Sign In:
1. `POST /api/auth/sign-in/email` - Authenticate
2. `GET /api/auth/get-session` - Get session

### On Onboarding Complete:
1. `POST /api/fitness-profile` - Save profile
2. `POST /api/dashboard/calculate-caloric-goal` - Calculate calories

### On Profile View:
1. `GET /api/fitness-profile` - Get profile

### On Profile Edit:
1. `POST /api/fitness-profile` - Update profile
2. `POST /api/dashboard/calculate-caloric-goal` - Recalculate calories (if weight/height/age changed)

### On Sign Out:
1. `POST /api/auth/sign-out` - Sign out

---

## ✅ Success Criteria

All tests pass if:
- ✅ Email signup creates account and sends welcome email
- ✅ Email sign in authenticates successfully
- ✅ Google OAuth works on web (popup flow)
- ✅ Profile displays all data correctly (no "Not set")
- ✅ Profile edit updates backend and recalculates goals
- ✅ Sign out clears tokens and redirects to auth
- ✅ Guest mode works without account

---

## 🎯 Sample Test User

For testing, you can use:
- **Email:** `test@apexfitness.com`
- **Password:** `TestUser123!`
- **Name:** `Test User`

Or create your own test account with any email/password.

---

## 📞 Need Help?

If tests fail:
1. Check console logs
2. Verify backend URL in app.json
3. Ensure backend is running
4. Check network connectivity
5. Review error messages in console

All endpoints are working and tested. Happy testing! 🚀
