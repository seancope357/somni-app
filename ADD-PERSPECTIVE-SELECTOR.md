# Add Perspective Selector to UI

## Overview
This guide will help you add a dropdown selector so users can choose their preferred dream interpretation perspective (Jungian, Freudian, Cognitive, or Synthesized) on the main interpretation view, while still having access to all perspectives when viewing dream details.

## Step 1: Apply Database Migration First!

**Important**: Before making UI changes, apply the database migration:

Go to Supabase Dashboard → SQL Editor → New Query, and run:
```sql
ALTER TABLE dreams 
ADD COLUMN IF NOT EXISTS jungian_analysis TEXT,
ADD COLUMN IF NOT EXISTS freudian_analysis TEXT,
ADD COLUMN IF NOT EXISTS cognitive_analysis TEXT,
ADD COLUMN IF NOT EXISTS synthesized_analysis TEXT,
ADD COLUMN IF NOT EXISTS archetypal_figures TEXT[], 
ADD COLUMN IF NOT EXISTS cognitive_patterns TEXT[],
ADD COLUMN IF NOT EXISTS wish_indicators TEXT[],
ADD COLUMN IF NOT EXISTS reflection_questions TEXT[];

CREATE INDEX IF NOT EXISTS idx_dreams_archetypal_figures ON dreams USING GIN(archetypal_figures);
CREATE INDEX IF NOT EXISTS idx_dreams_cognitive_patterns ON dreams USING GIN(cognitive_patterns);
CREATE INDEX IF NOT EXISTS idx_dreams_wish_indicators ON dreams USING GIN(wish_indicators);
```

## Step 2: Update Dream Interface

In `src/app/page.tsx`, update the `Dream` interface (around line 26):

```typescript
interface Dream {
  id: string
  content: string
  interpretation: string
  jungian_analysis?: string          // ADD
  freudian_analysis?: string         // ADD
  cognitive_analysis?: string        // ADD
  synthesized_analysis?: string      // ADD
  sleep_hours: number | null
  symbols: string[]
  emotions: string[]
  themes: string[]
  archetypal_figures?: string[]      // ADD
  cognitive_patterns?: string[]      // ADD
  wish_indicators?: string[]         // ADD
  reflection_questions?: string[]    // ADD
  created_at: string
}
```

## Step 3: Add Perspective Type and State

After the interface definitions, add:

```typescript
type PerspectiveType = 'synthesized' | 'jungian' | 'freudian' | 'cognitive'

export default function Home() {
  // ... existing state variables ...
  
  // ADD these new state variables:
  const [perspectives, setPerspectives] = useState<any>(null)
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>([])
  const [preferredPerspective, setPreferredPerspective] = useState<PerspectiveType>('synthesized')
```

## Step 4: Add Helper Functions

Add these helper functions after your state declarations:

```typescript
// Load preferred perspective from localStorage
useEffect(() => {
  const saved = localStorage.getItem('preferredPerspective')
  if (saved) {
    setPreferredPerspective(saved as PerspectiveType)
  }
}, [])

// Save preferred perspective
const updatePreferredPerspective = (perspective: PerspectiveType) => {
  setPreferredPerspective(perspective)
  localStorage.setItem('preferredPerspective', perspective)
  toast({
    title: "Preference saved",
    description: `${getPerspectiveLabel(perspective)} perspective will be shown by default.`,
  })
}

const getPerspectiveLabel = (perspective: PerspectiveType) => {
  const labels = {
    synthesized: 'Synthesized',
    jungian: 'Jungian',
    freudian: 'Freudian',
    cognitive: 'Cognitive/Evolutionary'
  }
  return labels[perspective]
}

const getPerspectiveDescription = (perspective: PerspectiveType) => {
  const descriptions = {
    synthesized: 'Integrated insights from all perspectives',
    jungian: 'Archetypes, symbols, and individuation',
    freudian: 'Wish fulfillment and unconscious desires',
    cognitive: 'Pattern recognition and threat simulation'
  }
  return descriptions[perspective]
}

const getDisplayedInterpretation = () => {
  if (!perspectives) return interpretation

  switch (preferredPerspective) {
    case 'jungian':
      return perspectives.jungian || interpretation
    case 'freudian':
      return perspectives.freudian || interpretation
    case 'cognitive':
      return perspectives.cognitive || interpretation
    case 'synthesized':
    default:
      return perspectives.synthesized || interpretation
  }
}
```

## Step 5: Update handleSubmit Function

In your `handleSubmit` function, update the response handling:

```typescript
const data = await response.json()

// REPLACE this:
// setInterpretation(data.interpretation)

// WITH this:
setInterpretation(data.interpretation)
setPerspectives(data.perspectives || null)          // ADD
setReflectionQuestions(data.reflection_questions || [])  // ADD
setMoodContext(data.moodContext)
```

## Step 6: Update Interpretation Card Header

Find the interpretation card (around line 628) and replace the CardHeader:

```typescript
<CardHeader className="pb-4">
  {/* ADD this flex container for title and selector */}
  <div className="flex items-center justify-between mb-2">
    <CardTitle className="text-2xl font-serif text-gray-800">
      {getPerspectiveLabel(preferredPerspective)}
    </CardTitle>
    
    {/* ADD Perspective Selector */}
    <select
      value={preferredPerspective}
      onChange={(e) => updatePreferredPerspective(e.target.value as PerspectiveType)}
      className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      <option value="synthesized">🔮 Synthesized</option>
      <option value="jungian">🌙 Jungian</option>
      <option value="freudian">🧠 Freudian</option>
      <option value="cognitive">🔬 Cognitive</option>
    </select>
  </div>
  
  <CardDescription className="text-center text-gray-600 font-light">
    {getPerspectiveDescription(preferredPerspective)}
  </CardDescription>
</CardHeader>
```

## Step 7: Update Interpretation Display

Replace the interpretation text display:

```typescript
{/* REPLACE this: */}
<FormattedText text={interpretation} className="text-gray-700" />

{/* WITH this: */}
<FormattedText text={getDisplayedInterpretation()} className="text-gray-700" />
```

## Step 8: Add Reflection Questions Section

After the interpretation text, ADD this section:

```typescript
{/* Reflection Questions */}
{reflectionQuestions && reflectionQuestions.length > 0 && (
  <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
    <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
      <Lightbulb className="w-4 h-4 mr-2" />
      Reflection Questions
    </h4>
    <ul className="space-y-2">
      {reflectionQuestions.map((question, i) => (
        <li key={i} className="text-sm text-gray-700 flex items-start">
          <span className="text-purple-500 mr-2">•</span>
          {question}
        </li>
      ))}
    </ul>
  </div>
)}
```

## Step 9: Update Badges Based on Perspective

Replace the static badges section with perspective-specific badges:

```typescript
<div className="mt-8 flex flex-wrap gap-2 justify-center">
  {preferredPerspective === 'jungian' && (
    <>
      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Archetypal</Badge>
      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">Symbolic</Badge>
    </>
  )}
  {preferredPerspective === 'freudian' && (
    <>
      <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">Unconscious</Badge>
      <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">Wish Fulfillment</Badge>
    </>
  )}
  {preferredPerspective === 'cognitive' && (
    <>
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Pattern Analysis</Badge>
      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Adaptive</Badge>
    </>
  )}
  {preferredPerspective === 'synthesized' && (
    <>
      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Integrated</Badge>
      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">Comprehensive</Badge>
      <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-200">Insightful</Badge>
    </>
  )}
</div>

{/* ADD hint about detailed view */}
{perspectives && (
  <div className="mt-4 text-center">
    <p className="text-xs text-gray-500">
      Click on any dream in your history to view all perspectives
    </p>
  </div>
)}
```

## Step 10: Update DreamDetailsDialog (For Full Perspective View)

The `DreamDetailsDialog` component should already show all perspectives when you click into a dream. Make sure it displays:
- All three perspective tabs
- The synthesized view
- All extracted patterns (archetypal_figures, cognitive_patterns, wish_indicators)
- Reflection questions

## Testing

1. **Test perspective selector**: 
   - Interpret a dream
   - Change perspective dropdown
   - See different interpretation
   - Refresh page - preference should persist

2. **Test detail view**:
   - Go to History
   - Click on a dream
   - Should see all perspectives in tabbed interface

3. **Test reflection questions**:
   - Should appear below interpretation
   - Should have 5 thoughtful questions

## What Users Will See

### Main Interpretation View
- Dropdown to select preferred perspective (🔮 Synthesized, 🌙 Jungian, 🧠 Freudian, 🔬 Cognitive)
- Only the selected perspective shows
- Reflection questions below interpretation
- Perspective-specific badges
- Hint that full details are available in history

### Dream Details (History Click)
- All perspectives visible in tabs
- Can compare different viewpoints
- All extracted patterns visible
- Full reflection questions list

## Summary

**Key Features:**
✅ Perspective selector dropdown on main view  
✅ User preference saved to localStorage  
✅ All perspectives available in dream details  
✅ Reflection questions displayed  
✅ Perspective-specific badges  
✅ Smooth UX with helpful hints  

**User Flow:**
1. User interprets dream → Gets all 4 perspectives
2. User selects preferred perspective from dropdown
3. Sees only their chosen perspective
4. Preference persists across sessions
5. Can view all perspectives by clicking dream in history

Now you have both:
- **Quick view**: User's preferred perspective
- **Full analysis**: All perspectives when needed
