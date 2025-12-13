# Goals Management UI Design Document

## Overview
Complete goal management interface for the Goals tab in GamificationDashboard, featuring card-based layout, filtering/sorting, and comprehensive CRUD operations.

---

## Component Architecture

### 1. GoalsView Component
**Location**: `/src/components/gamification/GoalsView.tsx`

**Purpose**: Main container for the Goals tab with filtering, sorting, and goal management.

**Features**:
- Header with "Create New Goal" button and view toggle (Grid/List)
- Filter/sort controls bar
- Goals grid/list display
- Empty state when no goals
- Loading states
- Responsive layout (1/2/3 columns)

**State Management**:
```typescript
const [goals, setGoals] = useState<GoalProgress[]>([])
const [isLoading, setIsLoading] = useState(true)
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
const [filters, setFilters] = useState({
  status: 'active', // 'active' | 'completed' | 'all'
  type: 'all', // 'all' | 'dream_count' | 'mood_count' | 'journal_count' | 'custom'
})
const [sortBy, setSortBy] = useState<'progress' | 'dueDate' | 'created'>('dueDate')
const [showCreateDialog, setShowCreateDialog] = useState(false)
const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null)
```

---

### 2. GoalCard Component
**Location**: `/src/components/gamification/GoalCard.tsx`

**Purpose**: Individual goal display card with progress visualization and actions.

**Props**:
```typescript
interface GoalCardProps {
  goalProgress: GoalProgress
  viewMode?: 'grid' | 'list'
  onEdit: (goal: UserGoal) => void
  onDelete: (goalId: string) => void
  onMarkComplete: (goalId: string) => void
  onMarkAbandoned: (goalId: string) => void
}
```

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ [Icon] Title              [Status Badge]│
│                                         │
│ Description (2 lines max, truncated)    │
│                                         │
│ ████████████░░░░░░░░░░ 60% (12/20)     │
│                                         │
│ 📅 5 days remaining     [On Track]     │
│                                         │
│ [⋮ Actions Menu]                       │
└─────────────────────────────────────────┘
```

**Card Styling**:
- Glassmorphism: `bg-white/80 backdrop-blur-sm border border-white/20`
- Gradient border for legendary goals: `border-2 border-purple-400`
- Hover effects: `hover:shadow-lg hover:scale-102 transition-all duration-300`
- Status-based accent colors:
  - Active: Purple/Indigo gradient
  - Completed: Green gradient with checkmark
  - Failed: Red gradient with warning icon
  - Abandoned: Gray/muted

**Progress Bar**:
- Height: `h-3`
- Background: `bg-gray-200/50`
- Fill: Gradient based on progress:
  - 0-33%: `from-red-500 to-orange-500`
  - 34-66%: `from-yellow-500 to-amber-500`
  - 67-100%: `from-green-500 to-emerald-500`
- On Track/Behind indicator affects opacity

**Status Badges**:
```typescript
const STATUS_STYLES = {
  active: 'bg-purple-100 text-purple-700 border-purple-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  failed: 'bg-red-100 text-red-700 border-red-300',
  abandoned: 'bg-gray-100 text-gray-700 border-gray-300'
}
```

**Action Menu**:
- Dropdown menu (3-dot icon)
- Actions:
  - Edit Goal
  - Mark as Complete (if active)
  - Mark as Abandoned (if active)
  - Delete Goal (with confirmation)

---

### 3. GoalFormDialog Component
**Location**: `/src/components/gamification/GoalFormDialog.tsx`

**Purpose**: Modal form for creating/editing goals.

**Props**:
```typescript
interface GoalFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (goalData: GoalFormData) => Promise<void>
  editingGoal?: UserGoal | null
  userId: string
}

interface GoalFormData {
  title: string
  description: string
  icon: string
  goalType: GoalType
  targetValue: number
  period: GoalPeriod
  customDates?: {
    start: string
    end: string
  }
}
```

**Form Layout**:
```
┌──────────────────────────────────────────┐
│  Create New Goal                    [×] │
├──────────────────────────────────────────┤
│                                          │
│  [Icon Picker] (emoji selector)          │
│                                          │
│  Title                                   │
│  ┌────────────────────────────────────┐ │
│  │ e.g., "Dream Journal Week"         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Description (optional)                  │
│  ┌────────────────────────────────────┐ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Goal Type                               │
│  [ Dream Count ▼ ]                      │
│                                          │
│  Target Value                            │
│  [ 7 ]                                  │
│                                          │
│  Time Period                             │
│  ( ) Daily  (•) Weekly  ( ) Monthly     │
│  ( ) Custom Date Range                  │
│                                          │
│  [Custom date pickers if selected]       │
│                                          │
│  ─── OR Choose a Preset ───             │
│  [📖 Dream Week] [😊 Mood Month] ...    │
│                                          │
├──────────────────────────────────────────┤
│              [Cancel]  [Create Goal]     │
└──────────────────────────────────────────┘
```

**Presets** (from API):
- Dream Journal Week (7 dreams, weekly)
- Mood Tracking Month (30 moods, monthly)
- Weekly Reflection (5 journals, weekly)
- Dream Explorer (10 dreams, monthly)

**Validation**:
- Title: Required, 3-50 characters
- Target value: Required, > 0, ≤ 1000
- Period or custom dates: Required
- Custom dates: End must be after start

**Icon Picker**:
- Grid of common emojis:
  - Dreams: 🌙 💤 🛌 ✨ 🌟 📖 💭
  - Moods: 😊 😌 😄 💚 ❤️ 🧡 💛
  - Journals: ✍️ 📝 📓 📔 📕 🖊️
  - General: 🎯 🏆 ⭐ 🔥 💪 🎉

---

### 4. FilterSortBar Component
**Location**: Inline in GoalsView (or separate if reusable)

**Purpose**: Filtering and sorting controls.

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  Filter by Status: [Active ▼]  Type: [All ▼]            │
│  Sort by: [Due Date ▼]                                   │
└──────────────────────────────────────────────────────────┘
```

**Filter Options**:
- **Status**:
  - Active (default)
  - Completed
  - All
- **Type**:
  - All (default)
  - Dream Count
  - Mood Count
  - Journal Count
  - Custom

**Sort Options**:
- **Progress** (0-100%, ascending/descending)
- **Due Date** (soonest first, default)
- **Created Date** (newest first)

**Styling**:
- Horizontal flex layout
- Select dropdowns with shadcn Select component
- Mobile: Stack vertically

---

### 5. EmptyState Component
**Location**: Inline in GoalsView

**Purpose**: Display when no goals match filters.

**Variants**:

**No Goals at All**:
```
      🎯
  Set Your First Goal!

  Goals help you stay motivated and track
  your progress. Create your first goal to
  get started.

  [Create New Goal]
```

**No Active Goals**:
```
      ✅
  No Active Goals

  You don't have any active goals right now.
  Want to set a new challenge?

  [Create New Goal]
```

**No Matching Filters**:
```
      🔍
  No Goals Found

  No goals match your current filters.
  Try adjusting your filters or create a new goal.

  [Reset Filters]  [Create New Goal]
```

**Styling**:
- Centered layout
- Large emoji icon (text-6xl)
- Muted text colors
- CTA buttons with primary styling

---

## Responsive Grid Layout

```css
/* Grid Layout Classes */
.goals-grid {
  display: grid;
  gap: 1.5rem;
}

/* 1 column on mobile */
@media (max-width: 767px) {
  .goals-grid {
    grid-template-columns: 1fr;
  }
}

/* 2 columns on tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .goals-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 3 columns on desktop */
@media (min-width: 1024px) {
  .goals-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**List Mode**:
- Single column
- Horizontal layout for card content
- More compact vertical spacing

---

## Color Palette

**Glassmorphism Base**:
- Card background: `bg-white/80 dark:bg-gray-900/80`
- Border: `border-white/20 dark:border-gray-700/20`
- Backdrop: `backdrop-blur-sm`

**Gradients**:
- Purple/Indigo: `from-purple-600 to-indigo-600`
- Blue/Cyan: `from-blue-600 to-cyan-600`
- Green/Emerald: `from-green-600 to-emerald-600`
- Red/Orange: `from-red-600 to-orange-600`

**Status Colors**:
- Active: Purple (#9333ea)
- Completed: Green (#10b981)
- Failed: Red (#ef4444)
- Abandoned: Gray (#6b7280)

---

## Animations

**Card Hover**:
```css
transition: all 0.3s ease
hover:scale-102
hover:shadow-lg
```

**Progress Bar Fill**:
```css
transition: width 0.5s ease-in-out
```

**Dialog Enter/Exit**:
- Fade in: `animate-in fade-in-0`
- Scale: `zoom-in-95`
- Duration: 300ms

**Stagger Animation** (Grid Cards):
```typescript
style={{
  animationDelay: `${index * 50}ms`,
  animationFillMode: 'backwards'
}}
className="animate-in slide-in-from-bottom-4 fade-in-0"
```

---

## Accessibility

**Keyboard Navigation**:
- Tab through cards
- Enter to open action menu
- Arrow keys for menu navigation
- Escape to close dialogs

**ARIA Labels**:
```tsx
<button aria-label="Create new goal">
<div role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}>
<select aria-label="Filter by status">
```

**Focus States**:
- Visible focus rings: `focus-visible:ring-2 focus-visible:ring-purple-500`
- High contrast mode support

**Screen Reader Support**:
- Announce progress percentage
- Announce status changes
- Live regions for dynamic updates

---

## API Integration

**Fetch Goals**:
```typescript
const fetchGoals = async () => {
  const response = await fetch(
    `/api/gamification/goals?userId=${userId}&status=${filters.status}`
  )
  const data = await response.json()
  return data.goals // GoalProgress[]
}
```

**Create Goal**:
```typescript
const createGoal = async (goalData: GoalFormData) => {
  const response = await fetch('/api/gamification/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...goalData })
  })
  return response.json()
}
```

**Update Goal**:
```typescript
const updateGoal = async (goalId: string, updates: Partial<UserGoal>) => {
  const response = await fetch('/api/gamification/goals', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, goalId, updates })
  })
  return response.json()
}
```

**Delete Goal**:
```typescript
const deleteGoal = async (goalId: string) => {
  const response = await fetch(
    `/api/gamification/goals?userId=${userId}&goalId=${goalId}`,
    { method: 'DELETE' }
  )
  return response.json()
}
```

---

## Integration with GamificationDashboard

**In GamificationDashboard.tsx**:

1. Import GoalsView:
```typescript
import GoalsView from './GoalsView'
```

2. Replace Goals TabsContent (lines 329-342):
```tsx
<TabsContent value="goals">
  <GoalsView userId={userId} />
</TabsContent>
```

3. No additional props needed - GoalsView is self-contained

---

## Performance Optimizations

**Lazy Loading**:
- Load goals on tab switch (not on initial dashboard mount)
- Use React.lazy for dialog components

**Memoization**:
```typescript
const filteredGoals = useMemo(() => {
  return goals
    .filter(g => filters.status === 'all' || g.goal.status === filters.status)
    .filter(g => filters.type === 'all' || g.goal.goal_type === filters.type)
    .sort((a, b) => {
      switch (sortBy) {
        case 'progress': return b.progress_percentage - a.progress_percentage
        case 'dueDate': return new Date(a.goal.end_date).getTime() - new Date(b.goal.end_date).getTime()
        case 'created': return new Date(b.goal.created_at).getTime() - new Date(a.goal.created_at).getTime()
        default: return 0
      }
    })
}, [goals, filters, sortBy])
```

**Debounced Search** (future enhancement):
```typescript
const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useMemo(() => debounce(setSearchTerm, 300), [])
```

---

## Testing Checklist

- [ ] Create goal with all field types
- [ ] Edit existing goal
- [ ] Delete goal (with confirmation)
- [ ] Mark goal as complete
- [ ] Mark goal as abandoned
- [ ] Filter by status (Active/Completed/All)
- [ ] Filter by type (Dreams/Moods/Journals/Custom/All)
- [ ] Sort by progress/due date/created date
- [ ] Toggle grid/list view
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] Empty states display correctly
- [ ] Progress bars animate smoothly
- [ ] Keyboard navigation works
- [ ] Screen reader announces updates
- [ ] Error handling for API failures
- [ ] Loading states display correctly

---

## Future Enhancements

1. **Search Bar**: Text search across goal titles/descriptions
2. **Bulk Actions**: Select multiple goals to delete/complete
3. **Goal Templates**: More preset templates with customization
4. **Goal Streaks**: Track consecutive days meeting daily goals
5. **Goal Sharing**: Share goals with friends (social feature)
6. **Goal Reminders**: Notifications when falling behind
7. **Goal Analytics**: Charts showing goal completion rates over time
8. **Sub-goals**: Break down large goals into smaller milestones
9. **Goal Categories**: Custom user-defined categories
10. **Export Goals**: Export goals to CSV/PDF

---

## File Structure

```
src/components/gamification/
├── GamificationDashboard.tsx (existing - update line 329-342)
├── GoalsView.tsx (NEW)
├── GoalCard.tsx (NEW)
├── GoalFormDialog.tsx (NEW)
├── AchievementCard.tsx (existing - for reference)
└── StreakCounter.tsx (existing - for reference)
```

---

## Implementation Priority

1. **Phase 1** (Core Functionality):
   - GoalCard component
   - GoalsView container with grid layout
   - Basic filtering (status only)
   - Empty state

2. **Phase 2** (Enhanced UX):
   - GoalFormDialog
   - Full CRUD operations
   - Type filtering and sorting
   - Action menu

3. **Phase 3** (Polish):
   - Grid/List toggle
   - Animations and transitions
   - Accessibility enhancements
   - Loading/error states

4. **Phase 4** (Advanced):
   - Search functionality
   - Preset templates
   - Performance optimizations
   - Analytics
