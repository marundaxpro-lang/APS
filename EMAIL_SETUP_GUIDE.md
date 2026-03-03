
# Email Setup Guide for APS Fitness App

## Overview
Your app already has email functionality built-in! The backend is configured to send welcome emails when users sign up. You just need to configure the email service provider.

## What's Already Implemented

### Backend Email Functionality
- **Welcome Emails**: Automatically sent when users sign up (both email/password and Google OAuth)
- **Endpoint**: `POST /api/auth/signup/email-with-welcome`
- **Email Service**: Resend (resend.com)
- **From Address**: `noreply@apsfitness.com`

### Email Content
- Personalized greeting with user's name
- Welcome message: "Welcome to APS Fitness! We're excited to help you achieve your fitness goals."
- Professional HTML formatting with teal branding (#459b9b)
- Call-to-action button

## Setup Steps (Required)

### Step 1: Create Resend Account
1. Go to https://resend.com
2. Sign up for a free account (3,000 emails/month free)
3. Verify your email address

### Step 2: Add Your Domain
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `apsfitness.com`)
4. Resend will provide DNS records

### Step 3: Configure DNS Records
Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these DNS records provided by Resend:

**Example records (yours will be different):**
```
Type: TXT
Name: _resend
Value: resend-verify=abc123xyz...

Type: MX
Name: @
Value: mx1.resend.com
Priority: 10

Type: MX
Name: @
Value: mx2.resend.com
Priority: 20
```

### Step 4: Verify Domain
1. After adding DNS records, return to Resend dashboard
2. Click "Verify Domain"
3. Wait for verification (can take up to 48 hours, usually 5-10 minutes)

### Step 5: Get API Key
1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it "APS Fitness Production"
4. Copy the API key (starts with `re_`)

### Step 6: Add API Key to Backend
You need to set the `RESEND_API_KEY` environment variable in your backend deployment.

**If using Natively's backend hosting:**
The backend is automatically deployed. You need to add the environment variable through your deployment platform.

**Environment Variable:**
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

(Replace with your actual API key from Step 5)

## Testing Email Delivery

### Test Signup Flow
1. Open your app
2. Go to the auth screen
3. Sign up with a new email address
4. Check your inbox for the welcome email

### Check Email Logs
1. Go to Resend dashboard
2. Click "Logs" to see all sent emails
3. Verify your welcome email was sent successfully

## Email Types Currently Supported

### 1. Welcome Email (Already Implemented)
- **Trigger**: User signs up (email/password or Google OAuth)
- **Sent to**: User's email address
- **Content**: Welcome message with branding

## Adding More Email Types (Future)

To add more email types (password reset, workout reminders, etc.), you'll need to:

1. Request backend changes via the chat
2. Specify the email trigger, content, and recipient
3. The backend will handle sending through Resend

### Example Request:
"Add a password reset email that sends when users request to reset their password. Include a reset link that expires in 1 hour."

## Troubleshooting

### Emails Not Sending
1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly in backend environment
2. **Check Domain**: Ensure domain is verified in Resend dashboard
3. **Check Logs**: View Resend logs to see error messages
4. **Check Spam**: Welcome emails might be in spam folder

### Domain Verification Failed
1. Wait 24-48 hours for DNS propagation
2. Use DNS checker tool: https://dnschecker.org
3. Verify DNS records match exactly what Resend provided
4. Contact Resend support if issues persist

### API Key Issues
1. Ensure API key starts with `re_`
2. Verify no extra spaces in environment variable
3. Regenerate API key if needed
4. Restart backend after adding environment variable

## Cost & Limits

### Resend Free Tier
- **3,000 emails/month** - Free forever
- **100 emails/day** - Rate limit
- **Unlimited domains**
- **Email logs for 30 days**

### Resend Pro Tier ($20/month)
- **50,000 emails/month**
- **Higher rate limits**
- **Priority support**
- **Advanced analytics**

## Security Notes

1. **Never commit API keys** to version control
2. **Use environment variables** for all secrets
3. **Verify sender domain** to prevent spoofing
4. **Monitor email logs** for suspicious activity

## Summary

**What you need to do:**
1. ✅ Create Resend account (5 minutes)
2. ✅ Add and verify your domain (10 minutes + DNS propagation)
3. ✅ Get API key (1 minute)
4. ✅ Add `RESEND_API_KEY` to backend environment (2 minutes)
5. ✅ Test by signing up a new user (1 minute)

**Total setup time:** ~20 minutes (plus DNS propagation wait)

**That's it!** Your app will automatically send welcome emails to all new users.

## Need Help?

If you encounter issues:
1. Check Resend documentation: https://resend.com/docs
2. View email logs in Resend dashboard
3. Ask in chat: "My welcome emails aren't sending, here's the error: [error message]"

---

**Note:** The email functionality is already built into your app. You just need to configure Resend to enable it. No code changes required!
