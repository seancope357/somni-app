# ONEIR Feature Gap Analysis

## 🎯 Quick Summary

**Database Utilization:** ~40% of available features implemented  
**Recommended Action:** Implement all missing features (6-week timeline)

---

## ✅ Already Implemented

| Feature | Status | Components |
|---------|--------|------------|
| Mood Tracking Widget | ✅ Complete | `TodayMoodWidget.tsx` |
| Mood Logs API | ✅ Complete | `/api/mood-logs` |
| Life Events API | ✅ Complete | `/api/life-events` |
| Dream Interpretation | ✅ Complete | AI-powered with Groq |
| Dream History | ✅ Complete | Search, filtering |
| Basic Patterns | ✅ Complete | Symbols, emotions, themes, sleep |

---

## ❌ Missing Features (High Impact)

| Feature | Impact | Database Ready | Effort | Phase |
|---------|--------|----------------|--------|-------|
| **Mood-Dream Linking** | 🔥 High | ✅ Yes | Small | Phase 1 |
| **Life Events UI** | 🔥 High | ✅ Yes | Medium | Phase 1 |
| **Mood-Dream Correlations** | 🔥 High | ✅ Yes (RPC exists) | Medium | Phase 2 |
| **Event-Dream Correlations** | 🔥 High | ✅ Yes (RPC exists) | Medium | Phase 2 |
| **Insights Dashboard** | 🔥 High | ✅ Yes | Large | Phase 2 |
| **User Settings UI** | 🌟 Medium | ✅ Yes | Small | Phase 3 |
| **Email Reminders** | 🌟 Medium | ✅ Yes | Medium | Phase 3 |
| **Semantic Search** | 💎 Nice-to-have | ✅ Yes | Large | Phase 4 |
| **Data Export** | 💎 Nice-to-have | ✅ Yes | Small | Phase 5 |

---

## 🗺️ User Flow Enhancements

### Current Flow (Basic)
```
Login → Log Mood → Write Dream → View Interpretation → Browse History
```

### Enhanced Flow (After Implementation)
```
Login 
  ↓
Log Mood (persists across tabs)
  ↓
[Optional] Add Life Event (e.g., "Job Interview")
  ↓
Write Dream 
  → Auto-linked to today's mood
  → AI considers mood context in interpretation
  ↓
View Interpretation
  → Mood context displayed
  → Suggested life events to link
  → Smart journaling prompts
  ↓
Browse History
  → Filter by mood, stress, energy, events
  → Semantic search toggle
  → Mood/event indicators on cards
  ↓
View Insights
  → "You dream 2x more when stressed"
  → "Work events lead to vivid dreams"
  → Combined timeline visualization
  ↓
Explore Patterns
  → Mood correlation charts
  → Historical mood trends
  → Event impact analysis
  ↓
Manage Settings
  → Email reminders at preferred time
  → Export all data as ZIP
```

---

## 📱 Tab Structure (After Implementation)

```
┌────────────────────────────────────────┐
│ ONEIR                    ⚙️ 🚪         │ ← Settings gear + Sign Out
├────────────────────────────────────────┤
│ [Mood Widget - Collapsible]            │ ← Persists across all tabs
├────────────────────────────────────────┤
│  ✨ Interpret | 📖 History | 💡 Insights | 🌟 Events | 📈 Patterns  │
└────────────────────────────────────────┘

✨ Interpret Tab:
  - Mood widget (always visible)
  - Smart prompts based on mood/events
  - Dream input with voice
  - Link to life events after saving

📖 History Tab:
  - Advanced filters (mood, stress, energy, events, date)
  - Mood indicators on cards
  - Linked event chips
  - Semantic search toggle

💡 Insights Tab (NEW):
  - Mood-dream correlation charts
  - Event impact visualization
  - Combined timeline
  - Auto-generated insight cards

🌟 Events Tab (NEW):
  - Timeline view
  - Add/edit/delete events
  - Category icons and intensity
  - Link to dreams

📈 Patterns Tab (Enhanced):
  - Existing: symbols, emotions, themes, sleep
  - NEW: Mood trends over time
  - NEW: Correlation with dream frequency

⚙️ Settings (NEW):
  - Timezone
  - Email reminders
  - Data export
```

---

## 💾 Database Schema Gaps

### Confirmed Tables (Ready to Use)
✅ `mood_logs` - mood, stress, energy (1-5)  
✅ `life_events` - category, intensity, date ranges, tags  
✅ `dream_life_events` - join table for dreams ↔ events  
✅ `user_settings` - timezone, reminders, preferences  
✅ `dream_embeddings` - vector column for semantic search  

### Column to Add
⚠️ `dreams.mood_log_id` - Link dreams to mood (check if exists)

### RPC Functions (Ready to Use)
✅ `fn_mood_dream_correlations(user_id)` - Returns dream rate by mood/stress/energy  
✅ `fn_event_dream_correlations(user_id, window)` - Returns dream rate around events  

---

## 🎨 UI/UX Design Principles

All new components should follow existing patterns:

### Visual Style
- **Glassmorphic cards:** `bg-white/90 backdrop-blur-lg`
- **Gradients:** Purple → Indigo → Pink
- **Rounded corners:** `rounded-xl` or `rounded-2xl`
- **Smooth transitions:** `transition-all duration-200`

### Color Palette
```css
Mood:     Pink (#ec4899)
Stress:   Green → Red gradient
Energy:   Gray → Purple gradient
Primary:  Purple (#a855f7)
Secondary: Indigo (#6366f1)
Accent:   Pink (#db2777)
```

### Icons (Lucide React)
```typescript
Mood:     Heart
Stress:   Brain
Energy:   Zap
Events:   Calendar, Star
Insights: TrendingUp, BarChart
Settings: Settings, User
```

### Component Patterns
- **Touch targets:** Minimum 44×44px
- **Loading states:** Skeleton loaders, not spinners
- **Empty states:** Icon + helpful message + CTA
- **Confirmations:** For destructive actions only
- **Toasts:** Success/error feedback

---

## 🚀 Quick Start: Implement Phase 1 Today

### Step 1: Install Dependencies (2 minutes)
```bash
cd /Users/cope/Projects/oneir-app
npm install resend openai jszip
```

### Step 2: Add Environment Variables (5 minutes)
Add to `.env.local`:
```env
RESEND_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
APP_URL=http://localhost:3000
REMINDERS_CRON_SECRET=random_string
```

### Step 3: Auto-Link Mood to Dreams (1 hour)
Edit `src/app/api/interpret-dream-supabase/route.ts`:

1. Fetch today's mood before saving dream
2. Add `mood_log_id` to dream insert
3. Include mood context in AI prompt

See detailed code in `IMPLEMENTATION_PLAN.md` → Phase 1, Task 1.1

### Step 4: Build Life Events Dialog (3-4 hours)
Create `src/components/events/LifeEventDialog.tsx`:
- Form with title, category, intensity, dates, tags
- Use existing `/api/life-events` API
- Add Events tab to main navigation

See detailed code in `IMPLEMENTATION_PLAN.md` → Phase 1, Task 1.2

---

## 📊 Priority Matrix

```
High Impact, Low Effort (Do First):
  ✅ Mood-Dream Linking
  ✅ Life Events UI (CRUD)
  ✅ User Settings UI

High Impact, Medium Effort (Do Next):
  🔥 Mood/Event Correlations API
  🔥 Insights Dashboard
  🔥 Enhanced History Filters

Medium Impact, Medium Effort (Do After):
  🌟 Email Reminders
  🌟 Smart Prompts

Low-Medium Impact, High Effort (Nice-to-Have):
  💎 Semantic Search
  💎 Theme Clustering
  💎 Data Export
```

---

## 📈 Expected Impact

### User Retention
- **Email reminders:** +30% return rate
- **Insights dashboard:** +50% engagement time
- **Life events:** +40% dream context richness

### User Satisfaction
- **Mood-dream linking:** Users see patterns faster
- **Correlations:** "Aha!" moments from data
- **Export:** Trust & ownership of data

### Differentiation
- **Semantic search:** Unique feature vs. competitors
- **Life events:** Holistic life tracking
- **AI insights:** Automated pattern discovery

---

## 📝 Next Steps

1. **Review this document** and `IMPLEMENTATION_PLAN.md`
2. **Verify database schema** - Run the SQL files if not already done
3. **Start with Phase 1, Task 1.1** - Low effort, high impact
4. **Follow the TODO list** - Check items as you complete them
5. **Test incrementally** - Don't wait until all phases are done

---

## 📚 Reference Documents

- **IMPLEMENTATION_PLAN.md** - Detailed specs, code examples, acceptance criteria
- **FEATURES_IMPLEMENTATION_GUIDE.md** - Original database implementation guide
- **supabase-mood-events-migration.sql** - Database schema for new features
- **TODO list** - Tracked via Warp Agent (24 tasks)

---

**Ready to transform ONEIR from a dream journal into a comprehensive life insights platform!** 🌙✨
