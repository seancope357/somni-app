# ONEIR - Complete Feature Implementation Plan

## 📋 Executive Summary

This document outlines the implementation plan for completing all missing features in the ONEIR dream journal app. Your Supabase database is already set up with advanced features, but only ~40% are being utilized by the front-end.

**Current State:** Mood tracking widget, dream interpretation, basic history, and patterns.

**Target State:** Full mood-dream correlations, life events tracking, insights dashboard, semantic search, user settings, email reminders, and data export.

---

## 🎯 Implementation Phases

### Phase 0: Foundation & Setup
**Duration:** 3-4 days  
**Goal:** Prepare environment and validate schema

#### Dependencies
```bash
npm install resend openai jszip
```

#### Environment Variables
Add to `.env.local` and Vercel:
```env
RESEND_API_KEY=your_resend_key
OPENAI_API_KEY=your_openai_key
APP_URL=https://your-domain.com
REMINDERS_CRON_SECRET=random_secret_string
```

#### Database Validation
- ✅ Confirm `mood_logs` table with mood, stress, energy (1-5)
- ✅ Confirm `life_events` table with category enum, intensity, date ranges, tags
- ✅ Confirm `dream_life_events` join table
- ✅ Confirm `user_settings` for timezone and reminder preferences
- ✅ Confirm `dream_embeddings` table with vector column
- ✅ Verify RPC functions: `fn_mood_dream_correlations()`, `fn_event_dream_correlations()`
- ✅ Check `dreams.mood_log_id` column exists

#### Shared UI Updates
- Add **Insights** and **Events** tabs to main navigation
- Add **Settings** gear icon next to Sign Out
- Add **Quick Add Event** button in header
- Ensure mood widget persists across tabs (already done ✅)

---

## 🚀 Phase 1: Mood-Dream Integration & Life Events
**Duration:** 1-2 weeks  
**Priority:** HIGH - Core feature completion

### Task 1.1: Auto-Link Mood to Dreams
**File:** `src/app/api/interpret-dream-supabase/route.ts`

**Changes:**
1. Before saving dream, fetch today's mood log:
```typescript
const today = new Date().toISOString().split('T')[0]
const { data: moodLog } = await supabase
  .from('mood_logs')
  .select('id, mood, stress, energy')
  .eq('user_id', userId)
  .eq('log_date', today)
  .single()
```

2. Add mood context to interpretation prompt:
```typescript
if (moodLog) {
  const moodContext = `Context: User's mood today is ${moodLog.mood}/5, stress ${moodLog.stress}/5, energy ${moodLog.energy}/5.`
  // Prepend to dream interpretation prompt
}
```

3. Save dream with `mood_log_id`:
```typescript
await supabase.from('dreams').insert({
  user_id: userId,
  content: dream,
  interpretation,
  mood_log_id: moodLog?.id || null,
  // ... other fields
})
```

**UI Changes:**
- Display mood context pill in interpretation result (emoji + stress/energy bars)
- If no mood today, show "Log your mood first" CTA

**Acceptance:**
- ✅ Dreams auto-link to today's mood
- ✅ Interpretation considers mood context
- ✅ Mood pill renders in results

---

### Task 1.2: Life Events Management
**New Files:**
- `src/components/events/LifeEventDialog.tsx`
- `src/components/events/LifeEventCard.tsx`
- `src/components/events/LifeEventsTimeline.tsx`

**LifeEventDialog Component:**
```typescript
interface LifeEventForm {
  title: string
  description?: string
  category: 'work' | 'relationship' | 'health' | 'travel' | 'loss' | 'achievement' | 'social' | 'finance' | 'move' | 'study' | 'other'
  intensity?: 1 | 2 | 3 | 4 | 5
  date_start: Date
  date_end?: Date
  tags: string[]
}
```

**Category Icons:**
```typescript
const CATEGORY_ICONS = {
  work: Briefcase,
  relationship: Heart,
  health: Activity,
  travel: Plane,
  loss: CloudRain,
  achievement: Trophy,
  social: Users,
  finance: DollarSign,
  move: Home,
  study: BookOpen,
  other: Star
}
```

**Timeline View:**
- Group events by month
- Show category icon and color
- Display intensity as colored bar (1-5 scale)
- Expandable cards with description and tags
- Edit/Delete actions

**Navigation:**
- Add **Events** tab to main nav (between Patterns and Settings)
- Events view shows timeline + floating action button for "Add Event"

**Acceptance:**
- ✅ Full CRUD operations work
- ✅ Timeline renders chronologically
- ✅ Mobile responsive with touch targets
- ✅ Category colors and icons display correctly

---

### Task 1.3: Link Dreams to Life Events
**New File:** `src/app/api/dreams-supabase/[id]/link-events/route.ts`

**API Implementation:**
```typescript
// POST /api/dreams-supabase/[dreamId]/link-events
export async function POST(request: Request, { params }) {
  const { event_ids } = await request.json()
  
  // Insert associations
  await supabase.from('dream_life_events').insert(
    event_ids.map(eventId => ({
      dream_id: params.id,
      life_event_id: eventId
    }))
  )
}

// DELETE to unlink
```

**UI Changes:**
1. **After Dream Save:** Show "Link to Life Events?" with top 3 suggestions based on date proximity
2. **Interpretation View:** Add "Link Event" button → searchable multi-select dropdown
3. **History Cards:** Display linked event chips (category icon + title)

**Acceptance:**
- ✅ Suggestions appear after saving dream
- ✅ Link/unlink from interpretation and history
- ✅ History cards show linked events

---

## 📊 Phase 2: Insights & Correlations
**Duration:** 1 week  
**Priority:** MEDIUM-HIGH - Key differentiator

### Task 2.1: Enhanced Patterns API
**File:** `src/app/api/dreams-supabase/patterns/route.ts`

**Add Correlation Data:**
```typescript
// Call RPC functions
const { data: moodCorrelations } = await supabase
  .rpc('fn_mood_dream_correlations', { p_user: userId })

const { data: eventCorrelations } = await supabase
  .rpc('fn_event_dream_correlations', { p_user: userId, p_window: 3 })

// Transform into chart-ready format
const moodInsights = {
  byMood: moodCorrelations.filter(c => c.dimension === 'mood'),
  byStress: moodCorrelations.filter(c => c.dimension === 'stress'),
  byEnergy: moodCorrelations.filter(c => c.dimension === 'energy')
}

const eventInsights = eventCorrelations.map(e => ({
  category: e.category,
  dreamRate: e.dream_rate,
  totalDays: e.total_days
}))
```

**Return Schema:**
```typescript
interface PatternsResponse {
  // Existing fields...
  correlations: {
    mood: MoodCorrelation[]
    events: EventCorrelation[]
    insights: string[] // Human-readable findings
  }
}
```

**Acceptance:**
- ✅ API returns correlation data
- ✅ Handles empty states gracefully
- ✅ Performance < 2s for 1000+ dreams

---

### Task 2.2: Insights View & Visualizations
**New Files:**
- `src/components/insights/MoodCorrelationChart.tsx`
- `src/components/insights/EventImpactChart.tsx`
- `src/components/insights/InsightsTimeline.tsx`
- `src/components/insights/InsightCards.tsx`

**MoodCorrelationChart (Recharts):**
```typescript
// Bar chart showing dream frequency by mood level
<BarChart data={moodData}>
  <XAxis dataKey="mood" label="Mood Level" />
  <YAxis label="Dream Rate %" />
  <Tooltip />
  <Bar dataKey="dreamRate" fill="#a855f7" />
</BarChart>
```

**EventImpactChart:**
- Horizontal bar chart by event category
- Shows "Dreams per day" during event ± 3 days window
- Color-coded by category

**InsightsTimeline:**
- Combined view: dreams (purple), moods (pink), events (blue)
- Scrollable with zoom controls
- Click to filter details

**InsightCards:**
Auto-generate insights like:
- "You dream 2.3x more often when stress is high (4-5)"
- "Work events correlate with 60% more dreams in the following 3 days"
- "Your most active dream period was [month] with 15 dreams"

**Navigation:**
Add **Insights** tab between History and Events

**Acceptance:**
- ✅ Charts render responsively
- ✅ Insight cards show top 3-5 findings
- ✅ Timeline is interactive

---

### Task 2.3: Mood History in Patterns
**Enhancement to existing Patterns view**

**Add Mood Chart:**
```typescript
// Line chart showing mood/stress/energy over time
<LineChart data={moodTimeSeries}>
  <Line type="monotone" dataKey="mood" stroke="#ec4899" />
  <Line type="monotone" dataKey="stress" stroke="#f97316" />
  <Line type="monotone" dataKey="energy" stroke="#8b5cf6" />
</LineChart>
```

**Overlay Dream Count:**
- Secondary Y-axis showing dream count per day
- Helps visualize correlation

**Acceptance:**
- ✅ Historical mood trends visible
- ✅ Correlation with dreams is clear

---

## ⚙️ Phase 3: Settings & Reminders
**Duration:** 1 week  
**Priority:** MEDIUM - User retention

### Task 3.1: User Settings API
**New File:** `src/app/api/user-settings/route.ts`

```typescript
// GET - fetch user settings
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  return NextResponse.json(data || getDefaults())
}

// POST - upsert settings
export async function POST(request: Request) {
  const settings = await request.json()
  
  // Validate timezone, reminder_time, frequency, etc.
  const validated = validateSettings(settings)
  
  await supabase.from('user_settings').upsert(validated)
}
```

**Acceptance:**
- ✅ Idempotent upserts
- ✅ Validates timezone and time format

---

### Task 3.2: Settings Page UI
**New File:** `src/components/settings/SettingsDialog.tsx`

**Sections:**
1. **Profile** (future: avatar, display name)
2. **Preferences**
   - Timezone selector (searchable dropdown)
3. **Reminders**
   - Enable/disable toggle
   - Time picker (local time)
   - Frequency: Daily, Weekdays, Custom days
   - Channels: Email ☑, Push ☐ (coming soon)
   - Remind me to: ☑ Journal dreams, ☑ Log mood
4. **Data & Privacy**
   - Export all data button
   - Delete account (future)

**Navigation:**
Add **Settings** gear icon in header → opens dialog or dedicated page

**Acceptance:**
- ✅ Settings persist immediately
- ✅ UI reflects current settings on load
- ✅ Disabled states when reminders off

---

### Task 3.3: Email Reminder System
**New Files:**
- `src/app/api/reminders/send/route.ts` (test endpoint)
- `src/app/api/reminders/cron/route.ts` (daily cron)
- `src/lib/email-templates.ts`

**Email Template:**
```typescript
const dreamReminderTemplate = (userName: string) => `
<!DOCTYPE html>
<html>
<body style="background: linear-gradient(to br, #4c1d95, #7e22ce, #db2777); padding: 40px;">
  <div style="max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.95); border-radius: 16px; padding: 32px;">
    <h1 style="font-family: serif; color: #4c1d95;">ONEIR</h1>
    <p>Hi ${userName},</p>
    <p>Ready to journal your dreams from last night?</p>
    <a href="${APP_URL}" style="background: linear-gradient(to r, #a855f7, #6366f1); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
      Open ONEIR
    </a>
  </div>
</body>
</html>
`
```

**Cron Logic:**
```typescript
// Called daily at 00:00 UTC by Vercel Cron
export async function POST(request: Request) {
  // Verify secret
  const secret = request.headers.get('authorization')
  if (secret !== `Bearer ${process.env.REMINDERS_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Fetch users eligible for reminders at current hour
  const currentHour = new Date().getUTCHours()
  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id, timezone, reminder_time_local, frequency, channels, remind_for')
    .eq('reminders_enabled', true)
  
  // For each user, check if current UTC hour matches their local reminder time
  for (const user of users) {
    const localTime = convertToUserLocalTime(user.timezone, user.reminder_time_local)
    if (shouldSendNow(localTime, user.frequency, currentHour)) {
      await sendEmail(user)
    }
  }
}
```

**Vercel Cron Config:** `vercel.json`
```json
{
  "crons": [{
    "path": "/api/reminders/cron",
    "schedule": "0 * * * *"
  }]
}
```

**Acceptance:**
- ✅ Test emails work
- ✅ Cron runs hourly and respects timezones
- ✅ No duplicate sends per day

---

## 🔍 Phase 4: Semantic Search & Embeddings
**Duration:** 1 week  
**Priority:** LOW-MEDIUM - Advanced feature

### Task 4.1: Embeddings Generation
**New File:** `src/app/api/embeddings/generate/route.ts`

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const { dream_id, content } = await request.json()
  
  // Generate embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
    dimensions: 1536
  })
  
  const embedding = response.data[0].embedding
  
  // Store in dream_embeddings table
  await supabase.from('dream_embeddings').upsert({
    dream_id,
    embedding,
    model: 'text-embedding-3-small'
  })
  
  return NextResponse.json({ success: true })
}
```

**Backfill Script:**
```typescript
// scripts/backfill-embeddings.ts
// Fetches all dreams without embeddings and generates them
```

**Acceptance:**
- ✅ New dreams get embeddings automatically
- ✅ Backfill completes for existing dreams

---

### Task 4.2: Semantic Search UI
**New Files:**
- `src/app/api/dreams-supabase/similar/route.ts`
- `src/components/search/SemanticSearch.tsx`

**API:**
```typescript
export async function POST(request: Request) {
  const { query, dream_id, limit = 10 } = await request.json()
  
  // If query text, generate embedding first
  let embedding
  if (query) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    })
    embedding = response.data[0].embedding
  } else if (dream_id) {
    // Fetch existing embedding
    const { data } = await supabase
      .from('dream_embeddings')
      .select('embedding')
      .eq('dream_id', dream_id)
      .single()
    embedding = data.embedding
  }
  
  // Call vector similarity RPC or use pgvector directly
  const { data } = await supabase.rpc('match_dreams', {
    query_embedding: embedding,
    match_count: limit,
    user_id: userId
  })
  
  return NextResponse.json(data)
}
```

**UI Component:**
- Toggle between "Keyword" and "Semantic" search
- Semantic search shows similarity scores (0-100%)
- "Similar Dreams" section in dream detail view

**Acceptance:**
- ✅ Semantic search returns relevant results
- ✅ Scores are accurate and sorted
- ✅ Works from History and detail views

---

### Task 4.3: Theme Clustering
**New File:** `src/app/api/dreams-supabase/clusters/route.ts`

**Simple Clustering:**
```typescript
// Group dreams by similar embeddings using k-means or DBSCAN
// Return cluster labels and representative dreams
```

**UI:**
Bubble chart showing theme clusters (e.g., "Flying Dreams", "Work Anxiety", "Nature Dreams")

**Acceptance:**
- ✅ Clusters make sense thematically
- ✅ Clicking opens filtered dream list

---

## 🎁 Phase 5: Polish & Export
**Duration:** 1 week  
**Priority:** MEDIUM - Completion & retention

### Task 5.1: Data Export
**New File:** `src/app/api/export/data/route.ts`

```typescript
import JSZip from 'jszip'

export async function GET(request: Request) {
  const userId = searchParams.get('userId')
  
  // Fetch all user data
  const dreams = await fetchDreams(userId)
  const moods = await fetchMoods(userId)
  const events = await fetchEvents(userId)
  const settings = await fetchSettings(userId)
  
  // Create ZIP
  const zip = new JSZip()
  zip.file('dreams.json', JSON.stringify(dreams, null, 2))
  zip.file('dreams.csv', convertToCSV(dreams))
  zip.file('moods.json', JSON.stringify(moods, null, 2))
  zip.file('moods.csv', convertToCSV(moods))
  zip.file('life_events.json', JSON.stringify(events, null, 2))
  zip.file('life_events.csv', convertToCSV(events))
  
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=oneir-export-${Date.now()}.zip`
    }
  })
}
```

**UI:**
Export button in Settings → downloads ZIP immediately

**Acceptance:**
- ✅ ZIP contains all data in CSV and JSON
- ✅ Works for users with 1000+ dreams

---

### Task 5.2: Smart Journaling Prompts
**New File:** `src/components/prompts/JournalingPrompts.tsx`

**Logic:**
```typescript
const generatePrompts = (mood: number, stress: number, recentEvents: LifeEvent[]) => {
  const prompts = []
  
  if (stress >= 4) {
    prompts.push("What stressful situations appeared in your dreams?")
  }
  
  if (mood <= 2) {
    prompts.push("Did your dreams reflect any concerns or worries?")
  }
  
  if (recentEvents.some(e => e.category === 'work')) {
    prompts.push("Were there any work-related symbols in your dream?")
  }
  
  return prompts.slice(0, 5)
}
```

**UI:**
Show prompts under mood widget in Interpret tab with "Use this prompt" button

**Acceptance:**
- ✅ Prompts feel contextually relevant
- ✅ Clicking prompt inserts text into textarea

---

### Task 5.3: Enhanced History Filters
**Updates to History View:**

**Add Filters:**
- Mood range slider (1-5)
- Stress range slider (1-5)
- Energy range slider (1-5)
- Life event multi-select
- Date range picker
- Linked/unlinked toggle

**Add Indicators:**
- Mood emoji on each card
- Linked event chips
- Stress/energy bars

**Acceptance:**
- ✅ Filters work independently and combined
- ✅ URL params reflect filter state

---

### Task 5.4: Mobile & Accessibility
**Polish Checklist:**
- [ ] All dialogs close on mobile back gesture
- [ ] Touch targets >= 44px
- [ ] Timeline is swipeable
- [ ] Keyboard shortcuts: `/` for search, `N` for new dream
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast ratio >= 4.5:1
- [ ] Loading skeletons for all async content
- [ ] Empty states with helpful CTAs

---

## 🔒 Security & API Hardening
**Critical Tasks:**

1. **Auth Middleware:**
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-auth-token')
  if (!token && request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

2. **Rate Limiting:**
```typescript
// Limit interpretation API to 10 requests per minute per user
// Limit embeddings API to 100 requests per hour
```

3. **RLS Verification:**
Test that users cannot:
- Read other users' dreams, moods, events, or settings
- Modify other users' data
- Access embeddings of other users

---

## 📊 Acceptance Criteria by Tab

### ✨ Interpret Tab
- [x] Mood widget logs mood (already done)
- [ ] New dreams auto-link to today's mood
- [ ] Interpretation shows mood context pill
- [ ] "Link to Life Events" control after saving
- [ ] Smart prompts appear based on mood/events

### 📖 History Tab
- [x] Search and filters (basic - already done)
- [ ] Mood indicators on cards
- [ ] Linked event chips on cards
- [ ] Advanced filters (mood, stress, energy, events, date)
- [ ] Semantic search toggle

### 📈 Patterns Tab
- [x] Symbols, emotions, themes, sleep stats (already done)
- [ ] Mood correlation charts
- [ ] Historical mood trends
- [ ] Dream frequency by mood level

### 💡 Insights Tab (NEW)
- [ ] Mood-dream correlation bar charts
- [ ] Event impact visualization
- [ ] Combined timeline (dreams + moods + events)
- [ ] Auto-generated insight cards

### 🌟 Events Tab (NEW)
- [ ] Add/edit/delete life events
- [ ] Timeline view with category icons
- [ ] Filter by category
- [ ] Link/unlink to dreams

### ⚙️ Settings (NEW)
- [ ] Timezone selector
- [ ] Reminder configuration
- [ ] Email reminders work
- [ ] Data export downloads ZIP

### 🔍 Advanced (Phase 4)
- [ ] Semantic search finds similar dreams
- [ ] "Similar Dreams" section in detail view
- [ ] Theme clusters visualization

---

## 🗓️ Timeline & Milestones

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Phase 1 | Mood-dream linking, Life Events CRUD, Dream-event linking |
| 3 | Phase 2 | Insights view, Correlation charts, Enhanced patterns API |
| 4 | Phase 3 | Settings UI, User settings API, Email reminder infrastructure |
| 5 | Phase 4 | Embeddings generation, Semantic search, Theme clusters |
| 6 | Phase 5 | Data export, Smart prompts, Polish, Mobile UX |

**Total Estimated Time:** 6 weeks for full implementation

---

## 🚀 Getting Started

### Immediate Next Steps:
1. **Install dependencies:**
   ```bash
   npm install resend openai jszip
   ```

2. **Add environment variables** to `.env.local`

3. **Start with Phase 1, Task 1.1:** Auto-link mood to dreams
   - Modify `src/app/api/interpret-dream-supabase/route.ts`
   - Add mood context to prompt
   - Display mood pill in interpretation result

4. **Build Life Events UI** (Phase 1, Task 1.2)
   - Create `LifeEventDialog.tsx`
   - Add Events tab to navigation
   - Wire up to existing API routes

### Feature Flags (Recommended):
```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  LIFE_EVENTS: true,
  INSIGHTS: false, // Enable after Phase 2
  SEMANTIC_SEARCH: false, // Enable after Phase 4
  EMAIL_REMINDERS: false // Enable after Phase 3
}
```

---

## 📝 Notes & Assumptions

1. **Database:** Assumes all tables from `supabase-mood-events-migration.sql` are created
2. **RLS:** Assumes Row Level Security policies are in place
3. **RPC Functions:** Assumes `fn_mood_dream_correlations` and `fn_event_dream_correlations` exist and work
4. **Vector Extension:** Assumes `pgvector` extension is enabled for embeddings

---

## ❓ Open Questions

- [ ] Confirm table name for dream-event join (assuming `dream_life_events`)
- [ ] Confirm if `dreams.mood_log_id` column exists or needs to be added
- [ ] Confirm availability and schema of correlation RPC functions
- [ ] Decide on push notifications scope (deferred to future?)

---

## 📚 Resources

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Recharts Documentation](https://recharts.org/en-US/)
- [Resend Email API](https://resend.com/docs)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

**Ready to begin? Start with Phase 1 Task 1.1!** 🚀
