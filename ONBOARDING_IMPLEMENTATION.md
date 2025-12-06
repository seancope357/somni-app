# DREAMONEIR Onboarding System

## Overview

The onboarding system provides a conversational, psychiatrist-style intake experience for new users. It collects comprehensive profile information to personalize dream interpretations and create a tailored user experience.

## Key Features

### 1. Conversational Interface
- Chat-based interaction with Dr. Aria Chen (AI onboarding specialist)
- Natural language processing to extract user preferences
- Progressive disclosure (one question at a time)
- Warm, professional, non-judgmental tone
- Visual progress indicator

### 2. Comprehensive Data Collection

**Basic Information:**
- Preferred name
- Communication style (direct/gentle/balanced)

**Sleep & Dream Patterns:**
- Sleep schedule (regular/irregular/shift-work)
- Typical sleep hours
- Sleep quality
- Dream recall frequency
- Dream types (vivid, fragmented, recurring, lucid, nightmares, symbolic)
- Recurring themes and symbols

**Psychological Preferences:**
- Interest in different perspectives (Jungian/Freudian/Cognitive/Synthesized)
- Comfort level with depth of analysis

**Life Context (Optional):**
- Current life transitions and events
- Relationship status
- Work situation
- Mental health context (if comfortable sharing)

**Emotional Processing:**
- Processing styles (journaling, talking, creative, physical, meditation)
- Current stress level
- Primary stressors

**Boundaries & Preferences:**
- Topics to avoid
- Notification preferences
- Privacy settings

### 3. Smart Personalization

The collected data is used to:
- Customize dream interpretation prompts with personal context
- Adjust communication tone and depth
- Respect sensitive topics and boundaries
- Tailor insights to user's goals and life situation
- Match preferred psychological perspectives

## File Structure

```
src/
├── types/
│   └── onboarding.ts                    # TypeScript interfaces
├── components/
│   └── onboarding/
│       └── OnboardingFlow.tsx           # Main onboarding component
├── contexts/
│   └── auth-context.tsx                 # Updated with onboarding status
├── app/
│   ├── page.tsx                         # Updated to show onboarding
│   └── api/
│       ├── onboarding/
│       │   └── route.ts                 # CRUD API for onboarding data
│       └── interpret-dream-supabase/
│           └── route.ts                 # Updated with personalization
```

## Database Schema

### `user_onboarding` Table

```sql
CREATE TABLE public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  preferred_name text,
  communication_style text,

  -- Goals
  primary_goals text[],

  -- Sleep patterns
  sleep_schedule text,
  typical_sleep_hours float,
  sleep_quality text,
  dream_recall_frequency text,
  dream_types text[],
  recurring_themes text[],
  recurring_symbols text[],

  -- Perspective preferences
  preferred_perspectives text[],

  -- Life context
  current_life_context text,
  major_life_events text[],

  -- Emotional processing
  emotional_processing_style text[],
  stress_level text,
  primary_stressors text[],

  -- Boundaries
  topics_to_avoid text[],
  comfort_with_depth text,

  -- Mental health
  mental_health_context text,
  therapy_experience boolean,
  meditation_practice boolean,

  -- Preferences
  notification_preference text,

  -- Metadata
  completed boolean DEFAULT false,
  completed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### `profiles` Table Update

Added `onboarding_completed` boolean flag for quick access without joins.

## Integration Points

### 1. Authentication Flow

**File:** `src/contexts/auth-context.tsx`

- Added `needsOnboarding` state
- Added `refreshOnboardingStatus()` function
- Checks onboarding status on auth state changes
- Provides onboarding status to entire app

### 2. Main App

**File:** `src/app/page.tsx`

- Shows `OnboardingFlow` component if `needsOnboarding === true`
- OnboardingFlow appears after signup before main app
- Skip functionality allows users to complete later
- Refresh status after completion

### 3. Dream Interpretation

**File:** `src/app/api/interpret-dream-supabase/route.ts`

Onboarding data is fetched and used to create personalized context:

```javascript
// Example personalization context sent to AI:
Personal Context: The dreamer prefers to be called Sarah.
Communication preference: gentle and empathetic.
Primary goals: self-discovery, find-patterns.
Current life context: Starting a new job and adjusting to city life.
Recent significant life events: work, move.
Current stress level: high.
Primary stressors: work, finance.
IMPORTANT - Topics to avoid or handle sensitively: family conflict.
Provide moderately deep analysis with some psychological exploration.
```

This context ensures:
- AI uses preferred name
- Tone matches communication preference
- Interpretations relate to current life situation
- Sensitive topics are handled appropriately
- Depth matches user's comfort level

### 4. API Routes

**File:** `src/app/api/onboarding/route.ts`

- `GET /api/onboarding?userId=xxx` - Fetch user's onboarding data
- `POST /api/onboarding` - Create/update onboarding data
- `PATCH /api/onboarding` - Partial update

## Conversation Flow

### Step 1: Welcome
- Introduces Dr. Aria Chen
- Explains purpose and privacy
- Sets expectations (8-12 minutes)
- Emphasizes voluntary participation

### Step 2: Name & Goals
- Asks for preferred name
- Explores reasons for using app
- Identifies goals (understand dreams, patterns, self-discovery, etc.)

### Step 3: Sleep Patterns
- Sleep schedule regularity
- Typical hours and quality
- Context for dream analysis

### Step 4: Dream Recall
- Frequency of remembering dreams
- Types of dreams experienced
- Recurring themes or symbols

### Step 5: Perspectives
- Introduces Jungian, Freudian, Cognitive approaches
- User selects preferred interpretation style
- Default to synthesized if unsure

### Step 6: Life Context (Optional)
- Current transitions or events
- Can skip if not comfortable
- Provides valuable context for personalization

### Step 7: Emotional Processing
- How user processes emotions
- Current stress level and sources
- Informs interpretation depth

### Step 8: Boundaries
- Topics to avoid
- Sensitivity preferences
- Creates safe space

### Step 9: Preferences
- Notification settings
- Delivery preferences
- Privacy options

### Step 10: Completion
- Summary of journey
- Confirmation message
- Saves to database
- Redirects to main app

## Natural Language Processing

The system uses simple pattern matching and keyword extraction:

```javascript
// Example: Extracting goals from free text
function extractGoals(response: string): string[] {
  const lowerResponse = response.toLowerCase()
  const goals: string[] = []

  if (lowerResponse.includes('understand')) goals.push('understand-dreams')
  if (lowerResponse.includes('pattern')) goals.push('find-patterns')
  if (lowerResponse.includes('self')) goals.push('self-discovery')
  // ... more patterns

  return goals
}
```

Similar functions exist for:
- Sleep schedules
- Dream characteristics
- Stress levels
- Processing styles
- Notification preferences

## Acknowledgment System

Each user response triggers contextual acknowledgment:

```javascript
function acknowledgeGoals(goals: string[]): string {
  if (goals.includes('self-discovery')) {
    return "The path to self-understanding is profound..."
  }
  if (goals.includes('reduce-nightmares')) {
    return "Nightmares can be distressing, but they often carry..."
  }
  // ... context-specific responses
}
```

This creates the feeling of being truly heard and understood.

## Privacy & Security

- All data encrypted in transit and at rest (Supabase)
- Row Level Security (RLS) policies ensure users only access their own data
- Topics to avoid are respected in AI prompts
- Optional fields allow users to control what they share
- Can skip entire onboarding or individual questions
- Data only used for personalization, never shared

## Future Enhancements

### Potential Improvements:
1. **Re-onboarding:** Periodic check-ins to update life context
2. **Settings Integration:** Allow editing onboarding data in Settings view
3. **Progress Saving:** Resume onboarding from where user left off
4. **Advanced NLP:** Better extraction from free-text responses
5. **Voice Input:** Allow spoken responses via Web Speech API
6. **Adaptive Questions:** Dynamic question flow based on previous answers
7. **Multilingual:** Support multiple languages
8. **Accessibility:** Enhanced screen reader support
9. **Analytics:** Track completion rates and drop-off points
10. **A/B Testing:** Optimize question phrasing and order

## Usage

### Running the Migration

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase-onboarding-migration.sql`
4. Execute the migration
5. Verify tables created with correct RLS policies

### Testing the Flow

1. Sign up with a new account
2. Onboarding should automatically appear
3. Complete the conversational flow
4. Check Supabase `user_onboarding` table for saved data
5. Interpret a dream and verify personalized context in interpretation

### Skipping Onboarding

Users can click "Skip for now" at any time:
- Onboarding can be completed later from Settings
- App functions normally without onboarding data
- Interpretations are generic without personalization

## Troubleshooting

### Onboarding doesn't appear after signup
- Check `auth-context.tsx` is properly checking onboarding status
- Verify API route `/api/onboarding` is accessible
- Check browser console for errors

### Data not saving
- Verify Supabase credentials in `.env.local`
- Check RLS policies on `user_onboarding` table
- Review API route logs for errors

### Personalization not working
- Confirm onboarding data exists in database
- Check `interpret-dream-supabase/route.ts` is fetching onboarding data
- Verify personalizationContext is being added to Groq prompt

## Code Examples

### Checking Onboarding Status

```typescript
const { needsOnboarding, refreshOnboardingStatus } = useAuth()

if (needsOnboarding) {
  // Show onboarding
} else {
  // Show main app
}
```

### Fetching Onboarding Data

```typescript
const response = await fetch(`/api/onboarding?userId=${userId}`)
const { data } = await response.json()

if (data?.completed) {
  // User has completed onboarding
}
```

### Using Onboarding Data

```typescript
const preferredName = onboardingData?.preferred_name || 'friend'
const communicationStyle = onboardingData?.communication_style || 'balanced'
const topicsToAvoid = onboardingData?.topics_to_avoid || []
```

## Conclusion

The onboarding system transforms DREAMONEIR from a generic dream interpretation tool into a personalized psychological companion. By collecting thoughtful, comprehensive user data in a compassionate way, we can provide interpretations that truly resonate with each individual's unique life situation and psychological needs.

The conversational approach, inspired by clinical intake sessions, makes data collection feel less like filling out a form and more like the beginning of a meaningful therapeutic relationship.
