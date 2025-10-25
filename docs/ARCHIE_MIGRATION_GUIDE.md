# Archie Dashboard Migration Guide

## Overview
This guide explains the changes made to the Archie Dashboard redesign and how to navigate the new interface.

---

## What Changed

### Sidebar Navigation
**Before**:
- Dashboard
- Projects
- Files
- Chat
- Search
- Integrations

**After**:
- Chat
- **Archie** (NEW - Featured with gradient styling)
- Projects
- Files
- Search

### New Route
- **`/archie`** - Unified Archie Dashboard (consolidated hub for all AI features)

### Existing Routes (Still Work)
- `/transcribe` - Transcription from Google Drive
- `/devices` - Device sync and continuity
- `/drive` - Drive Intelligence
- `/agent` - Agent task management (original dashboard)

---

## How to Use the New Dashboard

### Accessing Archie Dashboard
1. Click the **🦉 Archie** button in the sidebar
2. Or navigate directly to `/archie`

### Finding Features
All Archie capabilities are now visible on one page:

| Feature | What It Does | Where It Goes |
|---------|--------------|---------------|
| 🎙️ Transcribe from Drive | Convert audio/video to text | `/transcribe` |
| 📁 Drive Intelligence | AI-powered file organization | `/drive` |
| 🔄 Device Sync | Cross-device continuity | `/devices` |
| 🔍 Smart Insights | AI recommendations | `/agent` |
| ✅ Task Management | View auto-generated tasks | `/agent` |
| 📊 Activity Log | See Archie's actions | `/agent` |

### Understanding Stats
The dashboard shows real-time statistics:
- **Transcriptions**: Count of completed transcriptions
- **Devices**: Number of active/connected devices
- **Active Tasks**: Pending + in-progress tasks
- **Insights**: New findings from last 7 days
- **24h Activity**: Agent actions in last 24 hours

---

## For Developers

### New Components
Created in `components/archie/`:
- `FeatureCard.tsx` - Reusable feature card with hover effects
- `DashboardHeader.tsx` - Page header with Archie branding
- `StatusBadge.tsx` - Metric display badges
- `QuickActions.tsx` - Quick action grid

### Sidebar Changes
File: `components/layout/Sidebar.tsx`

**Key Changes**:
1. Navigation array updated
2. Added `featured: true` property for Archie
3. Conditional gradient styling for featured items
4. Added "AI" badge for Archie button

### Database Queries
The dashboard fetches stats from Supabase:
```typescript
// Transcriptions count
.from('transcriptions').select('*', { count: 'exact' })

// Active devices
.from('device_sessions').select('*', { count: 'exact' })

// Tasks
.from('agent_tasks').select('*', { count: 'exact' })

// Insights
.from('agent_findings').select('*', { count: 'exact' })

// Activity logs
.from('agent_logs').select('*', { count: 'exact' })
```

---

## Breaking Changes
**None** - All existing functionality is preserved.

---

## Rollback Plan
If needed, reverting is simple:

### Revert Sidebar
```tsx
// In components/layout/Sidebar.tsx, replace navigation with:
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Projects', href: '/projects', icon: '📋' },
  { name: 'Files', href: '/files', icon: '📁' },
  { name: 'Chat', href: '/', icon: '💬' },
  { name: 'Search', href: '/search', icon: '🔍' },
  { name: 'Integrations', href: '/integrations', icon: '🔗' },
];
```

### Revert Component Changes
Remove the custom styling for the featured button and restore default styling.

---

## Testing Instructions

### 1. Visual Testing
- [ ] Navigate to `/archie`
- [ ] Verify all 6 feature cards display correctly
- [ ] Check stats show numbers (not zeros or errors)
- [ ] Hover over cards to see animations
- [ ] Resize browser to test responsive design

### 2. Navigation Testing
- [ ] Click each feature card
- [ ] Verify correct page loads
- [ ] Use back button to return to dashboard
- [ ] Test quick actions at bottom
- [ ] Verify sidebar Archie button highlights when on `/archie`

### 3. Mobile Testing
- [ ] Open on mobile device (or DevTools mobile view)
- [ ] Verify single-column layout
- [ ] Check all text is readable
- [ ] Ensure cards are tap-friendly
- [ ] Test sidebar on mobile

### 4. Accessibility Testing
- [ ] Tab through all interactive elements
- [ ] Verify focus states are visible
- [ ] Check color contrast (use DevTools)
- [ ] Test with screen reader (optional)

### 5. Performance Testing
- [ ] Open DevTools Network tab
- [ ] Navigate to `/archie`
- [ ] Check page load time (should be < 1s)
- [ ] Verify no console errors
- [ ] Check Lighthouse score

---

## Common Issues & Solutions

### Issue: Stats Show Zero
**Cause**: Database tables empty or user ID mismatch
**Solution**: Verify Supabase connection and userId in code (currently hardcoded to "zach")

### Issue: Cards Not Clickable
**Cause**: CSS z-index conflict
**Solution**: Verify `relative z-10` is applied to card content

### Issue: Gradient Not Showing
**Cause**: Tailwind purge removed classes
**Solution**: Ensure all used classes are in content paths in `tailwind.config.js`

### Issue: Mobile Layout Broken
**Cause**: Grid breakpoints not working
**Solution**: Check Tailwind responsive prefixes (`md:`, `lg:`)

---

## Support

### Resources
- **Design Documentation**: `docs/ARCHIE_DASHBOARD_DESIGN.md`
- **Component Source**: `components/archie/`
- **Dashboard Source**: `app/archie/page.tsx`

### Questions?
If you encounter issues not covered here, check:
1. Console logs for errors
2. Network tab for failed requests
3. Supabase logs for database issues

---

## Next Steps

### Recommended Follow-Ups
1. **Monitor Analytics**: Track which features users click most
2. **Gather Feedback**: Ask users about the new layout
3. **Optimize Queries**: Add indexes if stats queries are slow
4. **Add Features**: Consider adding new feature cards as Archie grows

### Future Enhancements
- Real-time WebSocket updates for live stats
- User customization (reorder/hide cards)
- Feature usage analytics
- Onboarding tour for first-time users

---

*Last Updated: 2025-10-25*
