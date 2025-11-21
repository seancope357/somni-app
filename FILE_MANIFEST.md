# ONEIR - File Manifest

Complete list of all files created/modified during development.

## 📁 New Files Created

### API Routes (`src/app/api/`)

#### Life Events APIs
- `src/app/api/life-events/route.ts` - GET/POST for life events
- `src/app/api/life-events/[id]/route.ts` - PUT/DELETE for individual events

#### Dream-Event Linking
- `src/app/api/dream-links/route.ts` - GET/POST/DELETE for linking dreams to events

#### Analytics & Insights
- `src/app/api/insights/route.ts` - Advanced correlation analysis and pattern recognition

#### User Settings
- `src/app/api/settings/route.ts` - GET/POST for user preferences and reminders

#### Data Export
- `src/app/api/export/route.ts` - JSON/CSV data export for all user data

---

### Components (`src/components/`)

#### Events Components
- `src/components/events/LifeEventCard.tsx` - Individual event display card
- `src/components/events/LifeEventsTimeline.tsx` - Chronological timeline view
- `src/components/events/LifeEventDialog.tsx` - Create/edit event form (pre-existing, documented)
- `src/components/events/DreamEventLinker.tsx` - Link dreams to events widget

#### Insights Components
- `src/components/insights/InsightsView.tsx` - Main analytics dashboard with charts

#### Mood Components
- `src/components/mood/MoodHistoryChart.tsx` - Mood trends visualization
- `src/components/mood/TodayMoodWidget.tsx` - (pre-existing, documented)

#### Settings Components
- `src/components/settings/SettingsView.tsx` - Comprehensive settings page

---

### Configuration & Documentation

#### Development Guides
- `WARP.md` - Development guidelines for Warp AI agents
- `PROJECT_COMPLETION_SUMMARY.md` - Complete feature documentation
- `FILE_MANIFEST.md` - This file

---

## 📝 Modified Files

### Main Application
- `src/app/page.tsx` - Added 4 new views (Events, Insights, Settings, plus enhanced Patterns)
  * New imports: InsightsView, SettingsView, MoodHistoryChart, DreamEventLinker
  * New navigation buttons
  * New view sections
  * Updated type definitions

### Library Configuration
- `src/lib/life-events-config.ts` - (pre-existing, documented)

---

## 📊 File Statistics

### By Type:
- **API Routes:** 5 new files
- **React Components:** 8 new files  
- **Documentation:** 3 new files
- **Modified:** 1 file (page.tsx)

### Total:
- **New Files:** 16
- **Lines Added:** ~4,500+ LOC
- **API Endpoints:** 12 new endpoints

---

## 🗂️ File Purpose Reference

### Quick Lookup:

**Want to modify life events?**
→ `src/components/events/LifeEventsTimeline.tsx` (UI)
→ `src/app/api/life-events/route.ts` (API)

**Want to change analytics?**
→ `src/components/insights/InsightsView.tsx` (UI)
→ `src/app/api/insights/route.ts` (API)

**Want to update settings?**
→ `src/components/settings/SettingsView.tsx` (UI)
→ `src/app/api/settings/route.ts` (API)

**Want to modify data export?**
→ `src/app/api/export/route.ts` (API)

**Want to change mood history display?**
→ `src/components/mood/MoodHistoryChart.tsx` (UI)

**Want to modify dream-event linking?**
→ `src/components/events/DreamEventLinker.tsx` (UI)
→ `src/app/api/dream-links/route.ts` (API)

---

## 🔍 Component Dependencies

### InsightsView
- Depends on: `/api/insights`
- Uses: Recharts (LineChart, BarChart, AreaChart)
- External: None

### LifeEventsTimeline
- Depends on: `/api/life-events`, `LifeEventCard`, `LifeEventDialog`
- Uses: Category filtering, date grouping
- External: None

### SettingsView
- Depends on: `/api/settings`, `/api/export`
- Uses: Form controls, timezone selection
- External: None

### MoodHistoryChart
- Depends on: `/api/mood-logs`
- Uses: Recharts (AreaChart)
- External: None

### DreamEventLinker
- Depends on: `/api/dream-links`, `/api/life-events`
- Uses: Dialog, Badge components
- External: None

---

## 📦 Import Patterns

### Typical API Route Structure:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }
```

### Typical Component Structure:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function ComponentName({ userId }: Props) { ... }
```

---

## 🎨 UI Component Patterns

### shadcn/ui Components Used:
- Card, CardContent, CardHeader, CardTitle, CardDescription
- Button (with variants: default, outline, ghost)
- Badge (with variants: default, secondary, outline)
- Dialog, DialogContent, DialogHeader, DialogTitle
- Switch (for toggles)
- Input (text, time, date types)
- Label (for form fields)
- AlertDialog (for confirmations)

### Lucide Icons Used:
- Settings, Bell, Mail, Clock, Calendar, Save, User, Download
- Lightbulb, TrendingUp, Brain, Moon, Activity
- Plus, Edit, Trash2, X, Search, Filter
- Heart, Zap, Link2

---

## 🔗 API Endpoint Reference

### Complete API Map:

```
GET    /api/insights?userId={id}&timeRange={days}
GET    /api/settings?userId={id}
POST   /api/settings
GET    /api/export?userId={id}&format={json|csv}

GET    /api/life-events?userId={id}
POST   /api/life-events
PUT    /api/life-events/[id]
DELETE /api/life-events/[id]

GET    /api/dream-links?dreamId={id}&userId={id}
POST   /api/dream-links
DELETE /api/dream-links?dreamId={id}&lifeEventId={id}&userId={id}

GET    /api/mood-logs?userId={id}
POST   /api/mood-logs

GET    /api/dreams-supabase?userId={id}
GET    /api/dreams-supabase/patterns?userId={id}
POST   /api/interpret-dream-supabase
```

---

## 🚀 Quick Start for New Developers

1. **Start Here:** Read `WARP.md` for project overview
2. **Understand Features:** Read `PROJECT_COMPLETION_SUMMARY.md`
3. **Find Files:** Use this manifest
4. **Run Dev Server:** `npm run dev`
5. **Explore UI:** Navigate through 6 tabs in the app

---

## 📋 Testing Checklist

To test all new features:
- [ ] Create a life event (Events tab)
- [ ] Edit a life event
- [ ] Delete a life event
- [ ] Link a dream to an event (History tab)
- [ ] View insights analytics (Insights tab)
- [ ] Check mood history (Patterns tab)
- [ ] Configure settings (Settings tab)
- [ ] Export data as JSON
- [ ] Export data as CSV
- [ ] Toggle reminders on/off
- [ ] Change timezone

---

*Last Updated: 2025-11-21*
