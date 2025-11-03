# How to Use the Search Interface

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to Search Page
Open your browser and go to:
```
http://localhost:3000/search
```

### 3. Search for DND Content

**In the search box, type:** `DND`

**Select sources to search:**
- ✅ Gmail (find emails about DND)
- ✅ Drive (find DND files)
- ✅ Local Files (uploaded PDFs/docs)
- ✅ Knowledge Base (indexed content)

**Click "Search"**

## What You'll See

### Search Results Will Display:

**📧 Gmail Results** (Red cards)
- Subject: "Re: DND Session This Weekend"
- From: friend@example.com
- Snippet: "Hey, are we still playing DND this Saturday?..."
- Link to view in Gmail

**📁 Drive Results** (Blue cards)
- File: "DND Character Sheet.pdf"
- Type: PDF document
- Snippet: "Character: Thorin Oakenshield, Class: Fighter..."
- Link to open in Drive

**📄 Local Files** (Green cards)
- File: "DND Campaign Notes.docx"
- Uploaded: 2 days ago
- Snippet: "Session 5: The party explored the ancient ruins..."

**📚 Knowledge Base** (Purple cards)
- Title: "DND Rules Reference"
- Category: gaming
- Snippet: "Dungeons & Dragons 5th Edition rules..."

### Each Result Shows:
- ✅ Relevance score (e.g., "Relevance: 92%")
- ✅ Timestamp (e.g., "3 days ago")
- ✅ Direct link to original content
- ✅ Source-specific metadata

## Features

### Source Filtering
Click source buttons to enable/disable:
- Uncheck "Gmail" to skip email search
- Check only "Drive" to search files only
- Mix and match as needed

### Results are Ranked
- Higher relevance scores appear first
- Semantic matching (not just keyword)
- Combines text and vector search

### Quick Actions
- Click external link icon → Opens original content
- View snippet → See content preview
- Check timestamp → See when it was created/modified

## Adding Search to Navigation

### Option 1: Add Link to Header
Edit your layout or nav component:

```tsx
import Link from 'next/link';
import { Search } from 'lucide-react';

<Link href="/search" className="flex items-center gap-2">
  <Search className="w-5 h-5" />
  Search
</Link>
```

### Option 2: Floating Action Button
Add to your main layout:

```tsx
<Link
  href="/search"
  className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50"
>
  <Search className="w-6 h-6" />
</Link>
```

### Option 3: Keyboard Shortcut (Advanced)
Add to your root layout:

```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      router.push('/search');
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

Now press `Cmd+/` (Mac) or `Ctrl+/` (Windows) to open search!

## Testing Without Real Data

If you don't have DND content yet, try these searches:

**Generic searches that should return results:**
- "the" - Very common word
- "file" - Should match many items
- "project" - Common in work content
- "test" - If you uploaded test files

## Deploying

Once you're happy with the search interface:

```bash
git add .
git commit -m "Add unified search interface with Gmail, Drive, local files, and knowledge base"
git push
```

The search page will be available at:
```
https://your-domain.com/search
```

## Summary

✅ **Search Page:** `/search`
✅ **Searches:** Gmail, Drive, Local Files, Knowledge Base
✅ **Features:** Source filtering, relevance ranking, direct links
✅ **Mobile:** Fully responsive
✅ **Example Query:** "DND" finds all DND-related content

**Just go to `/search` and start searching!** 🔍
