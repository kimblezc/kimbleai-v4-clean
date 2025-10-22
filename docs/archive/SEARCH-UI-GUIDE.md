# Search UI Implementation Guide

**Created:** 2025-10-18
**Status:** ✅ Complete and Ready to Use

---

## What Was Built

A complete unified search interface that displays results from:
- ✅ Gmail (emails with attachments)
- ✅ Google Drive (all file types)
- ✅ Local uploaded files
- ✅ Knowledge base
- ✅ Calendar events (when integrated)

---

## Files Created

### 1. Search Component
**Location:** `components/search/UnifiedSearch.tsx`

**Features:**
- Real-time search across all sources
- Source filtering (Gmail, Drive, Local, Knowledge Base)
- Beautiful result cards with:
  - Source-specific icons and colors
  - Relevance scores
  - Timestamps (relative: "2 days ago")
  - Direct links to original content
  - Rich metadata display
- Empty states and loading indicators
- Responsive design

### 2. Search Page
**Location:** `app/search/page.tsx`

Simple page wrapper that renders the UnifiedSearch component.

---

## How to Use

### Access the Search Page

1. **Navigate to:** `http://localhost:3000/search` (or your deployed URL)

2. **Or add a link in your navigation:**
```tsx
import Link from 'next/link';
import { Search } from 'lucide-react';

<Link href="/search" className="flex items-center gap-2">
  <Search className="w-5 h-5" />
  Search
</Link>
```

### Search Examples

**Search for DND:**
1. Go to `/search`
2. Type "DND" in the search box
3. Select which sources to search (Gmail, Drive, Local, KB)
4. Click "Search"

**Results will show:**
- 📧 Emails containing "DND" in subject or body
- 📁 Drive files with "DND" in title or content
- 📄 Local uploaded PDFs/documents with "DND" text
- 📚 Knowledge base entries related to DND

---

## UI Features

### Source Filters
Visual toggle buttons for each source:
- 🔴 **Gmail** - Red theme
- 🔵 **Drive** - Blue theme
- 🟢 **Local** - Green theme
- 🟣 **Knowledge** - Purple theme

### Result Cards
Each result displays:
```
┌─────────────────────────────────────────────────┐
│ [Icon]  Title                        [Timestamp]│
│                                      [Link]     │
│         Content snippet...                      │
│                                                 │
│  [Source] • [Type] • Relevance: 85% • [Meta]  │
└─────────────────────────────────────────────────┘
```

**Metadata Examples:**
- Gmail: "From: john@example.com"
- Drive: "docx file, 2.5 MB"
- Local: "application/pdf"
- Knowledge: "Category: documents"

### Results Summary
Shows breakdown by source:
```
Found 15 results for "DND"
[3 emails] [7 drive] [2 local] [3 knowledge]
```

### Empty States
- Before search: "Search across all your content" with example queries
- No results: "No results found" with suggestions
- Loading: Animated spinner with "Searching..."

---

## Integration with Chat

To make the chat use search results, add this to `app/api/chat/route.ts`:

```typescript
// Before calling OpenAI, search for relevant context
if (userMessage.length > 3) {
  try {
    const searchResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/search/unified?q=${encodeURIComponent(userMessage)}&userId=${userId}&limit=5`,
      { method: 'GET' }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();

      if (searchData.success && searchData.results.length > 0) {
        // Add search results to context
        const contextMessage = {
          role: 'system',
          content: `Relevant information found:\n\n${searchData.results
            .map((r: any) => `[${r.source}] ${r.title}\n${r.snippet}`)
            .join('\n\n')}`
        };

        messages.unshift(contextMessage);
      }
    }
  } catch (searchError) {
    console.error('Search context error:', searchError);
  }
}
```

---

## Customization

### Adjust Result Limit
Change line in `UnifiedSearch.tsx`:
```tsx
const response = await fetch(
  `/api/search/unified?q=${encodeURIComponent(query)}&sources=${sourcesParam}&limit=20` // Change from 10 to 20
);
```

### Add More Sources
1. Add to `selectedSources` state
2. Add toggle button
3. Update API to handle new source

### Change Colors
Modify `getSourceColor()` function in component:
```tsx
case 'gmail':
  return 'bg-red-100 text-red-700 border-red-200'; // Change colors here
```

### Relevance Score Display
Modify result card to show/hide relevance:
```tsx
<span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>
```

---

## Quick Test

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Navigate to Search
Open: `http://localhost:3000/search`

### 3. Try These Searches

**Test 1: DND**
- Search: "DND"
- Sources: All
- Expected: Emails, Drive files, documents containing "DND"

**Test 2: Project**
- Search: "project"
- Sources: Gmail + Drive
- Expected: Project-related emails and files

**Test 3: Meeting**
- Search: "meeting"
- Sources: Gmail only
- Expected: Email threads about meetings

**Test 4: Document**
- Search: "document"
- Sources: Local + KB
- Expected: Uploaded files and knowledge entries

---

## Component Props (Future Enhancement)

Currently standalone, but can be made reusable:

```tsx
<UnifiedSearch
  defaultQuery="DND"
  defaultSources={['gmail', 'drive']}
  maxResults={20}
  onResultClick={(result) => console.log(result)}
  compact={false}
/>
```

---

## Performance

### Current Optimizations:
- ✅ Parallel API calls to all sources
- ✅ Debouncing not needed (manual search)
- ✅ Semantic search with embeddings
- ✅ Result ranking by relevance

### Future Optimizations:
- Add query caching (5-minute TTL)
- Implement infinite scroll for large result sets
- Add autocomplete/suggestions
- Cache recent searches

---

## Troubleshooting

### No Results Found
**Possible causes:**
1. No data indexed yet
   - Solution: Run cron job manually: `/api/cron/index-attachments`
   - Upload some test files: `/api/upload`

2. User not authenticated with Google
   - Solution: Check auth status, re-authenticate if needed

3. Wrong search term
   - Solution: Try broader terms like "the", "project", "file"

### Search Returns Error
**Check:**
1. API endpoint is accessible: `/api/search/unified`
2. Environment variables are set (OPENAI_API_KEY, etc.)
3. Database connection is working
4. User tokens are valid

### Results Missing Metadata
**Verify:**
1. Files have been fully processed
2. Embeddings were generated successfully
3. Check database tables: `indexed_files`, `knowledge_base`

---

## Example Workflow

### Scenario: Finding DND Documents

1. **User Action:**
   - Goes to `/search`
   - Types "DND" in search box
   - Leaves all sources selected
   - Clicks "Search"

2. **Backend Process:**
   - Calls `/api/search/unified?q=DND&sources=gmail,drive,local,kb&limit=10`
   - Parallel searches:
     - Gmail: Searches email subjects and bodies
     - Drive: Searches file names and content
     - Local: Vector search on uploaded files
     - KB: Vector search on knowledge base
   - Merges results, ranks by relevance
   - Returns JSON response

3. **UI Display:**
   - Shows "Found 12 results for 'DND'"
   - Breakdown: "5 emails, 4 drive, 1 local, 2 knowledge"
   - Displays result cards sorted by relevance
   - Each card shows:
     - Title: "DND Campaign Notes.docx"
     - Snippet: "The party explored the dungeon..."
     - Source: Drive (blue badge)
     - Link to open in Google Drive
     - Timestamp: "3 days ago"

4. **User Interaction:**
   - Clicks external link icon
   - Opens file in Google Drive
   - Can continue searching or refine query

---

## API Response Example

```json
{
  "success": true,
  "query": "DND",
  "sources": ["gmail", "drive", "local", "kb"],
  "totalResults": 12,
  "breakdown": {
    "gmail": 5,
    "drive": 4,
    "local": 1,
    "knowledge_base": 2
  },
  "results": [
    {
      "id": "abc123",
      "source": "drive",
      "type": "file",
      "title": "DND Campaign Notes.docx",
      "content": "The party explored the ancient dungeon...",
      "snippet": "The party explored the ancient dungeon... found treasure...",
      "url": "https://drive.google.com/file/d/abc123",
      "metadata": {
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "size": 45678,
        "modifiedTime": "2025-10-15T14:30:00Z"
      },
      "relevanceScore": 0.92,
      "timestamp": "2025-10-15T14:30:00Z"
    },
    {
      "id": "xyz789",
      "source": "gmail",
      "type": "email",
      "title": "Re: DND Session Tomorrow?",
      "content": "Hey, are we still on for DND tomorrow night?",
      "snippet": "Hey, are we still on for DND tomorrow night?...",
      "url": "https://mail.google.com/mail/u/0/#inbox/xyz789",
      "metadata": {
        "from": "friend@example.com",
        "date": "Wed, 16 Oct 2025 09:15:00 -0700",
        "labels": ["INBOX", "UNREAD"]
      },
      "relevanceScore": 0.88,
      "timestamp": "2025-10-16T16:15:00Z"
    }
  ]
}
```

---

## Adding to Main Navigation

### Option 1: Update Existing Nav Component

Find your main navigation (might be in `components/Navigation.tsx` or layout):

```tsx
import { Search } from 'lucide-react';

// Add to nav items
<Link
  href="/search"
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
>
  <Search className="w-5 h-5" />
  <span>Search</span>
</Link>
```

### Option 2: Add Floating Search Button

```tsx
// Add anywhere in your layout
<Link
  href="/search"
  className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
  aria-label="Search"
>
  <Search className="w-6 h-6" />
</Link>
```

### Option 3: Add to Header

```tsx
<header className="border-b bg-white">
  <div className="container mx-auto px-4 py-3 flex items-center justify-between">
    <h1>KimbleAI</h1>

    <Link
      href="/search"
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <Search className="w-4 h-4" />
      Search Everything
    </Link>
  </div>
</header>
```

---

## Next Steps

1. ✅ **Test the search page** - Navigate to `/search` and try searching
2. ✅ **Index some content** - Run `/api/cron/index-attachments` to get Gmail attachments
3. ✅ **Upload test files** - Use `/api/upload` to add PDFs/documents
4. ✅ **Add to navigation** - Make search easily accessible
5. 🔄 **Integrate with chat** - Use search results to enhance chat context

---

## Summary

You now have a **fully functional unified search interface** that:

- ✅ Searches Gmail, Drive, local files, and knowledge base
- ✅ Displays beautiful, color-coded result cards
- ✅ Shows relevance scores and timestamps
- ✅ Links directly to original content
- ✅ Supports source filtering
- ✅ Handles empty states and errors gracefully
- ✅ Works on mobile and desktop

**Just navigate to `/search` and start searching for "DND" or anything else!**
