# Content Organization System - Implementation Guide

## Quick Start (15 Minutes to Production)

This guide will take you from zero to a fully functional content organization system in approximately 15 minutes.

---

## Prerequisites

- Access to Supabase SQL Editor
- Next.js development server running
- Node.js installed
- Basic knowledge of SQL and TypeScript

---

## Step-by-Step Implementation

### Step 1: Database Migration (5 minutes)

#### 1.1 Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

#### 1.2 Run Migration SQL

```sql
-- Copy and paste the entire contents of:
-- database/content-organization-system.sql

-- Or run directly:
```

**File Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\database\content-organization-system.sql`

**What This Does**:
- Creates `content_categories` table
- Adds `category_id` to existing tables
- Creates database functions for categorization
- Inserts default categories (D&D, Military, etc.)
- Sets up indexes and RLS policies

#### 1.3 Verify Installation

Run this verification query:

```sql
-- Check categories were created
SELECT id, name, icon FROM content_categories ORDER BY name;

-- Expected result: 6 categories (D&D, Military Transition, Development, Business, Personal, General)
```

You should see:

| id | name | icon |
|----|------|------|
| category-dnd | D&D | 🎲 |
| category-military | Military Transition | 🎖️ |
| category-development | Development | 💻 |
| category-business | Business | 💼 |
| category-personal | Personal | 🏠 |
| category-general | General | 📁 |

---

### Step 2: Test the API (3 minutes)

#### 2.1 Start Development Server

```bash
cd D:\OneDrive\Documents\kimbleai-v4-clean
npm run dev
```

#### 2.2 Test Category List Endpoint

Open your browser console and run:

```javascript
// Test GET - List all categories
fetch('http://localhost:3000/api/categories?userId=zach-admin-001&action=list')
  .then(r => r.json())
  .then(data => console.log('Categories:', data));

// Expected: { success: true, categories: [...6 categories...] }
```

#### 2.3 Test Category Stats

```javascript
// Test GET - Category statistics
fetch('http://localhost:3000/api/categories?userId=zach-admin-001&action=stats')
  .then(r => r.json())
  .then(data => console.log('Stats:', data));

// Expected: { success: true, stats: [...] }
```

#### 2.4 Test Auto-Categorization

```javascript
// Test POST - Categorize sample text
fetch('http://localhost:3000/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'categorize',
    userId: 'zach-admin-001',
    text: 'We rolled initiative and the fighter attacked the dragon with his sword dealing 15 damage'
  })
})
  .then(r => r.json())
  .then(data => console.log('Categorization:', data));

// Expected: { success: true, result: { category_name: "D&D", confidence: 0.8, ... } }
```

---

### Step 3: Integrate with Transcription System (5 minutes)

#### 3.1 Update AssemblyAI Route

**File**: `D:\OneDrive\Documents\kimbleai-v4-clean\app\api\transcribe\assemblyai\route.ts`

**Find this section** (around line 505):

```typescript
    // Save to database with enhanced metadata
    updateJobStatus(jobId, 95, 'saving');

    const { data: transcriptionData, error: saveError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: autoTagAnalysis?.projectCategory || projectId,
        filename: filename,
        file_size: fileSize,
        duration: result.audio_duration,
        text: result.text,
        service: 'assemblyai',
        metadata: {
          // ... existing metadata ...
        }
      })
      .select()
      .single();
```

**Add import at the top of file**:

```typescript
import { ContentCategorizer } from '@/lib/content-categorizer';
```

**Add categorization after the save** (around line 535, after the insert):

```typescript
    // Save to database with enhanced metadata
    updateJobStatus(jobId, 95, 'saving');

    const { data: transcriptionData, error: saveError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: autoTagAnalysis?.projectCategory || projectId,
        filename: filename,
        file_size: fileSize,
        duration: result.audio_duration,
        text: result.text,
        service: 'assemblyai',
        metadata: {
          speaker_labels: result.speaker_labels,
          utterances: result.utterances,
          words: result.words,
          auto_tags: autoTagAnalysis?.tags || [],
          action_items: autoTagAnalysis?.actionItems || [],
          key_topics: autoTagAnalysis?.keyTopics || [],
          speaker_insights: autoTagAnalysis?.speakerInsights,
          sentiment: autoTagAnalysis?.sentiment,
          importance_score: autoTagAnalysis?.importanceScore,
          extracted_entities: autoTagAnalysis?.extractedEntities,
          auto_tagged_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('[ASSEMBLYAI] Database save error:', saveError);
    }

    // ✨ NEW: Auto-categorize transcription
    if (transcriptionData?.id) {
      try {
        const categorizationResult = await ContentCategorizer.categorizeTranscription(
          transcriptionData.id,
          result.text,
          userId
        );
        console.log(`[ASSEMBLYAI] Auto-categorized as "${categorizationResult.category_name}" with ${(categorizationResult.confidence * 100).toFixed(0)}% confidence`);
      } catch (catError: any) {
        console.error('[ASSEMBLYAI] Categorization failed:', catError);
        // Continue even if categorization fails
      }
    }

    // Complete
    const finalJob = jobStore.get(jobId);
    // ... rest of code ...
```

**Do the same for the second `processAssemblyAI` function** (around line 730).

#### 3.2 Update Whisper Route (Optional)

If you're using Whisper transcription, apply the same changes to:
`D:\OneDrive\Documents\kimbleai-v4-clean\app\api\audio\transcribe-progress\route.ts`

---

### Step 4: Access the Dashboard (2 minutes)

#### 4.1 Navigate to Categories Page

Open your browser:

```
http://localhost:3000/categories
```

#### 4.2 Verify Display

You should see:
- 6 category cards (D&D, Military, Development, Business, Personal, General)
- Each card shows statistics (0 items initially)
- Visual grid layout with icons and colors

#### 4.3 Test Interaction

1. Click on any category card
2. Category should highlight with blue border
3. Content area appears below (empty initially)
4. Content type filters appear (All, Audio, Projects, Conversations, Knowledge)

---

### Step 5: Test End-to-End (Optional, 5 minutes)

#### 5.1 Upload Test Audio

1. Go to your audio upload interface
2. Upload a D&D-related audio file (or any audio file)
3. Wait for transcription to complete

#### 5.2 Verify Categorization

**Check via API**:
```javascript
fetch('http://localhost:3000/api/categories?userId=zach-admin-001&action=content&categoryId=category-dnd&contentType=audio')
  .then(r => r.json())
  .then(data => console.log('D&D Audio:', data));
```

**Check via Dashboard**:
1. Go to `http://localhost:3000/categories`
2. Click on "D&D" category
3. Select "Audio" filter
4. Your transcription should appear in the list

**Check via Database**:
```sql
SELECT
  id,
  filename,
  category_id,
  auto_categorized,
  category_confidence
FROM audio_transcriptions
ORDER BY created_at DESC
LIMIT 5;
```

---

### Step 6: Categorize Existing Recording 31 (2 minutes)

#### Method 1: Via SQL (Fastest)

```sql
-- Find Recording 31
SELECT id, filename FROM audio_transcriptions
WHERE filename LIKE '%Recording 31%' OR filename LIKE '%31%'
LIMIT 5;

-- Manually categorize as D&D
UPDATE audio_transcriptions
SET
  category_id = 'category-dnd',
  auto_categorized = false,
  category_confidence = 1.0
WHERE id = '<recording-31-id-from-above>';

-- Verify
SELECT filename, category_id FROM audio_transcriptions
WHERE id = '<recording-31-id>';
```

#### Method 2: Via API

```javascript
// First, find the transcription ID
fetch('/api/categories?userId=zach-admin-001&action=content&categoryId=category-general&contentType=audio')
  .then(r => r.json())
  .then(data => {
    console.log('Find Recording 31:', data);
    // Copy the ID of Recording 31
  });

// Then categorize it
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'categorize_transcription',
    userId: 'zach-admin-001',
    transcriptionId: '<recording-31-id>',
    text: '<recording-31-text>',
    manualCategoryId: 'category-dnd'
  })
})
  .then(r => r.json())
  .then(data => console.log('Categorized:', data));
```

#### Method 3: Bulk Re-Categorization

If you have multiple recordings to categorize:

```javascript
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'bulk_recategorize',
    userId: 'zach-admin-001',
    contentType: 'audio',
    limit: 100
  })
})
  .then(r => r.json())
  .then(data => console.log('Bulk categorization results:', data));

// Expected: { success: 5, failed: 0, skipped: 2 }
```

---

## Verification Checklist

- [ ] Database migration completed successfully
- [ ] 6 default categories exist in `content_categories` table
- [ ] API endpoints respond correctly (list, stats, categorize)
- [ ] Category dashboard loads at `/categories`
- [ ] Category cards display with icons and statistics
- [ ] New transcriptions auto-categorize
- [ ] Recording 31 is categorized as "D&D"
- [ ] Content appears when clicking category cards
- [ ] Content type filters work (Audio, Projects, etc.)

---

## Troubleshooting

### Issue: Migration SQL Fails

**Error**: `relation "content_categories" already exists`

**Solution**: The table already exists. Skip to verification step.

**Error**: `function "update_updated_at_column" already exists`

**Solution**: This is fine, the function is shared across tables.

---

### Issue: API Returns 404

**Error**: `GET /api/categories 404 Not Found`

**Solution**:
1. Restart Next.js dev server: `npm run dev`
2. Verify file exists: `app/api/categories/route.ts`
3. Check file has proper export: `export async function GET(...)`

---

### Issue: No Categories Display on Dashboard

**Possible Causes**:
1. **User ID mismatch**: Check `userId` prop in `app/categories/page.tsx`
2. **RLS blocking**: Temporarily disable RLS for testing:
   ```sql
   ALTER TABLE content_categories DISABLE ROW LEVEL SECURITY;
   ```
3. **API error**: Check browser console for error messages

**Debug**:
```javascript
// In browser console
fetch('http://localhost:3000/api/categories?userId=zach-admin-001&action=list')
  .then(r => r.json())
  .then(data => console.log(data));
```

---

### Issue: Transcriptions Not Auto-Categorizing

**Possible Causes**:
1. Integration code not added to transcription route
2. Text doesn't contain category keywords
3. Category confidence too low

**Debug**:
```javascript
// Test categorization manually
fetch('http://localhost:3000/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'categorize',
    userId: 'zach-admin-001',
    text: 'YOUR_TRANSCRIPTION_TEXT_HERE'
  })
})
  .then(r => r.json())
  .then(data => console.log('Debug categorization:', data));
```

---

### Issue: Wrong Category Assigned

**Solution**: Adjust keywords in database

```sql
-- Add more specific keywords to D&D category
UPDATE content_categories
SET keywords = keywords || ARRAY['game master', 'player character', 'critical hit']
WHERE id = 'category-dnd';

-- Remove conflicting keywords from other categories
UPDATE content_categories
SET keywords = array_remove(keywords, 'game')
WHERE id != 'category-dnd';
```

---

## Advanced Configuration

### Custom Categories

Create a new category for your specific use case:

```javascript
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    userId: 'zach-admin-001',
    name: 'Photography',
    description: 'Photography projects and editing sessions',
    icon: '📷',
    color: '#ec4899',
    keywords: ['photo', 'camera', 'photography', 'lightroom', 'photoshop', 'editing', 'portrait', 'landscape'],
    metadata: {
      auto_detect: true,
      priority: 2
    }
  })
})
  .then(r => r.json())
  .then(data => console.log('Created:', data));
```

---

### Adjust Auto-Detection Sensitivity

Lower the confidence threshold to catch more content:

```sql
-- In auto_categorize_content function, modify the return condition
-- Currently: IF v_match_count > 0 THEN
-- Change to: IF v_match_count > 2 THEN  (require at least 3 keyword matches)
```

Or increase keyword lists:

```sql
UPDATE content_categories
SET keywords = keywords || ARRAY['new', 'keywords', 'here']
WHERE id = 'category-dnd';
```

---

### Performance Tuning

If you have thousands of items, optimize queries:

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_audio_category_created ON audio_transcriptions(category_id, created_at DESC);
CREATE INDEX idx_audio_category_user ON audio_transcriptions(category_id, user_id);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM get_category_content('category-dnd', 'zach-admin-001', 'audio', 50, 0);
```

---

## Production Deployment

### Environment Variables

No new environment variables required! The system uses existing Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to your hosting platform
```

### Post-Deployment

1. Run the migration SQL on production Supabase
2. Verify categories exist: `SELECT * FROM content_categories;`
3. Test API endpoints in production
4. Monitor categorization accuracy

---

## Monitoring

### Track Categorization Accuracy

```sql
-- Daily categorization report
SELECT
  cc.name as category,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE at.auto_categorized = true) as auto_categorized,
  COUNT(*) FILTER (WHERE at.auto_categorized = false) as manual_categorized,
  AVG(at.category_confidence) * 100 as avg_confidence_pct
FROM audio_transcriptions at
JOIN content_categories cc ON cc.id = at.category_id
WHERE at.created_at > NOW() - INTERVAL '7 days'
GROUP BY cc.name
ORDER BY total_items DESC;
```

### Monitor Category Growth

```sql
-- Category growth over time
SELECT
  cc.name,
  DATE_TRUNC('day', at.created_at) as date,
  COUNT(*) as items_added
FROM audio_transcriptions at
JOIN content_categories cc ON cc.id = at.category_id
WHERE at.created_at > NOW() - INTERVAL '30 days'
GROUP BY cc.name, DATE_TRUNC('day', at.created_at)
ORDER BY date DESC, items_added DESC;
```

---

## Backup & Recovery

### Backup Categories

```sql
-- Export category definitions
COPY (
  SELECT * FROM content_categories
  WHERE created_by != 'system'
) TO '/tmp/custom_categories_backup.csv' WITH CSV HEADER;
```

### Restore Categories

```sql
-- Import categories
COPY content_categories (id, name, description, icon, color, keywords, created_by, metadata)
FROM '/tmp/custom_categories_backup.csv' WITH CSV HEADER;
```

---

## Next Steps

### Recommended Enhancements

1. **Add to Main Navigation**: Link to `/categories` from main menu
2. **Project Integration**: Categorize projects on creation
3. **Conversation Integration**: Categorize conversations on first message
4. **Search Enhancement**: Filter knowledge base search by category
5. **Analytics Dashboard**: Build category insights page
6. **Export Functionality**: Export category contents as PDF/CSV
7. **Sharing**: Share category views with team members
8. **Mobile Optimization**: Responsive design improvements

### Future Features

See `CONTENT_ORGANIZATION_SYSTEM.md` section "Future Enhancements" for roadmap.

---

## Support

If you encounter issues:

1. **Check this guide** for troubleshooting steps
2. **Review logs** in browser console and server terminal
3. **Verify database** state with SQL queries
4. **Test API** endpoints directly with fetch/curl
5. **Check file locations** match this guide

---

## Success!

You now have a fully functional content organization system that:

✅ Automatically categorizes all transcriptions
✅ Provides visual dashboard for browsing
✅ Supports D&D and Military Transition content
✅ Integrates seamlessly with existing features
✅ Scales to thousands of items
✅ Maintains high performance with caching

**Access Your Dashboard**: http://localhost:3000/categories

**View Your D&D Content**: Click the "D&D 🎲" category card

**View Recording 31**: Filter by "Audio" and find your transcription

Enjoy your organized content! 🎉
