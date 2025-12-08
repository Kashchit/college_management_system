# Environment Variables Setup Guide

This guide explains how to set up environment variables for both **backend** and **frontend**.

---

## 📁 Backend Environment Variables

### Local Development

**File**: `/backend/.env`

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (for OTP and notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Server Configuration
PORT=5001
NODE_ENV=development
```

### Production (Render)

**Set these in Render Dashboard** → Your Backend Service → Environment

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string from Neon | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secret key for JWT tokens (use strong random string) | `a8f5f167f44f4964e6c998dee827110c` |
| `EMAIL_USER` | Email address for sending OTPs | `yourapp@gmail.com` |
| `EMAIL_PASS` | Gmail App Password (NOT regular password) | `abcd efgh ijkl mnop` |
| `PORT` | Server port (Render auto-assigns, but set to 5001) | `5001` |
| `NODE_ENV` | Environment mode | `production` |

### 📧 How to Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to your Google Account
3. Select app: **Mail**
4. Select device: **Other (Custom name)** → Type: "Render Backend"
5. Click **Generate**
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
7. Use this as `EMAIL_PASS` (remove spaces)

---

## 🌐 Frontend Environment Variables

### Local Development

**File**: `/frontend/.env`

```env
VITE_API_URL=http://localhost:5001/api
```

This tells your frontend to connect to your local backend.

### Production

**File**: `/frontend/.env.production`

```env
VITE_API_URL=https://myclass-backend.onrender.com/api
```

**Important**: Replace `myclass-backend.onrender.com` with your actual backend URL from Render!

---

## 🔧 Setup Instructions

### Step 1: Backend Local Setup

1. Copy the example file:
   ```bash
   cd /Users/kashchitbikramthapa/Desktop/ums/backend
   cp .env.example .env
   ```

2. Edit `.env` and fill in your actual values:
   - Get `DATABASE_URL` from your Neon dashboard
   - Generate a strong `JWT_SECRET` (or use: `openssl rand -hex 32`)
   - Add your Gmail credentials

3. **Never commit `.env` to Git!** (already in `.gitignore`)

### Step 2: Frontend Local Setup

1. Create `.env` file:
   ```bash
   cd /Users/kashchitbikramthapa/Desktop/ums/frontend
   cp .env.example .env
   ```

2. The default value should work for local development

### Step 3: Production Setup

#### Backend on Render:
1. Go to Render Dashboard → Your Backend Service
2. Click **Environment** tab
3. Add each variable manually (see table above)
4. Click **Save Changes**
5. Service will auto-redeploy

#### Frontend Production:
1. Edit `/frontend/.env.production`
2. Replace backend URL with your actual Render backend URL
3. Commit and push:
   ```bash
   git add frontend/.env.production
   git commit -m "Add production API URL"
   git push origin main
   ```
4. Render will auto-redeploy your frontend

---

## ✅ Verification

### Test Backend Environment:

```bash
cd backend
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'); console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'); console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');"
```

### Test Frontend Environment:

```bash
cd frontend
npm run dev
# Check browser console - should see API calls to correct URL
```

---

## 🚨 Common Issues

### Issue: "Cannot find module 'dotenv'"
**Solution**: Run `npm install` in backend directory

### Issue: "Database connection failed"
**Solution**: 
- Check `DATABASE_URL` is correct
- Verify Neon database is active (not paused)
- Test connection string in Neon SQL editor

### Issue: "Failed to send OTP"
**Solution**:
- Use Gmail App Password, not regular password
- Enable 2FA on Gmail first
- Check `EMAIL_USER` and `EMAIL_PASS` are correct

### Issue: Frontend can't connect to backend
**Solution**:
- Check `VITE_API_URL` in `.env` or `.env.production`
- Verify backend is running
- Check browser console for CORS errors

---

## 📋 Environment Files Checklist

- [ ] `/backend/.env` created (local development)
- [ ] `/backend/.env` added to `.gitignore` ✅
- [ ] Backend environment variables set on Render
- [ ] `/frontend/.env` created (optional, for local dev)
- [ ] `/frontend/.env.production` created with backend URL
- [ ] `.env.production` committed to Git (safe to commit)
- [ ] All values verified and tested

---

## 🔐 Security Notes

1. **Never commit `/backend/.env`** - Contains sensitive credentials
2. **Safe to commit `/frontend/.env.production`** - Only contains public backend URL
3. **Use strong JWT_SECRET** - Generate with: `openssl rand -hex 32`
4. **Use App Passwords** - Never use your actual Gmail password
5. **Rotate secrets regularly** - Change JWT_SECRET and passwords periodically

---

**Last Updated**: December 8, 2025
