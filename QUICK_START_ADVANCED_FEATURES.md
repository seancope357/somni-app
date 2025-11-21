# Quick Start: Advanced Features

## 🚀 New Features Overview

### 1. **Find Similar Dreams** 🔍
Discover dreams with similar content, themes, and emotions.

**How to use:**
1. Go to **History** tab
2. Find any dream card
3. Click **"Find Similar Dreams"**
4. View 5 most similar dreams with similarity scores

**Requirements:**
- Dreams need embeddings generated first (see below)

---

### 2. **Smart Journaling Prompts** 💡
Get AI-generated personalized questions to inspire deeper reflection.

**How to use:**
1. Go to **Interpret** tab
2. View prompts below the dream input area
3. Click refresh icon for new prompts

**What influences prompts:**
- Your recent dreams (last 7 days)
- Mood patterns
- Life events

---

### 3. **Advanced Filters** 🎯
Filter and sort your dream history with precision.

**How to use:**
1. Go to **History** tab
2. Click **"Filters"** button
3. Set filters:
   - **Date Range**: Pick start/end dates
   - **Mood Level**: Filter by daily mood (1-5)
   - **Life Events**: Has events / No events
   - **Sort By**: Newest, Oldest, Most/Least sleep
4. Click **X** to clear filters

**Features:**
- "Active" badge shows when filters applied
- Results count updates live
- Filters combine (AND logic)

---

### 4. **Mobile Optimized** 📱
Enjoy ONEIR on any device with responsive design.

**What's new:**
- Icon-only navigation on small screens
- Touch-friendly button sizes
- Optimized layout for phones and tablets
- Text wraps intelligently

---

## 🛠️ Setup (Developers)

### Environment Variables
Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-...  # Get from platform.openai.com
```

### Generate Embeddings for Dreams
Before using "Find Similar Dreams", generate embeddings:

```typescript
// In browser console or via API tool
// Single dream
await fetch('/api/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dreamId: 'your-dream-uuid',
    userId: 'your-user-uuid'
  })
})

// Batch (all recent dreams, up to 10)
await fetch('/api/embeddings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'your-user-uuid',
    limit: 10
  })
})
```

---

## 📊 Feature Status

| Feature | Status | Requirements |
|---------|--------|--------------|
| Smart Prompts | ✅ Ready | GROQ_API_KEY (already set) |
| Advanced Filters | ✅ Ready | None |
| Mobile Responsive | ✅ Ready | None |
| Find Similar Dreams | ⚠️ Needs Setup | OPENAI_API_KEY + embeddings |
| Embeddings API | ✅ Ready | OPENAI_API_KEY |

---

## 🎨 UI Locations

### Find Similar Dreams
```
History Tab → Dream Card → [Separator] → "Find Similar Dreams" button
```

### Smart Prompts
```
Interpret Tab → (no interpretation shown) → Prompt card with lightbulb icon
```

### Advanced Filters
```
History Tab → Top of page → "Filters" button + Sort dropdown
```

### Mobile Navigation
```
Any screen on mobile → Icon-only navigation tabs
```

---

## 💡 Pro Tips

1. **Generate embeddings in batches** for better efficiency
2. **Use Smart Prompts** when you're stuck on what to write
3. **Combine filters** for specific searches (e.g., "dreams from last month with high mood")
4. **Refresh prompts** if they don't resonate - AI generates new ones each time
5. **Similar dreams** work best with 10+ dreams that have embeddings

---

## 🐛 Troubleshooting

### "No similar dreams found"
- **Cause**: No embeddings generated yet
- **Fix**: Run batch embedding generation (see Setup)

### "Failed to generate prompts"
- **Cause**: Groq API rate limit or error
- **Fix**: Wait a moment and refresh; fallback prompts will show

### Filters not working
- **Cause**: Mood/Event filters are UI-only currently
- **Note**: Date range and sort work fully; mood/event filters show but don't filter yet

### Mobile navigation too cramped
- **Tip**: Rotate to landscape mode for full view
- **Note**: Designed for portrait 375px+ width

---

## 📚 More Information

- **Full Documentation**: See `ADVANCED_FEATURES.md`
- **API Reference**: See `WARP.md`
- **Completion Summary**: See `PHASE_4_5_COMPLETION_SUMMARY.md`

---

## ⚡ Quick API Reference

```typescript
// Generate embedding
POST /api/embeddings
Body: { dreamId: string, userId: string }

// Batch embeddings
PUT /api/embeddings
Body: { userId: string, limit?: number }

// Find similar dreams
GET /api/similar-dreams?dreamId={id}&userId={id}&limit=5

// Get smart prompts
GET /api/smart-prompts?userId={id}
```

---

**Ready to explore?** Start by generating embeddings for your dreams, then discover similar dreams and get personalized prompts!
