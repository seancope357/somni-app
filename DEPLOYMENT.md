# SOMNI - Supabase & Vercel Deployment Guide

This guide will help you set up SOMNI with Supabase authentication and deploy to Vercel.

## 🚀 Quick Start

### 1. Set Up Supabase

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Sign up with GitHub or Google

2. **Create a New Project**
   - Click "New Project"
   - Choose organization
   - Set project name: `somni-app`
   - Set database password (save it securely)
   - Choose region closest to your users
   - Click "Create new project"

3. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy your **Project URL** and **anon public key**
   - Also copy the **service_role** key (keep this secret!)

4. **Set Up Database Schema**
   - Go to SQL Editor in your Supabase project
   - Copy and paste the contents of `supabase-schema.sql`
   - Click "Run" to execute the schema

### 2. Configure Environment Variables

1. **Create `.env.local` file**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Add your Supabase credentials**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### 3. Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Add Environment Variables in Vercel**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add the same variables from your `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 Configuration Details

### Supabase Schema Features
- **User Authentication**: Email/password signup and login
- **Profiles Table**: User profile information
- **Dreams Table**: Dream storage with user relationships
- **Row Level Security**: Users can only access their own data
- **Automatic Timestamps**: Created and updated timestamps

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public key for client-side access
- `SUPABASE_SERVICE_ROLE_KEY`: Secret key for server-side operations

### Database Tables
- `profiles`: User profile information
- `dreams`: Dream entries with sleep tracking and AI analysis

## 🛠️ Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

## 🌐 Features Included

### Authentication
- ✅ User signup and login
- ✅ Secure session management
- ✅ Protected routes
- ✅ User context

### Dream Management
- ✅ AI-powered dream interpretation
- ✅ Sleep tracking integration
- ✅ Dream history with search
- ✅ Pattern recognition and analysis
- ✅ Sleep statistics and charts

### UI/UX
- ✅ Responsive design
- ✅ Dark gradient theme
- ✅ Professional branding
- ✅ Voice input support
- ✅ Loading states and error handling

## 🔒 Security Features

- Row Level Security (RLS) in Supabase
- Users can only access their own dreams
- Secure API endpoints with user validation
- Environment variable protection

## 📱 Mobile Ready

The app is fully responsive and works great on:
- iOS Safari (iPhone/iPad)
- Android Chrome
- Desktop browsers
- Tablet devices

## 🚀 Production Deployment

Once deployed to Vercel:
1. Your app will be available at `your-app-name.vercel.app`
2. Users can sign up and start using SOMNI immediately
3. All data is securely stored in your Supabase database
4. Real-time updates and authentication work out of the box

## 🎯 Next Steps

After deployment, consider:
- Adding custom domain in Vercel
- Setting up email authentication providers
- Adding dream export functionality
- Implementing dream sharing features
- Adding more detailed analytics

## 🐛 Troubleshooting

### Common Issues:
1. **"User authentication required" error**
   - Check that environment variables are set correctly
   - Ensure user is logged in

2. **Database connection errors**
   - Verify Supabase project URL and keys
   - Check that database schema was created

3. **Deployment issues**
   - Ensure all environment variables are added to Vercel
   - Check Vercel deployment logs

### Support:
- Check the browser console for errors
- Review Vercel function logs
- Verify Supabase dashboard for any issues

Your SOMNI app is now ready for production! 🎉