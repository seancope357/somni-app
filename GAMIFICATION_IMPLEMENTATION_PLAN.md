# 🎮 Gamification System Implementation Plan

## Overview
This document outlines the complete implementation of a professional-grade gamification system for DREAMONEIR, inspired by industry leaders like Duolingo, Habitica, and Fabulous.

## ✅ Completed (Phase 1)
- [x] Database schema with 7 tables
- [x] TypeScript type definitions
- [x] 23 pre-defined achievements across 6 categories
- [x] XP and leveling system with exponential curve
- [x] Streak tracking (dream, mood, wellness)
- [x] Goal setting framework
- [x] Daily activity stats tracking
- [x] Weekly summaries system

## 🚧 In Progress (Phase 2)
- [ ] API Routes (5 endpoints)
- [ ] React Components (8 components)
- [ ] Achievement notification system
- [ ] Integration hooks

## 📋 Implementation Phases

### **Phase 2: API Development** (Current)

#### API Routes to Build:

**1. `/api/gamification/dashboard` - GET**
- Purpose: Fetch complete gamification state for user
- Returns:
  - Current streaks (all 3 types)
  - Level & XP progress
  - Recent achievements (last 5)
  - Active goals with progress
  - Today's activity stats
  - Unviewed achievements count

**2. `/api/gamification/achievements` - GET/POST**
- GET: List all achievements with unlock status
- POST: Manually trigger achievement check (used after actions)
- Returns newly unlocked achievements + XP gained

**3. `/api/gamification/streaks` - GET/POST**
- GET: Fetch current streak data
- POST: Update streaks after dream/mood logging
- Handles streak breaks and automatic resets
- Supports streak freeze usage

**4. `/api/gamification/goals` - GET/POST/PATCH/DELETE**
- Full CRUD for user goals
- Automatic progress calculation
- Goal completion detection
- Preset goal templates

**5. `/api/gamification/xp` - POST**
- Award XP for actions
- Handle level-ups
- Update user_levels table
- Return celebration events

### **Phase 3: React Components**

#### Core Components:

**1. `<GamificationDashboard />` (Main Overview)**
```tsx
// Location: src/components/gamification/GamificationDashboard.tsx
// Features:
// - Shows all streaks with fire animations
// - Level progress bar with XP
// - Recent achievements carousel
// - Active goals grid
// - Quick stats (dreams, moods this week)
```

**2. `<StreakCounter />` (Individual Streak)**
```tsx
// Location: src/components/gamification/StreakCounter.tsx
// Features:
// - Animated flame icon (grows with streak)
// - Current streak number
// - Best streak comparison
// - Streak freeze indicator
// - Warning when about to break
```

**3. `<AchievementCard />` (Single Achievement)**
```tsx
// Location: src/components/gamification/AchievementCard.tsx
// Features:
// - Locked/unlocked states
// - Tier-based styling (bronze/silver/gold/platinum/legendary)
// - Progress bar for in-progress achievements
// - Unlock date display
// - XP reward badge
```

**4. `<AchievementGallery />` (All Achievements)**
```tsx
// Location: src/components/gamification/AchievementGallery.tsx
// Features:
// - Grid layout with filters (category, tier, status)
// - Search functionality
// - Unviewed badge counts
// - Secret achievement hints
// - Sort by: recent, rarity, XP
```

**5. `<GoalCard />` (Individual Goal)**
```tsx
// Location: src/components/gamification/GoalCard.tsx
// Features:
// - Progress ring/bar
// - Days remaining countdown
// - On-track indicator
// - Quick complete/abandon buttons
// - Daily target breakdown
```

**6. `<GoalCreator />` (Goal Setting Modal)**
```tsx
// Location: src/components/gamification/GoalCreator.tsx
// Features:
// - Preset templates (Dream 5x this week, etc.)
// - Custom goal builder
// - Time period selector
// - Icon picker
// - Difficulty estimator
```

**7. `<LevelProgressBar />` (XP/Level Display)**
```tsx
// Location: src/components/gamification/LevelProgressBar.tsx
// Features:
// - Animated XP bar
// - Current level badge
// - XP numbers (current/required)
// - Level-up animation trigger
// - Title display (Dream Novice -> Dream Master)
```

**8. `<CelebrationModal />` (Achievement Unlocks)**
```tsx
// Location: src/components/gamification/CelebrationModal.tsx
// Features:
// - Confetti/fireworks animations
// - Achievement reveal animation
// - XP gain animation
// - Level-up celebration
// - Share button (optional)
// - Chain multiple celebrations
```

**9. `<WeeklySummary />` (Progress Report)**
```tsx
// Location: src/components/gamification/WeeklySummary.tsx
// Features:
// - AI-generated summary
// - Bar charts for activity
// - Completion rate visualization
// - Comparison to previous week
// - Highlights & insights
// - Share/export options
```

### **Phase 4: Integration Hooks**

#### Hook Points in Existing Code:

**Dream Logging** (`/api/interpret-dream-supabase`)
```typescript
// After dream saved:
await updateStreaks(userId, 'dream', date)
await updateDailyStats(userId, { dreams_logged: +1 })
await awardXP(userId, XP_REWARDS.DREAM_LOGGED, 'Dream logged')
await checkAchievements(userId, 'dream_count')
```

**Mood Logging** (`/api/mood-logs`)
```typescript
// After mood saved:
await updateStreaks(userId, 'mood', date)
await updateDailyStats(userId, { moods_logged: +1 })
await awardXP(userId, XP_REWARDS.MOOD_LOGGED, 'Mood logged')
await checkAchievements(userId, 'mood_count')
```

**Journal Entry** (`/api/journal`)
```typescript
// After journal saved:
await updateDailyStats(userId, { journals_written: +1 })
await awardXP(userId, XP_REWARDS.JOURNAL_ENTRY, 'Journal entry')
await checkAchievements(userId, 'journal_count')
```

**Chat Messages** (`/api/dream-chat`)
```typescript
// After chat response:
await updateDailyStats(userId, { chat_messages_sent: +1 })
await awardXP(userId, XP_REWARDS.CHAT_MESSAGE, 'Chat engaged')
if (firstChat) await checkAchievements(userId, 'chat_count')
```

**Goal Completion** (Automatic check in daily cron)
```typescript
// Run daily at midnight:
await checkGoalProgress(allActiveGoals)
await checkForStreakBreaks(allUsers)
await generateWeeklySummaries(sundayUsers)
```

### **Phase 5: UI/UX Polish**

#### Visual Design:

**Animations:**
- Lottie animations for achievement unlocks
- CSS animations for streak flames
- Confetti.js for celebrations
- Smooth transitions for progress bars
- Micro-interactions (hover, click)

**Color System:**
- Bronze: Orange (#F97316)
- Silver: Gray (#6B7280)
- Gold: Yellow (#EAB308)
- Platinum: Purple (#A855F7)
- Legendary: Gradient Purple-Pink

**Sound Effects** (Optional):
- Achievement unlock chime
- Level-up fanfare
- Streak milestone sound
- Goal completed bell

#### Accessibility:
- ARIA labels for all gamification elements
- Keyboard navigation
- Screen reader announcements for achievements
- Reduced motion option
- High contrast mode

### **Phase 6: Backend Jobs & Cron**

#### Scheduled Tasks:

**Daily (00:00 UTC):**
- Check for broken streaks
- Update goal progress
- Generate daily activity stats
- Check time-based achievements

**Weekly (Sunday 00:00 UTC):**
- Generate weekly summaries
- Calculate AI insights
- Award weekly goal completion XP
- Check "perfect week" achievements

**Monthly:**
- Generate monthly reports
- Archive old data
- Recalculate leaderboards (if adding social features)

## 🔧 Technical Considerations

### Performance:
- Index all foreign keys
- Cache achievement criteria in memory
- Batch achievement checks
- Use database triggers for automatic updates
- Lazy load achievement gallery

### Security:
- RLS policies on all tables
- Validate all XP awards server-side
- Prevent achievement exploitation
- Rate limit goal creation
- Audit trail for suspicious activity

### Testing:
- Unit tests for XP calculations
- Integration tests for achievement unlocks
- E2E tests for full gamification flow
- Load testing for concurrent users

## 📊 Success Metrics

### Engagement KPIs:
- Daily Active Users (DAU)
- Retention rate (D1, D7, D30)
- Average session length
- Dreams logged per user per week
- Goal completion rate
- Achievement unlock rate

### Target Metrics:
- 50%+ users maintain 7-day streak
- 30%+ users set custom goals
- 80%+ users unlock 5+ achievements
- 20% increase in daily engagement
- 15% increase in retention

## 🚀 Rollout Plan

### Beta Testing (Week 1-2):
- Deploy to 10% of users
- Monitor for bugs
- Gather feedback
- Iterate on UX

### Full Launch (Week 3):
- Deploy to all users
- Marketing push
- Tutorial/onboarding
- Monitor analytics

### Post-Launch (Week 4+):
- Add more achievements monthly
- Seasonal events
- Community challenges
- Leaderboards (optional)

## 📝 Next Steps

1. ✅ Complete database schema
2. ✅ Define TypeScript types
3. ⏳ Build API routes (in progress)
4. ⏳ Create React components
5. ⏳ Integrate hooks
6. ⏳ Test thoroughly
7. ⏳ Deploy to production

---

**Last Updated:** 2025-12-09
**Status:** Phase 2 in progress
**ETA:** 4-6 hours of development time remaining
