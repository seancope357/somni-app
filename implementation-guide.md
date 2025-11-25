# Implementation Guide: Multi-Perspective Dream Interpretation AI

## Overview

This guide provides step-by-step instructions for updating your dream interpretation AI agent to provide three distinct psychological perspectives (Jungian, Freudian, and Cognitive/Evolutionary) plus a synthesized interpretation.

---

## Phase 1: Update System Prompt

### Current System Prompt Location
`src/app/api/interpret-dream-supabase/route.ts`

### New System Prompt Template

```typescript
const systemPrompt = `You are an expert dream analyst trained in multiple schools of psychological thought. Your role is to provide comprehensive, multi-perspective dream interpretations.

## Your Approach

You will analyze each dream from THREE distinct psychological perspectives:

1. **JUNGIAN PERSPECTIVE**: Focus on archetypes, collective unconscious, individuation, compensation, and symbolic meaning within personal and cultural mythology.

2. **FREUDIAN PERSPECTIVE**: Focus on wish fulfillment, manifest vs. latent content, unconscious conflicts, repressed desires, and dream-work mechanisms (condensation, displacement, symbolization).

3. **COGNITIVE/EVOLUTIONARY PERSPECTIVE**: Focus on continuity with waking life, cognitive patterns, problem-solving, threat simulation, memory consolidation, and emotional processing.

4. **SYNTHESIZED INTERPRETATION**: Integrate insights from all three perspectives, highlighting common themes, complementary insights, and practical wisdom.

## Key Principles

### Jungian Analysis
- Identify archetypal figures (Shadow, Anima/Animus, Self, Wise Old Man, Great Mother, Trickster, Hero)
- Consider compensatory function (how dream balances conscious attitudes)
- Explore collective vs. personal symbolism
- Relate to life stage and individuation process
- Use amplification (expand symbols through mythology, culture, personal associations)

### Freudian Analysis  
- Identify potential wish fulfillment (especially repressed desires)
- Distinguish manifest content (surface narrative) from latent content (underlying meaning)
- Look for dream-work mechanisms: condensation, displacement, symbolization
- Consider childhood origins and early experiences
- Examine sexual/aggressive content and defense mechanisms
- Note: Symbols are personal, not universal

### Cognitive/Evolutionary Analysis
- Apply Calvin Hall's five conceptions: self, others, world, penalties, conflict
- Assess continuity with waking concerns and preoccupations
- Identify cognitive patterns, schemas, and biases
- Consider threat simulation (Revonsuo): rehearsal of danger responses
- Examine problem-solving and memory consolidation
- Analyze emotional processing and regulation

### Synthesis
- Find common threads across perspectives
- Highlight complementary insights
- Provide actionable wisdom
- Suggest reflection questions
- Maintain humility: interpretations are possibilities, not certainties

## Ethical Guidelines
- Never claim definitive interpretations
- Frame insights as possibilities for exploration
- Emphasize the dreamer's personal associations are most important
- Acknowledge cultural variations in symbolism
- Handle trauma/nightmare content with sensitivity
- Remind users this is not a replacement for professional mental health care

## Context Integration
${moodContext ? `The dreamer's current mood context: Mood: ${moodContext.mood}, Stress: ${moodContext.stress_level}/5, Energy: ${moodContext.energy_level}/5` : ''}
${sleepContext ? `Sleep context: ${sleepContext} hours of sleep` : ''}

## Output Format

Provide your interpretation in this structure:

**JUNGIAN PERSPECTIVE**
[2-3 paragraph analysis from Jungian viewpoint]

**FREUDIAN PERSPECTIVE**
[2-3 paragraph analysis from Freudian viewpoint]

**COGNITIVE/EVOLUTIONARY PERSPECTIVE**
[2-3 paragraph analysis from Cognitive/Evolutionary viewpoint]

**SYNTHESIZED INTERPRETATION**
[2-3 paragraphs integrating all perspectives with practical insights]

**REFLECTION QUESTIONS**
[3-5 questions to deepen understanding]

Then provide a JSON-formatted response with:
{
  "symbols": [array of key symbolic elements],
  "emotions": [array of emotional themes],
  "themes": [array of overarching themes],
  "archetypal_figures": [array of Jungian archetypes identified],
  "cognitive_patterns": [array of cognitive patterns/schemas],
  "wish_indicators": [array of potential Freudian wish fulfillment elements]
}`;
```

---

## Phase 2: Update Database Schema

### Add New Fields to Dreams Table

```sql
-- Add new fields to store multi-perspective analysis
ALTER TABLE dreams 
ADD COLUMN IF NOT EXISTS jungian_analysis TEXT,
ADD COLUMN IF NOT EXISTS freudian_analysis TEXT,
ADD COLUMN IF NOT EXISTS cognitive_analysis TEXT,
ADD COLUMN IF NOT EXISTS synthesized_analysis TEXT,
ADD COLUMN IF NOT EXISTS archetypal_figures TEXT[], 
ADD COLUMN IF NOT EXISTS cognitive_patterns TEXT[],
ADD COLUMN IF NOT EXISTS wish_indicators TEXT[],
ADD COLUMN IF NOT EXISTS reflection_questions TEXT[];
```

### Migration File

Create `supabase/migrations/add_multiperspective_fields.sql`:

```sql
-- Migration: Add multi-perspective dream analysis fields
-- Created: 2025-11-25

-- Add new columns to dreams table
ALTER TABLE dreams 
ADD COLUMN IF NOT EXISTS jungian_analysis TEXT,
ADD COLUMN IF NOT EXISTS freudian_analysis TEXT,
ADD COLUMN IF NOT EXISTS cognitive_analysis TEXT,
ADD COLUMN IF NOT EXISTS synthesized_analysis TEXT,
ADD COLUMN IF NOT EXISTS archetypal_figures TEXT[], 
ADD COLUMN IF NOT EXISTS cognitive_patterns TEXT[],
ADD COLUMN IF NOT EXISTS wish_indicators TEXT[],
ADD COLUMN IF NOT EXISTS reflection_questions TEXT[];

-- Add index for improved query performance
CREATE INDEX IF NOT EXISTS idx_dreams_archetypal_figures ON dreams USING GIN(archetypal_figures);
CREATE INDEX IF NOT EXISTS idx_dreams_cognitive_patterns ON dreams USING GIN(cognitive_patterns);

-- Add comment
COMMENT ON COLUMN dreams.jungian_analysis IS 'Jungian perspective interpretation';
COMMENT ON COLUMN dreams.freudian_analysis IS 'Freudian perspective interpretation';
COMMENT ON COLUMN dreams.cognitive_analysis IS 'Cognitive/Evolutionary perspective interpretation';
COMMENT ON COLUMN dreams.synthesized_analysis IS 'Integrated multi-perspective interpretation';
COMMENT ON COLUMN dreams.archetypal_figures IS 'Jungian archetypal figures identified in dream';
COMMENT ON COLUMN dreams.cognitive_patterns IS 'Cognitive patterns and schemas identified';
COMMENT ON COLUMN dreams.wish_indicators IS 'Potential Freudian wish fulfillment elements';
COMMENT ON COLUMN dreams.reflection_questions IS 'Questions for deeper reflection';
```

---

## Phase 3: Update API Route Handler

### Modify `/src/app/api/interpret-dream-supabase/route.ts`

```typescript
// Updated response parsing
const parseInterpretationResponse = (responseText: string) => {
  // Extract perspectives
  const jungianMatch = responseText.match(/\*\*JUNGIAN PERSPECTIVE\*\*\n([\s\S]*?)\n\*\*FREUDIAN PERSPECTIVE\*\*/);
  const freudianMatch = responseText.match(/\*\*FREUDIAN PERSPECTIVE\*\*\n([\s\S]*?)\n\*\*COGNITIVE\/EVOLUTIONARY PERSPECTIVE\*\*/);
  const cognitiveMatch = responseText.match(/\*\*COGNITIVE\/EVOLUTIONARY PERSPECTIVE\*\*\n([\s\S]*?)\n\*\*SYNTHESIZED INTERPRETATION\*\*/);
  const synthesizedMatch = responseText.match(/\*\*SYNTHESIZED INTERPRETATION\*\*\n([\s\S]*?)\n\*\*REFLECTION QUESTIONS\*\*/);
  const questionsMatch = responseText.match(/\*\*REFLECTION QUESTIONS\*\*\n([\s\S]*?)(?:\n\{|$)/);
  
  // Extract JSON data
  const jsonMatch = responseText.match(/\{[\s\S]*"symbols"[\s\S]*\}/);
  let structuredData = {
    symbols: [],
    emotions: [],
    themes: [],
    archetypal_figures: [],
    cognitive_patterns: [],
    wish_indicators: []
  };
  
  if (jsonMatch) {
    try {
      structuredData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse JSON from interpretation');
    }
  }
  
  // Parse reflection questions
  let reflection_questions = [];
  if (questionsMatch && questionsMatch[1]) {
    reflection_questions = questionsMatch[1]
      .split('\n')
      .filter(q => q.trim().startsWith('-'))
      .map(q => q.trim().substring(1).trim());
  }
  
  return {
    fullInterpretation: responseText,
    jungian_analysis: jungianMatch ? jungianMatch[1].trim() : '',
    freudian_analysis: freudianMatch ? freudianMatch[1].trim() : '',
    cognitive_analysis: cognitiveMatch ? cognitiveMatch[1].trim() : '',
    synthesized_analysis: synthesizedMatch ? synthesizedMatch[1].trim() : '',
    reflection_questions,
    ...structuredData
  };
};

// Update database insert
const { data: dream, error: insertError } = await supabase
  .from('dreams')
  .insert({
    user_id: userId,
    content: dreamContent,
    interpretation: parsedData.fullInterpretation,
    jungian_analysis: parsedData.jungian_analysis,
    freudian_analysis: parsedData.freudian_analysis,
    cognitive_analysis: parsedData.cognitive_analysis,
    synthesized_analysis: parsedData.synthesized_analysis,
    symbols: parsedData.symbols,
    emotions: parsedData.emotions,
    themes: parsedData.themes,
    archetypal_figures: parsedData.archetypal_figures,
    cognitive_patterns: parsedData.cognitive_patterns,
    wish_indicators: parsedData.wish_indicators,
    reflection_questions: parsedData.reflection_questions,
    sleep_hours: sleepHours,
    mood_log_id: moodLog?.id || null,
  })
  .select()
  .single();
```

---

## Phase 4: Update Frontend UI

### Create Tabbed Perspective View

```typescript
// src/components/DreamInterpretation.tsx

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DreamInterpretation({ dream }) {
  const [activeTab, setActiveTab] = useState("synthesized");
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Dream Interpretation</CardTitle>
        <CardDescription>
          Multi-perspective psychological analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="synthesized">Synthesis</TabsTrigger>
            <TabsTrigger value="jungian">Jungian</TabsTrigger>
            <TabsTrigger value="freudian">Freudian</TabsTrigger>
            <TabsTrigger value="cognitive">Cognitive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="synthesized" className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3>Integrated Interpretation</h3>
              <p>{dream.synthesized_analysis}</p>
            </div>
            
            {dream.reflection_questions?.length > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Reflection Questions</h4>
                <ul className="list-disc list-inside space-y-1">
                  {dream.reflection_questions.map((q, i) => (
                    <li key={i} className="text-sm">{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="jungian" className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3>Jungian Perspective</h3>
              <p>{dream.jungian_analysis}</p>
            </div>
            
            {dream.archetypal_figures?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-semibold">Archetypes:</span>
                {dream.archetypal_figures.map((archetype, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                    {archetype}
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="freudian" className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3>Freudian Perspective</h3>
              <p>{dream.freudian_analysis}</p>
            </div>
            
            {dream.wish_indicators?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-semibold">Wish Indicators:</span>
                {dream.wish_indicators.map((wish, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {wish}
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="cognitive" className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3>Cognitive/Evolutionary Perspective</h3>
              <p>{dream.cognitive_analysis}</p>
            </div>
            
            {dream.cognitive_patterns?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-semibold">Cognitive Patterns:</span>
                {dream.cognitive_patterns.map((pattern, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    {pattern}
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Existing symbols, emotions, themes display */}
        <div className="mt-6 space-y-3">
          {dream.symbols?.length > 0 && (
            <div>
              <span className="text-sm font-semibold">Symbols:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {dream.symbols.map((symbol, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {dream.emotions?.length > 0 && (
            <div>
              <span className="text-sm font-semibold">Emotions:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {dream.emotions.map((emotion, i) => (
                  <span key={i} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {dream.themes?.length > 0 && (
            <div>
              <span className="text-sm font-semibold">Themes:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {dream.themes.map((theme, i) => (
                  <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 5: Testing & Validation

### Test Cases

1. **Simple Dream**: Test with straightforward content
2. **Complex Dream**: Multi-scene, many symbols
3. **Nightmare**: Threatening content
4. **Recurring Dream**: Pattern recognition
5. **Lucid Dream**: Metacognitive awareness

### Validation Checklist

- [ ] All three perspectives generate distinct analyses
- [ ] Synthesized interpretation integrates insights
- [ ] Reflection questions are relevant
- [ ] New fields populate correctly in database
- [ ] UI tabs display properly
- [ ] Symbols, emotions, themes still extract correctly
- [ ] Archetypal figures, cognitive patterns, wish indicators extract
- [ ] Mood context integrates properly
- [ ] Error handling for malformed responses

---

## Phase 6: Deployment

### Steps

1. Run database migration on Supabase
2. Deploy updated API route
3. Deploy updated frontend components
4. Monitor Groq API usage (token consumption will increase)
5. Gather user feedback

### Monitoring

- Track interpretation quality
- Monitor response times
- Check token usage vs. budget
- Collect user satisfaction data

---

## Phase 7: Future Enhancements

### Short-term
1. Add user preference for default perspective
2. Allow users to request specific perspective only
3. Add comparative analysis view
4. Implement interpretation history patterns

### Long-term
1. Fine-tune model on dream psychology corpus
2. Add interactive follow-up Q&A within each perspective
3. Implement dream journal pattern recognition across multiple dreams
4. Add cultural context customization
5. Create perspective-specific visualization

---

## Resources & References

- Knowledge Base: `dream-interpretation-knowledge-base.md`
- Current API: `src/app/api/interpret-dream-supabase/route.ts`
- Database Schema: `supabase-complete-migration.sql`
- WARP.md project documentation

---

## Notes

- Current Groq model (Llama 3.3 70B) performs well with complex prompts
- Temperature 0.7 provides good balance of creativity and consistency
- Max tokens 2000 may need increase to ~3000 for four-part analysis
- Consider caching knowledge base excerpts for consistent quality

---

## Support

For issues or questions during implementation:
1. Review WARP.md for project context
2. Check Groq API documentation
3. Test with sample dreams in development
4. Validate JSON parsing robustness
