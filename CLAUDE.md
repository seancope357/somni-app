# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DREAMONEIR is an AI-powered dream interpretation and journaling application. It provides multi-perspective psychological analysis of dreams using Jungian, Freudian, Cognitive/Evolutionary, and Synthesized approaches via the Groq API (Llama 3.3 70B). The app includes mood tracking, life event correlation, journal entries, and pattern analysis features.

**Tech Stack**: Next.js 15, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Groq AI, shadcn/ui

## Development Commands

### Running the App
```bash
npm run dev              # Start development server on port 3000 with nodemon
npm run build           # Build for production (standalone output)
npm run start           # Start production server
npm run lint            # Run ESLint
```

### Database Commands
```bash
npm run db:push         # Push Prisma schema to database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run Prisma migrations
npm run db:reset        # Reset database
```

**Note**: The project uses **both Prisma and Supabase**. Prisma schema exists (`prisma/schema.prisma` with SQLite) but the production app uses Supabase (PostgreSQL). Database migrations should be applied via Supabase Dashboard SQL Editor, not Prisma.

### Build Configuration
- **Output**: Standalone mode (`next.config.ts` sets `output: "standalone"`)
- **TypeScript/ESLint**: Build errors are ignored (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`)
- **Dev Server**: Uses nodemon for auto-restart; webpack HMR is disabled
- **Import Aliases**: `@/*` maps to `./src/*`

## Architecture

### Authentication Flow
- **Auth Provider**: Supabase Auth via `@/contexts/auth-context` (React Context)
- **Protected Routes**: Main app requires authentication; shows `AuthForm` component when unauthenticated
- **Mock Client**: Falls back to mock Supabase client when env vars not configured (`@/lib/supabase`)

### Database Schema (Supabase)

**Key Tables**:
- `profiles` - User profiles linked to `auth.users`
- `dreams` - Dream entries with multi-perspective interpretations
  - Core fields: `content`, `interpretation`, `sleep_hours`
  - Arrays: `symbols[]`, `emotions[]`, `themes[]`, `archetypal_figures[]`, `cognitive_patterns[]`, `wish_indicators[]`, `reflection_questions[]`
  - Perspective fields: `jungian_analysis`, `freudian_analysis`, `cognitive_analysis`, `synthesized_analysis`
  - Relations: `mood_log_id` (links to mood on interpretation day)
- `mood_logs` - Daily mood tracking (`mood`, `stress`, `energy`, `notes`)
- `life_events` - Significant life events for correlation with dreams
- `journal_entries` - General journal entries (separate from dreams)
- `dream_links` - Many-to-many relation between dreams and life events

**Row Level Security (RLS)**: All tables use RLS. Users can only access their own data via `auth.uid() = user_id` policies.

### API Routes

**Dream Interpretation** (`/api/interpret-dream-supabase`):
- **Runtime**: Node.js (required for Groq SDK)
- **Flow**:
  1. Validates `dream`, `userId`, `sleepHours`, `saveToHistory`
  2. Fetches today's mood log for context
  3. Calls Groq API with multi-perspective system prompt
  4. Parses response into 4 perspectives + patterns + reflection questions
  5. Saves to `dreams` table if `saveToHistory=true`
  6. Links with `mood_log_id` if mood exists for today
- **Response**: Returns all perspectives, patterns, reflection questions, and mood context

**Other Routes**:
- `/api/dreams-supabase` - CRUD for dreams (GET, POST)
- `/api/dreams-supabase/patterns` - Aggregate pattern analysis across user's dreams
- `/api/journal` - Journal entry CRUD
- `/api/mood-logs` - Mood tracking CRUD
- `/api/life-events` - Life event CRUD
- `/api/dream-links` - Link dreams to life events
- `/api/similar-dreams` - Find similar dreams via semantic search
- `/api/insights` - Generate AI insights from dream/mood/event data
- `/api/smart-prompts` - Context-aware dream prompts
- `/api/export` - Export user data (dreams, moods, events)

### Frontend Structure

**Main Page** (`src/app/page.tsx`):
- Single-page app with view switching: `interpret`, `history`, `patterns`, `journal`, `events`, `insights`, `settings`
- **State Management**: React useState for local state; no global state library
- **Perspective Selector**: User preference stored in `localStorage` (`preferredPerspective`)
- **Components**:
  - `TodayMoodWidget` - Quick mood log entry
  - `SmartPrompts` - AI-generated dream prompts based on history
  - `HistoryFilters` - Filter dreams by date, mood, events, sleep hours
  - `DreamDetailsDialog` - Modal showing full dream with all perspectives
  - `SimilarDreams` - Shows related dreams
  - `DreamEventLinker` - Link dreams to life events
  - `LifeEventsTimeline` - Timeline view of life events
  - `JournalView` - Journal entry management
  - `InsightsView` - AI-generated insights
  - `MoodHistoryChart` - Mood trends over time
  - `SettingsView` - User settings and data export

**UI Components** (`src/components/ui/*`):
- Built with shadcn/ui (Radix UI primitives)
- Custom `FormattedText` component for rendering markdown-like text

**Styling**:
- Tailwind CSS 4 with custom config
- Glassmorphism design with gradient backgrounds
- Color scheme: Purple/Indigo/Pink on dark slate background

## Environment Variables

Required for production:

```env
# Supabase (PostgreSQL database + Auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq AI (Dream interpretation)
GROQ_API_KEY=your_groq_api_key
```

**Fallback Behavior**: App shows setup instructions if Supabase vars missing; mock client prevents crashes.

## Multi-Perspective Dream Analysis

The core feature is multi-perspective dream interpretation based on three psychological schools:

1. **Jungian**: Archetypes (Shadow, Anima/Animus, Self, Hero), collective unconscious, individuation
2. **Freudian**: Wish fulfillment, manifest vs. latent content, unconscious conflicts
3. **Cognitive/Evolutionary**: Threat simulation, memory consolidation, problem-solving
4. **Synthesized**: Integration of all three perspectives

**Implementation Details**:
- Groq prompt in `/api/interpret-dream-supabase/route.ts` lines 117-206
- Response parser extracts each perspective using regex pattern matching
- UI allows switching between perspectives via dropdown
- All perspectives saved to database for historical viewing

## Important Patterns

### Error Handling
- API routes return specific error messages with appropriate status codes
- Frontend uses `toast` from `@/hooks/use-toast` for user notifications
- TypeScript strict mode disabled (`noImplicitAny: false`)

### Data Fetching
- No data fetching library (no React Query/SWR on client side, though `@tanstack/react-query` is installed)
- Simple `fetch()` calls in useEffect hooks
- Manual refresh after mutations (e.g., `fetchDreams()` after save)

### Speech Recognition
- Uses browser Web Speech API (`webkitSpeechRecognition`)
- Fallback to manual input if not supported
- Non-continuous, single-shot recording

### Date Handling
- Uses `date-fns` library
- Dates stored in ISO format (`YYYY-MM-DD`)
- Today's date used for linking dreams to mood logs

## Database Migration Strategy

**Critical**: Supabase schema changes must be applied manually via SQL Editor in Supabase Dashboard, NOT via Prisma migrations.

**Existing Migrations**:
- Base schema: `supabase-schema.sql`
- Complete migration: `supabase-complete-migration.sql`
- Multi-perspective fields: Check `IMPLEMENTATION-STATUS.md` for migration status

## Testing & Quality

- No formal test suite
- Manual testing recommended for:
  - Dream interpretation flow (all 4 perspectives)
  - Perspective selector persistence
  - Mood log integration
  - Life event linking
  - Pattern analysis
  - Data export

## Common Development Tasks

### Adding a New View to Main Page
1. Add view type to `currentView` state type union
2. Create view component in `src/components/`
3. Add navigation button with icon to nav bar
4. Add conditional rendering block in main page

### Extending Dream Analysis
1. Update Groq system prompt in `/api/interpret-dream-supabase/route.ts`
2. Modify `parseInterpretationResponse()` to extract new data
3. Update Supabase schema to store new fields
4. Update `Dream` interface in `page.tsx`
5. Update UI to display new data

### Adding New API Route
1. Create `route.ts` in `src/app/api/[name]/`
2. Export async functions: `GET`, `POST`, `PUT`, `DELETE`
3. Use `NextResponse.json()` for responses
4. Validate `userId` from request for authenticated endpoints
5. Use Supabase client with service role key for DB operations

## Documentation Files

- `README.md` - Setup instructions and basic overview
- `IMPLEMENTATION-STATUS.md` - Multi-perspective feature implementation details
- `dream-interpretation-knowledge-base.md` - Academic foundation for dream analysis
- `SUPABASE_SETUP.md` - Database setup guide
- `DEPLOYMENT.md` - Vercel deployment instructions
- `FEATURES_IMPLEMENTATION_GUIDE.md` - Feature development guide
- `PROJECT_COMPLETION_SUMMARY.md` - Project milestone summary

## Known Issues & Considerations

1. **Prisma vs Supabase**: Project has both; Supabase is the source of truth
2. **Build Warnings Ignored**: TypeScript/ESLint errors suppressed in production builds
3. **No Test Coverage**: Manual testing required
4. **Mock Supabase Client**: Returns empty data when env vars missing (development safety)
5. **Nodemon Dev Server**: Custom dev script uses nodemon instead of Next.js HMR

## Performance Notes

- Dream interpretation: 5-8 seconds (Groq API call)
- Token usage: ~2,500 tokens per interpretation
- Standalone build copies static files manually to `.next/standalone/`
