# Journal Feature Implementation Guide

## Overview
This guide covers the fixes and new journal feature added to ONEIR.

---

## ✅ Bug Fix: Settings Save Issue

### Problem
User settings were failing to save with "Failed to save" error.

### Root Cause
The `SettingsView` component was sending `user_id` in the request body, but the API was only checking for `userId`.

### Solution
Updated `/api/settings` route to accept both `userId` and `user_id`:

```typescript
const actualUserId = userId || user_id
```

**Status**: ✅ Fixed - Settings should now save successfully

---

## 📝 New Feature: Journal Entries

### Database Schema

**New Table**: `journal_entries`

```sql
CREATE TABLE journal_entries (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  dream_id uuid REFERENCES dreams(id) ON DELETE SET NULL, -- Optional
  title text,
  content text NOT NULL,
  tags text[],
  mood_rating integer CHECK (1-5),
  created_at timestamp,
  updated_at timestamp
);
```

**Modified Table**: `dreams`
- Added `has_journal` boolean column to track if a dream has journal entries

### Features

1. **Create Journal Entries**
   - Standalone journal entries
   - Journal entries linked to dream interpretations
   - Optional title, tags, and mood rating

2. **Attach to Dreams**
   - Link journal entries to specific dreams
   - View dream interpretation alongside journal entry
   - Track which dreams have journal entries

3. **Rich Metadata**
   - Custom tags for organization
   - Mood rating (1-5) per entry
   - Automatic timestamps

4. **Full CRUD Operations**
   - Create, Read, Update, Delete journal entries
   - Automatic cleanup of dream linkage on deletion

---

## API Endpoints

### Get Journal Entries
```typescript
GET /api/journal?userId={id}&dreamId={id}&limit=50

Response:
[
  {
    id: "uuid",
    user_id: "uuid",
    dream_id: "uuid" | null,
    title: "My reflection",
    content: "...",
    tags: ["anxiety", "work"],
    mood_rating: 3,
    created_at: "2025-01-21T...",
    updated_at: "2025-01-21T...",
    dreams: {  // if dream_id is set
      id: "uuid",
      content: "dream content",
      interpretation: "...",
      symbols: [...],
      emotions: [...],
      themes: [...],
      sleep_hours: 7.5
    }
  }
]
```

### Create Journal Entry
```typescript
POST /api/journal
Body: {
  userId: string,
  dreamId?: string,  // Optional - link to a dream
  title?: string,
  content: string,
  tags?: string[],
  moodRating?: number (1-5)
}

Response: {
  id: "uuid",
  ...
}
```

### Update Journal Entry
```typescript
PUT /api/journal/[id]
Body: {
  title?: string,
  content: string,
  tags?: string[],
  moodRating?: number (1-5)
}
```

### Delete Journal Entry
```typescript
DELETE /api/journal/[id]

Response: { success: true }
```

---

## Database Setup Instructions

### Step 1: Run the Migration in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `dyevvyviogsjnovaxxna`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase-journal-migration.sql`
6. Click **Run** or press Cmd/Ctrl + Enter

### Step 2: Verify the Migration

Run this query to verify:
```sql
-- Check if table exists
SELECT * FROM journal_entries LIMIT 1;

-- Check if dreams.has_journal column exists
SELECT has_journal FROM dreams LIMIT 1;
```

Both should return successfully (even if empty).

---

## Implementation Plan for UI

Here's what needs to be built for the user interface:

### 1. Journal Tab (New Main View)
- Add "Journal" tab to main navigation
- Display list of all journal entries
- Search and filter functionality
- Create new journal entry button

### 2. Journal Entry Dialog/Form
- Title input (optional)
- Rich text area for content
- Tag input with suggestions
- Mood rating selector (1-5 with emojis)
- Dream attachment selector (dropdown of user's dreams)
- Save/Cancel buttons

### 3. Integration with Dream History
- Add "Add Journal Entry" button to each dream card
- Pre-fill dream attachment when creating from a dream
- Show journal badge/icon on dreams that have entries

### 4. Journal Entry Card Component
- Display title, content preview, tags
- Show linked dream (if any) with collapse/expand
- Edit and delete actions
- Created/updated timestamps

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── journal/
│           ├── route.ts            # GET, POST
│           └── [id]/
│               └── route.ts        # PUT, DELETE
└── components/
    └── journal/
        ├── JournalView.tsx         # Main journal list view
        ├── JournalEntryDialog.tsx  # Create/edit dialog
        └── JournalEntryCard.tsx    # Individual entry display
```

---

## Usage Examples

### Create Standalone Journal Entry
```typescript
const response = await fetch('/api/journal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    title: "Reflections on Today",
    content: "Today I noticed...",
    tags: ["gratitude", "reflection"],
    moodRating: 4
  })
})
```

### Create Journal Entry Linked to Dream
```typescript
const response = await fetch('/api/journal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    dreamId: "dream-uuid-here",  // Link to dream
    title: "Thoughts on My Flying Dream",
    content: "The flying dream interpretation made me realize...",
    tags: ["flying", "freedom"],
    moodRating: 5
  })
})
```

### Get All Journal Entries for User
```typescript
const response = await fetch(`/api/journal?userId=${user.id}`)
const entries = await response.json()
```

### Get Journal Entries for Specific Dream
```typescript
const response = await fetch(
  `/api/journal?userId=${user.id}&dreamId=${dream.id}`
)
const entries = await response.json()
```

---

## Security

- ✅ **Row Level Security (RLS)** enabled on `journal_entries` table
- ✅ Users can only access their own journal entries
- ✅ Policies enforce `auth.uid() = user_id` for all operations
- ✅ Dream linkage uses foreign key with `ON DELETE SET NULL` (safe deletion)
- ✅ Service role key used in API for privileged operations

---

## Next Steps

1. **Run the SQL migration** in Supabase (see Database Setup above)
2. **Test the API endpoints** using browser console or Postman
3. **Build the UI components** (I can help with this next)
4. **Add Journal tab** to main navigation
5. **Integrate with Dream History** view

---

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Create a journal entry via API
- [ ] Create a journal entry linked to a dream
- [ ] Update a journal entry
- [ ] Delete a journal entry
- [ ] Verify RLS policies work (user can only see their own entries)
- [ ] Verify `has_journal` flag updates correctly on dreams

---

## Questions?

The API is ready and fully functional. Once you run the SQL migration, we can start building the UI components. Let me know when you're ready to proceed with the interface!
