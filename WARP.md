# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev          # Development server with nodemon on port 3000 (logs to dev.log)
npm run build        # Production build with Next.js standalone output
npm start            # Production server from standalone build (logs to server.log)
npm run lint         # ESLint checking
```

### Database (Prisma)
```bash
npm run db:push      # Push Prisma schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run Prisma migrations
npm run db:reset     # Reset database
```

**Note**: While Prisma is configured, this project primarily uses Supabase directly via the `@supabase/supabase-js` client.

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and TypeScript
- **UI Pattern**: Single-page application with main UI in `src/app/page.tsx`
- **Backend**: Supabase (PostgreSQL) for database and authentication
- **AI**: Groq API with Llama 3.3 70B (via `groq-sdk`) for dream interpretation
- **Components**: shadcn/ui with Tailwind CSS
- **Path Alias**: `@/*` maps to `src/*`

### Directory Structure
- `src/app/page.tsx` - Main application UI (single-page dream interpretation interface)
- `src/app/api/` - Next.js API routes (server-side handlers)
- `src/components/` - React components including shadcn/ui components
- `src/contexts/` - React context providers (auth state management)
- `src/lib/` - Utility libraries and Supabase client
- `src/hooks/` - Custom React hooks

## Database Schema

### Core Tables
- **profiles** - User profiles linked to Supabase Auth (`auth.users`)
- **dreams** - Dream entries with AI interpretations
  - Fields: `content`, `interpretation`, `sleep_hours`, `symbols[]`, `emotions[]`, `themes[]`, `mood_log_id`
- **mood_logs** - Daily mood tracking (mood, stress, energy levels 1-5)
  - Unique constraint on `(user_id, log_date)`
- **life_events** - Significant life events with categories and intensity
- **dream_life_events** - Join table linking dreams to life events
- **user_settings** - User preferences and notification settings
- **dream_embeddings** - Vector embeddings for dreams (vector dimension 1536)

### Security
- Row Level Security (RLS) enabled on all user tables
- Policies enforce `auth.uid() = user_id` for all operations
- Schema files: `supabase-schema.sql` and `supabase-complete-migration.sql`

## Key API Routes

All API routes use `SUPABASE_SERVICE_ROLE_KEY` for privileged server-side queries:

- `POST /api/interpret-dream-supabase` - AI dream interpretation with Groq
- `GET /api/dreams-supabase?userId={id}` - Fetch user's dream history
- `GET /api/dreams-supabase/patterns?userId={id}` - Analyze patterns across dreams
- `GET/POST /api/mood-logs` - Mood tracking endpoints
- `GET/POST /api/life-events` - Life events management

Most routes specify `export const runtime = 'nodejs'` for Groq SDK compatibility.

## Environment Variables

### Client-side (prefixed with NEXT_PUBLIC_)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Server-side only
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (privileged access)
- `GROQ_API_KEY` - Groq API key for AI interpretation

## Development Notes

### Next.js Configuration
- `next.config.ts` uses `output: 'standalone'` for Vercel deployment
- TypeScript and ESLint errors ignored during builds (`ignoreBuildErrors: true`)
- Webpack hot reload disabled in dev; nodemon handles restarts by watching `src/`

### TypeScript
- `strict: true` with `noImplicitAny: false` in `tsconfig.json`
- Target: ES2017

### Authentication
- Auth state managed via `AuthProvider` in `src/contexts/auth-context.tsx`
- Supabase client (`src/lib/supabase.ts`) includes mock fallback when environment variables not configured

### Development Server
- Uses nodemon to watch `src/` directory for changes
- Runs on port 3000
- Output redirected to `dev.log`

## Important Implementation Details

### AI Dream Interpretation
- Model: `llama-3.3-70b-versatile`
- Temperature: `0.7`
- Max tokens: `2000`
- System prompt includes sleep context and mood context when available
- Response format: Text interpretation followed by JSON with `{symbols: [], emotions: [], themes: []}`

### Dream-Mood Integration
- Before interpreting a dream, fetches today's mood log for the user
- Mood context (mood, stress, energy levels) incorporated into AI prompt
- Saved dreams link to mood log via `mood_log_id` foreign key

### Pattern Analysis
- Aggregates symbols, emotions, and themes across all user dreams
- Calculates sleep statistics (average, min, max)
- Tracks dream frequency (this week, this month)
- Returns top 10 most common patterns

### Speech Recognition
- Uses Web Speech API (`webkitSpeechRecognition` or `SpeechRecognition`)
- Configured for English (en-US), non-continuous mode
