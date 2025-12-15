# Sleep Dashboard Component

## Overview
A comprehensive sleep tracking dashboard component that allows users to log sleep data, view trends, track streaks, and analyze correlations with mood and dreams.

## File Location
`/home/user/somni-app/src/components/sleep/SleepDashboard.tsx`

## Usage

```tsx
import SleepDashboard from '@/components/sleep/SleepDashboard'

function MyPage() {
  const userId = "user-id-here" // Get from auth context

  return <SleepDashboard userId={userId} />
}
```

## Features Implemented

### 1. Sleep Log Form Section
- **Date Picker**: Calendar popover to select log date (defaults to today)
- **Sleep Duration Input**: Slider (0-12 hours) with number input for precise control
- **Sleep Quality Slider**: 1-5 rating with emoji indicators (😫 to 😴)
- **Restfulness Slider**: 1-5 rating with emoji indicators (🥱 to ✨)
- **Real-time Score Preview**: Calculates and displays score/grade as user types
- **Optional Fields** (Collapsible):
  - Bedtime (time picker)
  - Wake time (time picker)
  - Interruptions (number input)
  - Notes (textarea)
- **Submit Button**: Shows loading state and edit mode
- **XP Reward Notification**: Displays gamification rewards on successful submission

### 2. Current Stats Card
- **Today's Sleep Display**:
  - Large score display (0-100)
  - Letter grade (A+ to F)
  - Duration and quality summary
  - Trend indicator (up/down from average)
- **Empty State**: Shows when no log exists for today

### 3. Weekly Trend Chart
- **7-Day Line/Area Chart** using recharts:
  - Sleep score (0-100) on left Y-axis with gradient area fill
  - Sleep duration (hours) on right Y-axis as line
  - Sleep quality as semi-transparent bars
  - Interactive tooltip with formatted data
  - Responsive container

### 4. Sleep Streaks
- **Current Streak Display**:
  - Large streak count with fire emoji
  - Progress bar comparing to longest streak
  - Best streak record
  - Gradient styling matching gamification theme

### 5. Correlations Section
- **Sleep-Mood Correlation Card**:
  - Percentage display
  - Strength interpretation (strong/moderate/weak)
  - Visual progress bar
  - Insight text
- **Sleep-Dream Correlation Card**:
  - Similar layout to mood correlation
  - Dream quality analysis
  - Visual indicators

### 6. Recent Logs List
- **Last 5 Sleep Entries**:
  - Date, score, grade display
  - Duration and quality with emojis
  - Notes preview (truncated)
  - Edit and delete buttons
  - Hover effects

### 7. Average Stats Card
- Displays:
  - Average sleep score
  - Average duration
  - Average quality
  - Total logs count

## Sleep Score Calculation

The component uses a weighted scoring algorithm:

```typescript
// Optimal sleep: 7-9 hours (40 points max)
// Quality: 1-5 rating (40 points max)
// Restfulness: 1-5 rating (20 points max)
// Total: 0-100 points

Score = Duration Score (40%) + Quality Score (40%) + Restfulness Score (20%)
```

### Grade System
- **A+**: 90-100
- **A**: 80-89
- **B**: 70-79
- **C**: 60-69
- **D**: 50-59
- **F**: 0-49

## API Endpoints Required

The component expects these endpoints to exist:

### GET `/api/sleep-logs?userId={userId}`
Returns array of sleep log objects:
```typescript
{
  id: string
  user_id: string
  log_date: string // YYYY-MM-DD
  sleep_hours: number
  sleep_quality: number // 1-5
  restfulness: number // 1-5
  bedtime?: string
  wake_time?: string
  interruptions?: number
  notes?: string
  sleep_score: number
  sleep_grade: string
  created_at: string
}[]
```

### POST `/api/sleep-logs`
Create new sleep log. Body:
```typescript
{
  userId: string
  logDate: string
  sleepHours: number
  sleepQuality: number
  restfulness: number
  bedtime?: string
  wakeTime?: string
  interruptions?: number
  notes?: string
}
```

Response:
```typescript
{
  sleep_score: number
  sleep_grade: string
  xp_earned?: number
}
```

### PUT `/api/sleep-logs`
Update existing sleep log. Same body as POST plus:
```typescript
{
  id: string
  // ... rest of fields
}
```

### DELETE `/api/sleep-logs?id={id}&userId={userId}`
Delete sleep log

### GET `/api/sleep-analytics?userId={userId}`
Returns analytics object:
```typescript
{
  average_score: number
  average_duration: number
  average_quality: number
  total_logs: number
  current_streak: number
  longest_streak: number
  mood_correlation?: number // 0-1
  dream_correlation?: number // 0-1
  trend_7_days: 'up' | 'down' | 'stable'
}
```

## Dependencies

All dependencies are already installed in the project:
- `recharts` - For charts
- `date-fns` - For date formatting
- `lucide-react` - For icons
- `@radix-ui/*` - For UI primitives (via shadcn/ui)

## Styling

The component uses:
- **Tailwind CSS** classes matching the existing design system
- **Gradient backgrounds**: Purple/Indigo/Pink theme
- **Glassmorphism**: Consistent with main app design
- **Responsive layout**: Grid system adapts to screen sizes
- **Dark text on light cards**: Following project patterns

## Integration with Gamification

The component integrates with the gamification system:
- Toast notifications show XP rewards after logging sleep
- Similar streak display pattern as GamificationDashboard
- Consistent card and badge styling
- Similar loading states and animations

## State Management

- Uses React `useState` and `useEffect` hooks
- No global state management
- Simple fetch-based data loading
- Manual refresh after mutations (matching project pattern)

## Loading States

- Initial page load: Animated skeleton with pulse effect
- Form submission: Loading spinner on button with disabled state
- Empty states: Helpful messages with icons

## Error Handling

- Toast notifications for errors using `use-toast` hook
- Try-catch blocks around all API calls
- User-friendly error messages
- Graceful degradation when data unavailable

## Responsive Design

- **Mobile**: Single column layout
- **Desktop**: Multi-column grid (form on left, stats on right)
- **Charts**: Responsive containers that adapt to screen width
- **Touch-friendly**: Large tap targets for mobile users
