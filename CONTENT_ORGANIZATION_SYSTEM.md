# Content Organization System - KimbleAI

## Overview

A comprehensive content categorization and organization system that automatically sorts and manages different types of content (D&D sessions, Military Transition audio, Development projects, etc.) across kimbleai.com.

**Version**: 1.0
**Date**: October 1, 2025
**Status**: Production Ready

---

## System Architecture

### Hierarchical Organization

```
KimbleAI Content
├── D&D 🎲
│   ├── Sessions (audio transcriptions)
│   ├── Character Notes (conversations)
│   ├── Combat Logs (knowledge base)
│   └── Story Arcs (projects)
│
├── Military Transition 🎖️
│   ├── Interviews (audio transcriptions)
│   ├── Training Notes (knowledge base)
│   ├── Career Planning (projects)
│   └── Networking (conversations)
│
├── Development 💻
│   ├── Code Reviews (conversations)
│   ├── Technical Docs (knowledge base)
│   ├── Projects (projects)
│   └── API Discussions (audio transcriptions)
│
├── Business 💼
│   ├── Client Meetings (audio transcriptions)
│   ├── Strategy Docs (knowledge base)
│   └── Proposals (projects)
│
├── Personal 🏠
│   ├── Voice Notes (audio transcriptions)
│   ├── Reminders (knowledge base)
│   └── Life Planning (projects)
│
└── General 📁
    └── Uncategorized Content
```

---

## Core Components

### 1. Database Schema

**Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\database\content-organization-system.sql`

**New Tables**:
- `content_categories` - Main category definitions with hierarchical support
- Enhanced existing tables with `category_id` foreign keys

**Key Features**:
- Hierarchical categories (parent-child relationships)
- Keyword-based auto-detection
- Category statistics aggregation view
- Vector search within categories
- Full-text search support

**Database Functions**:
- `get_category_content()` - Retrieve all content by category
- `auto_categorize_content()` - AI-powered categorization
- `search_category_content()` - Vector similarity search within category

### 2. Content Categorizer Service

**Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\lib\content-categorizer.ts`

**Key Methods**:
```typescript
// Get all categories for a user
ContentCategorizer.getCategories(userId)

// Auto-categorize based on text analysis
ContentCategorizer.categorizeContent(text, userId, manualCategoryId?)

// Categorize specific content types
ContentCategorizer.categorizeTranscription(id, text, userId)
ContentCategorizer.categorizeProject(id, name, description, userId)
ContentCategorizer.categorizeConversation(id, title, content, userId)

// Retrieve category content
ContentCategorizer.getCategoryContent(categoryId, userId, contentType)

// Category management
ContentCategorizer.createCategory(name, description, userId, options)
ContentCategorizer.updateCategory(categoryId, userId, updates)
ContentCategorizer.deleteCategory(categoryId, userId)

// Bulk operations
ContentCategorizer.bulkRecategorize(userId, contentType, limit)
```

**Features**:
- In-memory caching (5-minute TTL)
- Confidence scoring (0-1 scale)
- Keyword matching with regex
- Tag-based fallback detection
- Backward compatibility with existing auto-tagging

### 3. API Routes

**Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\app\api\categories\route.ts`

**Endpoints**:

**GET** `/api/categories`
- `?action=list` - Get all categories
- `?action=stats` - Get category statistics
- `?action=content&categoryId=X` - Get content by category

**POST** `/api/categories`
- `action: "create"` - Create new category
- `action: "update"` - Update existing category
- `action: "delete"` - Delete category
- `action: "categorize"` - Auto-categorize text
- `action: "categorize_transcription"` - Categorize transcription
- `action: "categorize_project"` - Categorize project
- `action: "bulk_recategorize"` - Bulk re-categorization

### 4. Category Dashboard UI

**Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\components\CategoryDashboard.tsx`

**Features**:
- Visual category cards with icons and colors
- Real-time statistics per category
- Content type filtering (Audio, Projects, Conversations, Knowledge)
- Click-to-view category contents
- Responsive grid layout
- Auto-refresh capabilities

**Page Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\app\categories\page.tsx`

**Access URL**: `http://localhost:3000/categories`

---

## Auto-Detection Logic

### Keyword Matching Algorithm

The system uses PostgreSQL regex matching for keyword detection:

```sql
WHERE text ~* ('\m' || keyword || '\M')
```

This ensures word-boundary matching (not substring matching).

### D&D Keywords
```
game, campaign, character, dice, dungeon, dragon, d&d, rpg, quest,
adventure, roll, initiative, damage, spell, npc, combat, encounter,
session, player, dm, dungeon master, wizard, fighter, rogue, cleric,
barbarian, ranger, paladin, bard, druid, monk, sorcerer, warlock,
artificer, hit points, armor class, saving throw, ability check,
skill check, long rest, short rest, inspiration, advantage, disadvantage
```

### Military Transition Keywords
```
military, transition, veteran, resume, deployment, rank, mos, benefits,
va, service, army, navy, air force, marines, coast guard, civilian,
interview, job search, career, taps, gi bill, security clearance,
leadership, training, skills translation, networking, linkedin,
job application, cover letter, disability rating, post 9/11,
vocational rehab, skillbridge
```

### Confidence Scoring

```typescript
confidence = matched_keywords / total_keywords
```

- **1.0**: Manual categorization
- **0.7-0.9**: High confidence auto-detection
- **0.4-0.6**: Medium confidence
- **0.0-0.3**: Low confidence (falls back to General)

---

## Integration Points

### 1. Audio Transcription Integration

**Location**: Update `D:\OneDrive\Documents\kimbleai-v4-clean\app\api\transcribe\assemblyai\route.ts`

**After transcription completes**, add:

```typescript
import { ContentCategorizer } from '@/lib/content-categorizer';

// After saving transcription to database
const categorizationResult = await ContentCategorizer.categorizeTranscription(
  transcriptionData.id,
  result.text,
  userId
);

console.log(`Auto-categorized as: ${categorizationResult.category_name} (${(categorizationResult.confidence * 100).toFixed(0)}% confidence)`);
```

### 2. Project Creation Integration

**Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\app\api\projects\route.ts`

**When creating project**:

```typescript
import { ContentCategorizer } from '@/lib/content-categorizer';

const categorizationResult = await ContentCategorizer.categorizeProject(
  projectId,
  projectName,
  projectDescription,
  userId
);
```

### 3. Conversation Integration

**Location**: `D:\OneDrive\Documents\kimbleai-v4-clean\app\api\chat\route.ts`

**On first message**:

```typescript
import { ContentCategorizer } from '@/lib/content-categorizer';

if (isFirstMessage) {
  await ContentCategorizer.categorizeConversation(
    conversationId,
    conversationTitle,
    messageContent,
    userId
  );
}
```

---

## User Interface

### Category Dashboard

**Features**:
1. **Grid View** - Visual cards for each category
2. **Statistics** - Real-time counts and metrics
3. **Content Browser** - View items within each category
4. **Filtering** - Filter by content type
5. **Search** - Find content within categories
6. **Timeline View** - Chronological organization

### Wireframe Description

```
┌─────────────────────────────────────────────────────┐
│         Content Organization Dashboard              │
└─────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   🎲 D&D    │  │ 🎖️ Military │  │ 💻 Dev      │
│             │  │ Transition   │  │             │
│ 12 items    │  │ 8 items      │  │ 25 items    │
│ 2.5hrs audio│  │ 1.2hrs audio │  │ 5 projects  │
│ Last: Today │  │ Last: 2d ago │  │ Last: Today │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 💼 Business │  │ 🏠 Personal │  │ 📁 General  │
│             │  │             │  │             │
│ 6 items     │  │ 15 items    │  │ 3 items     │
│ 3 meetings  │  │ Shopping etc│  │ Misc        │
│ Last: 1w ago│  │ Last: Today │  │ Last: 3d ago│
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────────────────────────────────────────────┐
│  Category: D&D 🎲                                    │
│  [All] [Audio] [Projects] [Conversations] [Knowledge]│
├─────────────────────────────────────────────────────┤
│  ● Recording 31 - D&D Session          [View]       │
│    Audio • 1.2 hrs • Oct 1, 2025                    │
│    Tags: d&d, campaign, combat, session             │
│                                                      │
│  ● Campaign Notes - Dragon Heist      [View]       │
│    Knowledge • Oct 1, 2025                          │
│    Tags: d&d, character, story                      │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Workflow

### Phase 1: Database Setup (5 minutes)

1. Run migration SQL in Supabase:
   ```bash
   # Open Supabase SQL Editor
   # Copy contents of database/content-organization-system.sql
   # Execute
   ```

2. Verify tables created:
   ```sql
   SELECT * FROM content_categories;
   SELECT * FROM category_stats;
   ```

### Phase 2: Integration (15 minutes)

1. **Update Audio Transcription** (`app/api/transcribe/assemblyai/route.ts`):
   - Import `ContentCategorizer`
   - Add categorization call after saving transcription
   - Log results

2. **Test Transcription**:
   - Upload a D&D audio file
   - Verify auto-categorization
   - Check database: `SELECT category_id FROM audio_transcriptions WHERE id = 'X'`

### Phase 3: UI Deployment (5 minutes)

1. Navigate to `http://localhost:3000/categories`
2. Verify categories display
3. Click on a category to view contents
4. Test content type filters

### Phase 4: Existing Content Migration (10 minutes)

Run bulk re-categorization:

```typescript
// In browser console or via API
const response = await fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'bulk_recategorize',
    userId: 'zach-admin-001',
    contentType: 'audio',
    limit: 100
  })
});

const result = await response.json();
console.log(result); // { success: 5, failed: 0, skipped: 2 }
```

---

## How to Categorize Recording 31

### Method 1: Via API

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "action": "categorize_transcription",
    "userId": "zach-admin-001",
    "transcriptionId": "<recording-31-id>",
    "text": "<transcription-text>",
    "manualCategoryId": "category-dnd"
  }'
```

### Method 2: Via Database

```sql
UPDATE audio_transcriptions
SET category_id = 'category-dnd',
    auto_categorized = false,
    category_confidence = 1.0
WHERE filename LIKE '%Recording 31%'
  AND user_id = 'zach-admin-001';
```

### Method 3: Auto-Detection (Recommended)

The system will automatically detect D&D content based on keywords in the transcription. If Recording 31 contains D&D-related terms, it will be auto-categorized.

---

## Search Functionality

### Search Within Category

```typescript
// Get D&D content only
const dndContent = await ContentCategorizer.getCategoryContent(
  'category-dnd',
  userId,
  'audio',
  50,
  0
);
```

### Vector Search Within Category

```typescript
// Search using embeddings
const results = await ContentCategorizer.searchCategoryContent(
  queryEmbedding,
  'category-dnd',
  userId,
  { limit: 10, threshold: 0.3 }
);
```

### Full-Text Search

```sql
-- Search D&D transcriptions
SELECT * FROM audio_transcriptions
WHERE category_id = 'category-dnd'
  AND text ~* 'dragon|spell|combat'
ORDER BY created_at DESC;
```

---

## Extensibility

### Adding New Categories

**Via UI** (Future Feature):
- Click "Add Category" button
- Fill in name, description, icon, keywords
- Save

**Via API**:
```typescript
const newCategory = await ContentCategorizer.createCategory(
  'Photography',
  'Photography projects and photo editing sessions',
  userId,
  {
    icon: '📷',
    color: '#ec4899',
    keywords: ['photo', 'camera', 'image', 'photography', 'editing', 'photoshop'],
    metadata: { auto_detect: true, priority: 2 }
  }
);
```

**Via Database**:
```sql
INSERT INTO content_categories (id, name, description, icon, color, keywords, created_by)
VALUES (
  'category-photography',
  'Photography',
  'Photography projects and photo editing',
  '📷',
  '#ec4899',
  ARRAY['photo', 'camera', 'image', 'photography', 'editing'],
  'zach-admin-001'
);
```

### Subcategories

Create parent-child relationships:

```typescript
// Create parent category
const parentCategory = await ContentCategorizer.createCategory(
  'D&D Campaigns',
  'All D&D campaign content',
  userId,
  { icon: '🎲', color: '#8b5cf6' }
);

// Create child category
const childCategory = await ContentCategorizer.createCategory(
  'Dragon Heist Campaign',
  'Waterdeep Dragon Heist specific content',
  userId,
  {
    icon: '🐉',
    color: '#8b5cf6',
    parentCategoryId: parentCategory.id
  }
);
```

---

## Performance Considerations

### Caching Strategy

- **Category List**: Cached for 5 minutes
- **Statistics**: Cached in database view
- **Content Lists**: No caching (real-time)

### Indexing

All category foreign keys are indexed:
```sql
CREATE INDEX idx_audio_transcriptions_category ON audio_transcriptions(category_id);
CREATE INDEX idx_projects_category ON projects(category_id);
CREATE INDEX idx_conversations_category ON conversations(category_id);
```

### Optimization Tips

1. **Bulk Operations**: Use `bulkRecategorize()` for batch updates
2. **Limit Content Queries**: Use pagination (limit/offset)
3. **Clear Cache**: Call `ContentCategorizer.clearCache()` after bulk updates
4. **Use Views**: Query `category_stats` view for aggregated data

---

## Backward Compatibility

### Existing Auto-Tagging System

The new categorization system **works alongside** the existing auto-tagging system:

- **Auto-Tags**: Still generate 8-15 tags per transcription
- **Categories**: Add high-level organization layer
- **Migration**: Existing tags can inform categorization

### Tag-to-Category Mapping

```typescript
const categoryId = ContentCategorizer.detectCategoryFromTags(tags);
```

This provides fallback categorization based on existing tags.

---

## Monitoring & Analytics

### Track Categorization Accuracy

```sql
-- Check auto-categorization distribution
SELECT
  category_id,
  COUNT(*) as total,
  AVG(category_confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE auto_categorized = true) as auto_count,
  COUNT(*) FILTER (WHERE auto_categorized = false) as manual_count
FROM audio_transcriptions
WHERE category_id IS NOT NULL
GROUP BY category_id;
```

### Category Growth Over Time

```sql
SELECT
  category_id,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as items_added
FROM audio_transcriptions
WHERE category_id IS NOT NULL
GROUP BY category_id, day
ORDER BY day DESC;
```

---

## Security & Privacy

### Row-Level Security

Categories respect RLS policies:
- Users can only see their own categories and system categories
- Content within categories respects existing RLS policies
- Cross-user content is not accessible

### Data Isolation

```sql
-- Users can only access own content via categories
CREATE POLICY "Users can view own and system categories" ON content_categories
  FOR SELECT
  USING (
    created_by = current_setting('app.current_user_id', true) OR
    created_by = 'system'
  );
```

---

## Troubleshooting

### Issue: Content Not Auto-Categorizing

**Solution**:
1. Check keywords in category definition
2. Verify text contains matching keywords
3. Run manual categorization:
   ```typescript
   await ContentCategorizer.categorizeTranscription(id, text, userId);
   ```

### Issue: Wrong Category Assigned

**Solution**:
1. Check keyword overlap between categories
2. Adjust keyword lists to be more specific
3. Increase confidence threshold
4. Manually re-categorize:
   ```typescript
   await ContentCategorizer.categorizeTranscription(id, text, userId, 'category-dnd');
   ```

### Issue: Category Not Appearing in Dashboard

**Solution**:
1. Clear cache: `ContentCategorizer.clearCache()`
2. Refresh browser
3. Check database: `SELECT * FROM content_categories WHERE created_by = 'system'`

---

## Future Enhancements

### Planned Features

1. **Smart Suggestions**: AI-powered category suggestions based on content
2. **Multi-Category Support**: Assign content to multiple categories
3. **Category Templates**: Pre-built category sets for different use cases
4. **Export/Import**: Share category configurations
5. **Advanced Filters**: Date ranges, importance scores, sentiment
6. **Category Insights**: Analytics dashboard per category
7. **Automatic Subcategory Creation**: AI detects patterns and suggests subcategories
8. **Category-Specific Search**: Enhanced search within category boundaries
9. **Category Sharing**: Share categories with team members
10. **Custom Category Icons**: Upload custom icons

---

## Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review auto-categorization accuracy
2. **Monthly**: Optimize keyword lists based on usage
3. **Quarterly**: Audit category usage and merge/archive unused ones

### Getting Help

- **Documentation**: This file
- **Code Reference**: TypeScript source with inline comments
- **Database Schema**: SQL file with detailed comments
- **API Examples**: See `IMPLEMENTATION_GUIDE.md`

---

## Summary

The Content Organization System provides:

✅ **Automatic categorization** of all content types
✅ **Visual dashboard** for browsing by category
✅ **Flexible hierarchy** with parent-child support
✅ **High performance** with caching and indexing
✅ **Extensible** - easy to add new categories
✅ **Backward compatible** with existing systems
✅ **Production ready** with RLS and security

**Next Steps**: See `IMPLEMENTATION_GUIDE.md` for deployment instructions.
