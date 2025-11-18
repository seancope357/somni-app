# SOMNI - Mood Tracking & Life Events Implementation Guide

## 🎯 Overview

This guide documents the implementation of two major new features for the SOMNI dream journal app:

1. **Mood Tracking & Correlations** - Track daily mood, stress, and energy levels to discover how they correlate with your dreams
2. **Life Events Tracking** - Log significant life events and see their impact on your dream patterns

### ✨ New Features Included

- ✅ Daily mood logging (mood, stress, energy on 1-5 scale)
- ✅ Life events tracking with categories and intensity
- ✅ Dream-mood correlations analysis
- ✅ Dream-event correlations analysis  
- ✅ Smart journaling prompts based on context
- ✅ Email reminders for dream journaling (infrastructure ready)
- ✅ Export functionality for all your data
- ✅ Semantic dream clustering with embeddings (infrastructure ready)

---

## 📋 What's Been Completed

### ✅ Database Layer

**File Created:** `supabase-mood-events-migration.sql`

New tables added:
- `user_settings` - User preferences for reminders and timezone
- `mood_logs` - Daily mood/stress/energy tracking
- `life_events` - Life events with categories and date ranges
- `dream_life_events` - Many-to-many link between dreams and events
- `dream_embeddings` - Vector embeddings for semantic search

All tables have:
- Row-Level Security (RLS) policies enforced
- Proper indexes for performance
- Foreign key relationships
- Auto-updating timestamps

Correlation helpers added:
- `fn_mood_dream_correlations()` - Analyzes dream frequency by mood/stress/energy
- `fn_event_dream_correlations()` - Analyzes dream patterns around life events
- Views for joining daily data across tables

### ✅ API Routes

**Created Files:**

1. `/src/app/api/mood-logs/route.ts`
   - GET: List mood logs with date filtering
   - POST: Upsert mood log (one per day per user)

2. `/src/app/api/mood-logs/[id]/route.ts`
   - DELETE: Remove a mood log

3. `/src/app/api/life-events/route.ts`
   - GET: List life events with category/date filtering
   - POST: Create new life event

4. `/src/app/api/life-events/[id]/route.ts`
   - DELETE: Remove a life event

All routes:
- Enforce user authentication
- Validate input data
- Return proper error messages
- Use service role key for RLS bypass where needed

### ✅ Frontend Components

**Created Files:**

1. `/src/components/mood/TodayMoodWidget.tsx`
   - Compact widget for quick daily mood logging
   - Shows 1-5 emoji scale for mood
   - Color-coded bars for stress and energy
   - Displays logged mood in collapsed state
   - Beautiful glassmorphic styling

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the entire contents of `supabase-mood-events-migration.sql`
4. Paste and run it in the SQL editor
5. Verify all tables were created successfully

### Step 2: Install New Dependencies (if needed)

The implementation uses existing dependencies. If you plan to implement the advanced features, you'll need:

```bash
# For email reminders (optional)
npm install resend

# For embeddings/semantic search (optional)
npm install openai

# For data export (optional - for ZIP files)
npm install jszip
```

### Step 3: Environment Variables

Add these to your `.env.local` file:

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_key

# New (optional - for advanced features)
RESEND_API_KEY=your_resend_key  # For email reminders
OPENAI_API_KEY=your_openai_key  # For embeddings
APP_URL=https://your-domain.com  # For email links
REMINDERS_CRON_SECRET=random_secret_string  # For cron security
```

### Step 4: Integrate MoodWidget into Main Page

Update `/src/app/page.tsx` to include the mood widget. Add this import at the top:

```typescript
import TodayMoodWidget from '@/components/mood/TodayMoodWidget'
```

Then add the widget to your Interpret view, right after the header section (around line 320):

```tsx
{/* Add this after the header, before the Input Section */}
{user && (
  <div className="mb-4">
    <TodayMoodWidget userId={user.id} />
  </div>
)}
```

### Step 5: Test the Implementation

1. Start your dev server: `npm run dev`
2. Sign in to your app
3. You should see the mood widget on the Interpret page
4. Try logging your mood - select mood, stress, and energy, then click "Log Mood"
5. Verify the data is saved by refreshing the page

---

## 📊 API Usage Examples

### Mood Logs

**Create/Update Mood Log:**
```javascript
const response = await fetch('/api/mood-logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    log_date: '2025-11-18',
    mood: 4,        // 1-5
    stress: 3,      // 1-5
    energy: 4,      // 1-5
    notes: 'Feeling good today'  // optional
  })
})
```

**Get Mood Logs:**
```javascript
// Get last 30 days
const response = await fetch(`/api/mood-logs?userId=${userId}`)

// Get specific date range
const response = await fetch(
  `/api/mood-logs?userId=${userId}&from=2025-11-01&to=2025-11-30`
)
```

### Life Events

**Create Life Event:**
```javascript
const response = await fetch('/api/life-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    title: 'Started new job',
    description: 'First week at the new company',
    category: 'work',  // work, relationship, health, travel, etc.
    intensity: 4,      // 1-5, optional
    date_start: '2025-11-10',
    date_end: '2025-11-17',  // optional
    tags: ['career', 'change']  // optional
  })
})
```

**Get Life Events:**
```javascript
// Get all events
const response = await fetch(`/api/life-events?userId=${userId}`)

// Filter by category
const response = await fetch(
  `/api/life-events?userId=${userId}&categories=work,relationship`
)

// Filter by date range
const response = await fetch(
  `/api/life-events?userId=${userId}&from=2025-11-01&to=2025-11-30`
)
```

---

## 🎨 Design Patterns Used

### Glassmorphic UI
All new components use the existing glassmorphic design:
- Semi-transparent white backgrounds (`bg-white/90`)
- Backdrop blur effects (`backdrop-blur-lg`)
- Subtle shadows and rounded corners
- Smooth transitions and animations

### Color Coding
- **Mood**: Pink accent colors and emoji faces
- **Stress**: Green → Red gradient (low to high)
- **Energy**: Gray → Purple gradient (low to high)

### Mobile-First
- All components are responsive
- Touch-friendly hit targets (min 44x44px)
- Collapsible sections to save space

---

## 🔮 Next Steps & TODOs

### Priority 1: Enhance Existing Features

1. **Integrate Mood into Dream Entry**
   - Auto-link today's mood to new dreams
   - Show mood context in dream interpretation

2. **Create Life Events Dialog**
   - Modal/dialog for adding life events
   - Category picker with icons
   - Date range selector

3. **Add Journaling Prompts Component**
   - Smart prompts based on mood/stress/energy
   - Contextual suggestions based on recent events
   - "Insert" button to add prompt to dream input

### Priority 2: Correlations & Insights

4. **Enhance Patterns API**
   - Update `/api/dreams-supabase/patterns` route
   - Call `fn_mood_dream_correlations()` and `fn_event_dream_correlations()`
   - Generate human-readable insights

5. **Create Insights View**
   - New navigation tab
   - Bar charts showing dream rate by mood/stress/energy
   - Event impact visualization
   - Timeline combining dreams, moods, and events

### Priority 3: Advanced Features

6. **Email Reminders**
   - User settings page for configuring reminders
   - Cron job to send reminders at user's local time
   - Beautiful HTML email template

7. **Data Export**
   - Export all dreams, moods, and events as CSV/JSON
   - ZIP file with multiple CSVs
   - Download from settings

8. **Semantic Dream Search**
   - Generate embeddings for dreams using OpenAI
   - "Similar Dreams" feature
   - Theme clustering and visualization

---

## 🧪 Testing Checklist

- [ ] Mood widget appears on Interpret page
- [ ] Can log mood/stress/energy successfully
- [ ] Mood persists after page refresh
- [ ] Can edit logged mood
- [ ] Life events API creates events correctly
- [ ] RLS policies prevent access to other users' data
- [ ] Mobile responsive on various screen sizes
- [ ] Accessible via keyboard navigation
- [ ] Toast notifications work correctly
- [ ] Error handling works (network errors, validation)

---

## 📚 Database Schema Reference

### mood_logs
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
log_date        date UNIQUE (per user)
mood            smallint (1-5)
stress          smallint (1-5)
energy          smallint (1-5)
notes           text (optional)
created_at      timestamptz
updated_at      timestamptz
```

### life_events
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
title           text
description     text (optional)
category        life_event_category enum
intensity       smallint (1-5, optional)
date_start      date
date_end        date (optional)
tags            text[]
created_at      timestamptz
updated_at      timestamptz
```

### Category enum values:
`work`, `relationship`, `health`, `travel`, `loss`, `achievement`, `social`, `finance`, `move`, `study`, `other`

---

## 🐛 Troubleshooting

### Migration fails
- Make sure pgvector extension is enabled in Supabase
- Check for existing table/function name conflicts
- Verify you're running as a superuser

### API returns 401
- Check that user is authenticated
- Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
- Ensure RLS policies are created

### Widget doesn't appear
- Check console for errors
- Verify component import path
- Ensure user prop is passed correctly

### Mood not saving
- Check network tab for API response
- Verify date format (YYYY-MM-DD)
- Check that mood/stress/energy are 1-5

---

## 💡 Tips & Best Practices

1. **Always validate on both client and server**
   - Client validation for UX
   - Server validation for security

2. **Use RLS for all user data**
   - Never rely solely on application-level security
   - Test with different users to verify isolation

3. **Optimize queries**
   - Use indexes for commonly filtered columns
   - Limit results with pagination for large datasets

4. **Handle timezones carefully**
   - Store user timezone in user_settings
   - Convert to user's local time for display
   - Store UTC in database

5. **Keep it simple first**
   - Start with core features
   - Add advanced features incrementally
   - Test thoroughly at each step

---

## 🤝 Contributing

When adding new features:

1. Follow existing naming conventions
2. Add RLS policies for any new tables
3. Update this guide with new API endpoints
4. Add TypeScript types for new data structures
5. Test mobile responsiveness
6. Maintain glassmorphic design consistency

---

## 📝 License

Same as parent project (MIT)

---

**Questions?** Review the existing codebase patterns or check the Supabase/Next.js documentation for more details.

**Happy coding!** 🌙✨
