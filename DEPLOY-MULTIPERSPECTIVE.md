# Deploy Multi-Perspective Dream Interpretation

## Quick Start Guide

Follow these steps to implement the multi-perspective dream interpretation feature.

---

## Step 1: Run Database Migration

First, apply the database schema changes to Supabase.

### Option A: Using Supabase CLI (Recommended)
```bash
# Apply migration
supabase db push

# Or if using migration files
supabase migration up
```

### Option B: Manual (Supabase Dashboard)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste contents from `supabase/migrations/add_multiperspective_fields.sql`
4. Run the migration

### Verify Migration
Run this query in Supabase SQL Editor to verify:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dreams' 
  AND column_name IN (
    'jungian_analysis',
    'freudian_analysis', 
    'cognitive_analysis',
    'synthesized_analysis',
    'archetypal_figures',
    'cognitive_patterns',
    'wish_indicators',
    'reflection_questions'
  );
```

You should see 8 new columns.

---

## Step 2: Replace API Route

### Backup Current Route
```bash
cp src/app/api/interpret-dream-supabase/route.ts src/app/api/interpret-dream-supabase/route.ts.backup
```

### Replace with New Version
```bash
cp src/app/api/interpret-dream-supabase/route-multiperspective.ts src/app/api/interpret-dream-supabase/route.ts
```

### Or Manually
Open `src/app/api/interpret-dream-supabase/route.ts` and replace its contents with the code from `route-multiperspective.ts`.

---

## Step 3: Test Locally

```bash
npm run dev
```

### Test the API
1. Log in to your app
2. Try interpreting a dream
3. Check the console logs for:
   - "Multi-Perspective Dream Interpretation Request Started"
   - "Groq response received, parsing..."
   - "Dream saved successfully"

### Verify Database
Check Supabase dashboard to see if the new fields are populated:
```sql
SELECT 
  content,
  jungian_analysis IS NOT NULL as has_jungian,
  freudian_analysis IS NOT NULL as has_freudian,
  cognitive_analysis IS NOT NULL as has_cognitive,
  synthesized_analysis IS NOT NULL as has_synthesized
FROM dreams 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## Step 4: Update Frontend (Optional for MVP)

The current API returns all perspectives, but you may want to create a UI to display them nicely.

### Quick Fix (Minimal Changes)
The API now returns:
- `interpretation` - Contains synthesized analysis (backward compatible)
- `perspectives` - Object with all four perspectives
- `patterns` - Enhanced with new fields
- `reflection_questions` - Array of questions

Your existing UI will continue to work since we return the synthesized analysis as the main `interpretation`.

### Enhanced UI (Future)
When ready, implement the tabbed interface from `implementation-guide.md` to show all perspectives.

---

## Step 5: Monitor & Test

### Key Metrics to Watch

1. **API Response Time**
   - Should be slightly longer (more tokens)
   - Typically 3-8 seconds with Groq

2. **Token Usage**
   - Increased from ~1500 to ~2500 tokens per interpretation
   - Monitor your Groq API usage

3. **Quality Check**
   - Review a few interpretations manually
   - Ensure all three perspectives are distinct
   - Verify synthesis integrates insights properly

### Test Cases

**Simple Dream**
```
"I was flying over my childhood home"
```

**Complex Dream**
```
"I was being chased through a dark forest by a shadow figure. I reached a river and saw my reflection, but it wasn't me - it was an older version of myself. The shadow caught up and we merged together."
```

**Nightmare**
```
"I was trapped in a burning building and couldn't find the exit. People I knew were screaming but I couldn't reach them."
```

---

## Step 6: Deploy to Production

### If Using Vercel

```bash
# Commit changes
git add .
git commit -m "Add multi-perspective dream interpretation"

# Push to deploy
git push origin main
```

Vercel will automatically deploy. Monitor the deployment logs.

### If Using Other Platform

Follow your platform's deployment process. Ensure:
- Environment variables are set (GROQ_API_KEY, etc.)
- Database migration has been applied to production Supabase
- Node.js runtime is configured

---

## Rollback Plan

If something goes wrong:

### 1. Restore API Route
```bash
cp src/app/api/interpret-dream-supabase/route.ts.backup src/app/api/interpret-dream-supabase/route.ts
```

### 2. The Database Changes Are Safe
The new columns are optional (allow NULL), so the old code will continue to work even with the new schema. No rollback needed.

### 3. Redeploy
```bash
git add .
git commit -m "Rollback to single-perspective interpretation"
git push origin main
```

---

## Troubleshooting

### Issue: JSON Parsing Errors

**Symptom**: Dreams save but some fields are empty

**Solution**: The AI response format might be inconsistent. Check console logs for parsing errors. You may need to adjust regex patterns in `parseInterpretationResponse()`.

### Issue: Groq API Rate Limits

**Symptom**: 429 errors

**Solution**: 
- Check your Groq API tier limits
- Consider reducing max_tokens from 3000 to 2500
- Add retry logic with exponential backoff

### Issue: Slow Response Times

**Symptom**: Users wait too long for interpretation

**Solution**:
- Consider streaming responses (Groq supports streaming)
- Add loading states in UI
- Reduce max_tokens if needed

### Issue: Database Insert Failures

**Symptom**: Interpretation works but doesn't save

**Solution**: Check Supabase logs for RLS policy issues or field mismatches.

---

## Performance Optimization

### Current Setup
- Model: llama-3.3-70b-versatile
- Temperature: 0.7
- Max Tokens: 3000
- Avg Response Time: 5-8 seconds

### Potential Improvements

1. **Use Streaming** (Future Enhancement)
```typescript
// Stream responses for better UX
const stream = await groq.chat.completions.create({
  ...config,
  stream: true
})
```

2. **Cache Common Symbols** (Future)
- Pre-compute common archetypal meanings
- Reduce prompt size for recurring patterns

3. **Parallel Processing** (Advanced)
- Generate perspectives independently
- Synthesize at the end
- Requires more complex orchestration

---

## Next Steps After Deployment

1. **Gather User Feedback**
   - Do users prefer certain perspectives?
   - Are reflection questions helpful?
   - Is response time acceptable?

2. **Add UI for Perspectives**
   - Implement tabbed interface
   - Allow users to compare perspectives
   - Add ability to save favorite perspective

3. **Pattern Analysis**
   - Track which archetypes appear most
   - Identify cognitive patterns over time
   - Build personalized insights

4. **Fine-Tuning**
   - Adjust system prompt based on results
   - Optimize token usage
   - Improve parsing reliability

---

## Support Resources

- **Knowledge Base**: `dream-interpretation-knowledge-base.md`
- **Implementation Guide**: `implementation-guide.md`
- **Project Docs**: `WARP.md`
- **Groq Docs**: https://console.groq.com/docs
- **Supabase Docs**: https://supabase.com/docs

---

## Success Criteria

✅ Migration applied successfully  
✅ API returns all three perspectives  
✅ Dreams save with new fields populated  
✅ Existing functionality still works  
✅ Response times < 10 seconds  
✅ No increase in error rates  

---

**Ready to deploy?** Start with Step 1!
