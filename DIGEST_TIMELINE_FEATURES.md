# Weekly Digest & Dream Timeline Features

This document explains the two new major features added to DREAMONEIR: **Weekly AI Dream Digest** and **Dream Timeline Visualization**.

## Overview

Both features enhance user engagement and provide deeper insights into dream patterns, mood correlations, and life events.

## Feature 1: Weekly AI Dream Digest 📊

### What It Does

Generates an AI-powered weekly summary that analyzes the user's dreams, moods, and patterns from the past week, providing personalized insights and reflection prompts.

### Components

**Database**: `weekly_digests` table
- Stores AI-generated digests with pattern trends, mood insights, goal progress
- Unique constraint prevents duplicate digests per week
- RLS policies ensure users only see their own digests

**API Route**: `/api/weekly-digest`
- `POST`: Generate new digest for specified week
- `GET`: Fetch existing digests (last 10 by default)
- `PATCH`: Mark digest as viewed

**UI Component**: `src/components/digest/WeeklyDigestView.tsx`
- Beautiful multi-card layout showing weekly activity stats
- AI-generated summary with pattern trends
- Mood correlation insights
- Goal progress tracking (based on onboarding data)
- Reflection prompts for deeper self-understanding
- Navigation between past weeks
- "Generate This Week's Digest" button

### How It Works

1. **Data Collection**:
   - Fetches all dreams from the target week
   - Fetches all mood logs from the target week
   - Fetches all journal entries from the target week
   - Fetches user's onboarding data for personalization

2. **Pattern Analysis**:
   - Counts symbol, emotion, and theme frequencies
   - Calculates average mood and sleep hours
   - Identifies top patterns across all dreams

3. **AI Generation** (Groq/Llama 3.3):
   - Sends collected data to AI with personalized prompt
   - Includes user's preferred name and goals from onboarding
   - AI returns structured JSON with:
     - Weekly summary (2-3 paragraphs)
     - Pattern trends (specific insights about recurring symbols)
     - Mood insights (correlations between mood and dreams)
     - Goal progress (observations related to user's stated goals)
     - Reflection prompts (3-5 thought-provoking questions)

4. **Storage**:
   - Saves digest to `weekly_digests` table
   - Prevents duplicates via unique index on `user_id + week_start_date`

5. **Display**:
   - Shows most recent digest by default
   - Navigate between past weeks with prev/next buttons
   - Marks digests as "viewed" when opened
   - Can regenerate current week's digest anytime

### Usage

**Accessing**:
- Click "Digest" button in main navigation
- Automatically loads most recent digest if available

**Generating**:
- Click "Generate This Week's Digest" button
- Wait 5-10 seconds for AI to analyze and generate
- Digest is cached (won't regenerate if already exists)

**Benefits**:
- **Engagement**: Weekly touchpoint keeps users returning
- **Insights**: Patterns are summarized in plain language
- **Goals**: Tracks progress on personal development goals
- **Reflection**: Prompts encourage deeper self-exploration

---

## Feature 2: Dream Timeline Visualization 📅

### What It Does

Interactive calendar/heatmap that visualizes dream frequency, moods, and life events over time with color-coded intensity.

### Components

**API Route**: `/api/timeline`
- `GET`: Fetch timeline data for date range
- Supports view modes: day, week, month, year
- Returns aggregated daily data with stats

**UI Component**: `src/components/timeline/DreamTimeline.tsx`
- Interactive month calendar grid
- Color-coded intensity (more dreams = darker color)
- Mood overlay (background color reflects mood)
- Life event indicators (orange dot)
- Click day to see details
- Navigation: prev/next month, jump to today
- View mode toggles (week/month/year)

### How It Works

1. **Data Aggregation**:
   - Fetches all dreams in date range
   - Fetches all mood logs in date range
   - Fetches all life events in date range
   - Groups by date into timeline map

2. **Visualization**:
   - **No Activity**: Gray (bg-gray-100)
   - **1 Dream**: Light purple (bg-purple-200)
   - **2 Dreams**: Medium purple (bg-purple-400)
   - **3+ Dreams**: Dark purple (bg-purple-600)
   - **Mood Overlay**: Background gradient based on mood level
     - Low mood (1-2): Blue tint
     - Medium mood (3): Yellow tint
     - High mood (4-5): Green tint
     - High stress: Red tint
   - **Life Events**: Small orange dot in corner

3. **Interactivity**:
   - Click any day to open details panel
   - Details show:
     - All dreams from that day (content preview + symbols)
     - Mood log (emoji, mood/stress/energy levels, notes)
     - Life events (title, description, category)
   - Navigate months with prev/next buttons
   - Jump to current date with "Today" button

4. **Statistics Panel**:
   - Total dreams in period
   - Total mood logs
   - Total life events
   - Average mood
   - Dream frequency percentage (% of days with dreams)

### Usage

**Accessing**:
- Click "Timeline" button in main navigation
- Default view: Current month

**Navigation**:
- **Prev/Next**: Navigate between months
- **Today**: Jump back to current month
- **View Modes**: Switch between Week/Month/Year (Month fully implemented)

**Interaction**:
- Click any day to see details
- Purple intensity shows dream count
- Orange dot indicates life events
- Colored background reflects mood

**Benefits**:
- **Visual Patterns**: Immediately see dream frequency trends
- **Correlation**: Spot connections between dreams, moods, and events
- **Engagement**: Interactive exploration encourages discovery
- **Context**: Understand dreams in relation to life events

---

## Database Migration

**File**: `supabase-digest-timeline-migration.sql`

### What It Creates

**`weekly_digests` table**:
- Stores AI-generated weekly summaries
- Fields:
  - `week_start_date`, `week_end_date`: Date range
  - `summary`: AI-generated overview (text)
  - `pattern_trends`: Array of pattern objects (jsonb)
  - `mood_insights`: Mood correlation analysis (jsonb)
  - `goal_progress`: Progress observations (jsonb)
  - `reflection_prompts`: Questions for reflection (text[])
  - Statistics: `total_dreams`, `total_journal_entries`, `average_mood`, etc.
  - `top_symbols`, `top_emotions`, `top_themes`: Most common patterns (text[])
  - `viewed`: Boolean flag for tracking if user has seen it
  - Timestamps: `generated_at`, `viewed_at`, `created_at`

**Indexes**:
- `user_id` (fast lookups)
- `week_start_date` DESC (chronological queries)
- `viewed` (filter unread digests)
- Unique constraint on `(user_id, week_start_date)` prevents duplicates

**RLS Policies**:
- Users can only view/insert/update/delete their own digests

### How to Apply

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-digest-timeline-migration.sql`
3. Paste and run
4. Verify `weekly_digests` table created

---

## Integration with Existing Features

### Onboarding Data
Both features use onboarding data:
- **Digest**: Personalizes AI prompt with user's name, goals, and preferences
- **Timeline**: (Future) Could use sleep schedule to highlight unusual patterns

### Mood Tracking
- **Digest**: Analyzes mood correlations with dream content
- **Timeline**: Visual mood overlay on calendar

### Life Events
- **Digest**: (Future) Could reference recent life events in summary
- **Timeline**: Shows events as markers on calendar

### Dreams & Patterns
- **Digest**: Analyzes recurring symbols, emotions, themes
- **Timeline**: Visualizes dream frequency over time

---

## File Structure

### New Files Created

```
src/
├── app/
│   └── api/
│       ├── weekly-digest/
│       │   └── route.ts           # Digest generation/fetch API
│       └── timeline/
│           └── route.ts           # Timeline data aggregation API
└── components/
    ├── digest/
    │   └── WeeklyDigestView.tsx   # Digest UI component
    └── timeline/
        └── DreamTimeline.tsx      # Calendar visualization component

supabase-digest-timeline-migration.sql  # Database migration
DIGEST_TIMELINE_FEATURES.md            # This file
```

### Modified Files

- `src/app/page.tsx`: Added navigation buttons and view rendering for digest/timeline
- `CLAUDE.md`: (Should update with new features)

---

## Performance Considerations

### Weekly Digest
- **AI Call**: 5-10 seconds for Groq API
- **Token Usage**: ~2,000 tokens per digest
- **Caching**: Digests are saved and reused (no regeneration for same week)
- **Optimization**: Only fetches data for target week

### Dream Timeline
- **Data Fetching**: Fast (indexed queries)
- **Rendering**: Client-side calendar generation
- **Optimization**: Only fetches data for visible date range
- **Scalability**: Handles years of data efficiently

---

## Future Enhancements

### Weekly Digest
1. **Email Delivery**: Send digest via Resend every Monday
2. **Scheduling**: Cron job to auto-generate digests
3. **Comparison**: Show "vs last week" trends
4. **Push Notifications**: Alert when new digest available
5. **PDF Export**: Beautiful PDF version for printing/sharing

### Dream Timeline
1. **Week/Year Views**: Full implementation (currently month only)
2. **Zoom Levels**: Drill down from year → month → week → day
3. **Heatmap Intensity**: More granular color gradations
4. **Pattern Markers**: Show symbol icons on high-pattern days
5. **Export**: Download timeline as image/PDF
6. **Sharing**: Share anonymized timeline insights
7. **Comparison**: Side-by-side view of different time periods

---

## Testing Checklist

### Weekly Digest
- [ ] Run database migration
- [ ] Generate digest for week with no data (should show "No activity")
- [ ] Add dreams, moods, journal entries
- [ ] Generate digest (verify AI response)
- [ ] Check digest displays all sections
- [ ] Navigate to previous weeks
- [ ] Mark digest as viewed
- [ ] Regenerate current week (should use cached version)
- [ ] Verify personalization (uses preferred name from onboarding)

### Dream Timeline
- [ ] Open timeline view (month view)
- [ ] Verify current month displays
- [ ] Navigate prev/next months
- [ ] Click "Today" button
- [ ] Click day with dreams (verify details panel)
- [ ] Click day with mood only
- [ ] Click day with life event
- [ ] Click empty day
- [ ] Verify color intensities match dream counts
- [ ] Verify mood colors display correctly
- [ ] Verify life event indicators appear
- [ ] Check statistics panel accuracy

---

## Troubleshooting

### Digest Won't Generate
- Check Groq API key is set in environment
- Verify Supabase connection
- Check browser console for errors
- Ensure migration was applied (table exists)

### Timeline Not Showing Data
- Verify date range is correct
- Check API response in Network tab
- Ensure user has data in date range
- Verify Supabase RLS policies

### Performance Issues
- Digest: Reduce max_tokens if slow
- Timeline: Narrow date range if rendering slow
- Consider adding loading states
- Check API response times

---

## Summary

These two features transform DREAMONEIR from a passive journaling tool into an active, intelligent companion that:

1. **Provides Value Over Time**: Weekly digests keep users engaged
2. **Reveals Hidden Patterns**: Visual timeline makes correlations obvious
3. **Encourages Reflection**: Prompts and insights deepen self-understanding
4. **Leverages AI**: Personalized analysis based on user's unique goals
5. **Scales Beautifully**: Both features work with weeks or years of data

Users now have powerful tools to understand their inner world through the lens of their dreams, moods, and life experiences.
