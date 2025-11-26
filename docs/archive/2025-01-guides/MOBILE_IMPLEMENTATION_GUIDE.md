# Mobile Implementation Guide

**Quick reference for implementing mobile optimizations in KimbleAI**

---

## Before You Start

**Read**: MOBILE_ANALYSIS_REPORT.md for full context

**This guide shows**: Step-by-step code changes to make app/page.tsx mobile-friendly

---

## Step 1: Add Mobile Components Import

**File**: `app/page.tsx` (top of file)

```tsx
// Add these imports
import { MobileMenu } from '@/components/MobileMenu';
import { MobileNav } from '@/components/MobileNav';
import { TouchButton, IconButton } from '@/components/TouchButton';
import { useDeviceType, useIsPWA } from '@/components/ResponsiveLayout';
import { ConfirmDialog } from '@/components/ConfirmDialog'; // You need to create this
```

---

## Step 2: Add State for Mobile Features

**File**: `app/page.tsx` (inside component)

```tsx
export default function Home() {
  // ... existing state ...

  // Add these new state variables
  const deviceType = useDeviceType();
  const isPWA = useIsPWA();
  const isMobile = deviceType === 'mobile';

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'gmail' | 'files' | 'calendar' | 'more'>('chat');

  // ... rest of component ...
}
```

---

## Step 3: Replace Window Confirm/Prompt

**File**: `app/page.tsx`

### Before:
```tsx
<button
  onClick={() => {
    const newName = prompt(`Edit project name:`, project.name);
    if (newName && newName !== project.name) {
      updateProject(project.id, { name: newName });
    }
  }}
  className="p-1.5 text-gray-600 hover:text-blue-400 text-xs"
  title="Edit project"
>
  ✏️
</button>
```

### After:
```tsx
<IconButton
  icon={<span className="text-base">✏️</span>}
  label="Edit project"
  onClick={() => {
    // For now, keep prompt for desktop, add mobile modal later
    const newName = prompt(`Edit project name:`, project.name);
    if (newName && newName !== project.name) {
      updateProject(project.id, { name: newName });
    }
  }}
  variant="ghost"
/>
```

**Delete button** - same pattern:
```tsx
<IconButton
  icon={<span className="text-base">🗑️</span>}
  label="Delete project"
  onClick={() => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        deleteProject(project.id);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  }}
  variant="ghost"
/>
```

---

## Step 4: Replace Sidebar with Mobile-Responsive Version

**File**: `app/page.tsx`

### Before:
```tsx
{/* Sidebar */}
<div className="sidebar w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
  {/* ... sidebar content ... */}
</div>
```

### After:
```tsx
{/* Mobile Menu (shows on mobile) */}
<MobileMenu
  isOpen={isMobileSidebarOpen}
  onClose={() => setIsMobileSidebarOpen(false)}
  currentUser={currentUser}
  onUserChange={(user) => setCurrentUser(user as 'zach' | 'rebecca')}
  projects={projects.map(p => ({
    id: p.id,
    name: p.name,
    conversations: conversationsByProject[p.id]?.length || 0
  }))}
  currentProject={currentProject}
  onProjectChange={(projectId) => {
    selectProject(projectId);
    setIsMobileSidebarOpen(false);
  }}
/>

{/* Desktop Sidebar (hidden on mobile) */}
<div className="hidden md:flex sidebar w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
  {/* Keep existing sidebar content for desktop */}
  {/* ... existing sidebar JSX ... */}
</div>
```

---

## Step 5: Update Mobile Menu Button

**File**: `app/page.tsx`

### Before:
```tsx
<button
  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
  className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
>
  Menu
</button>
```

### After:
```tsx
{isMobile && (
  <TouchButton
    onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
    className="md:hidden fixed top-4 left-4 z-50"
    size="sm"
    variant="secondary"
  >
    Menu
  </TouchButton>
)}
```

---

## Step 6: Optimize Input Area for Mobile

**File**: `app/page.tsx`

### Before:
```tsx
<div className="border-t border-gray-800 bg-gray-950 p-4">
  <div className="max-w-3xl mx-auto">
    <div className="flex items-end gap-2">
      <button
        onClick={() => setShowModelSelector(!showModelSelector)}
        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-400 transition-colors"
        title="Select model"
      >
        {selectedModel.replace('claude-', '').replace('gpt-', '')}
      </button>

      <input /* ... */ />

      <button
        onClick={handleSendMessage}
        disabled={!input.trim() || sending}
        className={/* ... */}
      >
        Send
      </button>
    </div>
  </div>
</div>
```

### After:
```tsx
<div className={`border-t border-gray-800 bg-gray-950 p-3 md:p-4 ${isMobile ? 'safe-padding-bottom pb-20' : ''}`}>
  <div className="max-w-3xl mx-auto">
    <div className="flex items-end gap-2">
      {/* Model Selector */}
      <TouchButton
        onClick={() => setShowModelSelector(!showModelSelector)}
        size="sm"
        variant="ghost"
        className="flex-shrink-0 hidden sm:flex"
      >
        {selectedModel.replace('claude-', '').replace('gpt-', '')}
      </TouchButton>

      {/* Input Field */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        placeholder="Ask me anything..."
        disabled={sending}
        className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-base focus:outline-none focus:border-gray-600 transition-colors min-h-[44px]"
      />

      {/* Send Button */}
      <TouchButton
        onClick={handleSendMessage}
        disabled={!input.trim() || sending}
        variant={input.trim() && !sending ? 'primary' : 'secondary'}
        size="md"
        className={input.trim() && !sending ? 'bg-white text-black hover:bg-gray-200' : ''}
      >
        {isMobile ? '→' : 'Send'}
      </TouchButton>
    </div>
  </div>
</div>
```

---

## Step 7: Add Bottom Navigation (Mobile Only)

**File**: `app/page.tsx` (at the end of return statement, before closing div)

```tsx
export default function Home() {
  // ... component code ...

  const handleMobileTabChange = (tab: string) => {
    switch (tab) {
      case 'chat':
        // Already on chat page
        break;
      case 'gmail':
        window.location.href = '/family/email';
        break;
      case 'files':
        window.location.href = '/files';
        break;
      case 'calendar':
        window.location.href = '/family/calendar';
        break;
      case 'more':
        setIsMobileSidebarOpen(true);
        break;
    }
    setMobileActiveTab(tab as any);
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* ... existing content ... */}

      {/* Mobile Bottom Navigation (only on mobile) */}
      {isMobile && (
        <MobileNav
          activeTab={mobileActiveTab}
          onTabChange={handleMobileTabChange}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
```

---

## Step 8: Mobile-Optimize Model Selector Modal

**File**: `app/page.tsx`

### Before:
```tsx
{showModelSelector && (
  <div
    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    onClick={() => setShowModelSelector(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4"
    >
      <h2 className="text-xl font-semibold mb-4">Select Model</h2>
      <ModelSelector /* ... */ />
    </div>
  </div>
)}
```

### After:
```tsx
{showModelSelector && (
  <div
    className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
    onClick={() => setShowModelSelector(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-gray-900 border border-gray-700 rounded-t-xl sm:rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto m-0 sm:m-4 animate-slide-up"
    >
      {/* Swipe indicator (mobile only) */}
      <div className="swipe-indicator sm:hidden" />

      <h2 className="text-xl font-semibold mb-4">Select Model</h2>
      <ModelSelector
        selectedModel={selectedModel}
        onSelect={(model) => {
          setSelectedModel(model);
          setShowModelSelector(false);
        }}
        estimatedTokens={{ input: 1000, output: 500 }}
      />
    </div>
  </div>
)}
```

---

## Step 9: Create ConfirmDialog Component

**File**: `components/ConfirmDialog.tsx` (new file)

```tsx
'use client';

import { TouchButton } from './TouchButton';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    warning: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800',
    info: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-2xl animate-slide-up"
      >
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-300 mb-6 whitespace-pre-line leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <TouchButton
            onClick={onCancel}
            variant="ghost"
            fullWidth
            size="md"
          >
            {cancelText}
          </TouchButton>
          <TouchButton
            onClick={onConfirm}
            className={variantStyles[variant]}
            fullWidth
            size="md"
          >
            {confirmText}
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 10: Add PWA Icons

### 1. Generate Icons

Use an online tool like [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator):

1. Upload your D20 logo
2. Generate all sizes
3. Download ZIP
4. Extract to `public/`

### 2. Update manifest.json

**File**: `public/manifest.json`

```json
{
  "name": "KimbleAI",
  "short_name": "KimbleAI",
  "description": "AI-Powered Productivity Platform - Roll for Insight",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#4a9eff",
  "icons": [
    {
      "src": "/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3. Update Service Worker Cache

**File**: `public/service-worker.js`

```javascript
// Update STATIC_ASSETS array
const STATIC_ASSETS = [
  '/',
  '/globals.css',
  '/manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
];
```

---

## Testing Checklist

After implementing changes, test:

### Desktop Browser (Chrome)
- [ ] Sidebar still works
- [ ] Model selector modal still works
- [ ] Project edit/delete still works
- [ ] Chat input still works
- [ ] No console errors

### Mobile Emulation (Chrome DevTools)
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Test:
   - [ ] Mobile menu opens/closes
   - [ ] Bottom navigation appears
   - [ ] Touch targets are ≥44px (enable "Show rulers")
   - [ ] Model selector slides from bottom
   - [ ] Confirm dialog works
   - [ ] Input area has proper padding
   - [ ] No horizontal scroll

### Real Device Testing
- [ ] Install PWA on iPhone
- [ ] Install PWA on Android
- [ ] Test all features
- [ ] Test offline mode
- [ ] Test in landscape orientation

### Lighthouse Mobile Audit
- [ ] Run Lighthouse in mobile mode
- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 95
- [ ] Best Practices ≥ 95
- [ ] PWA ✅ Installable

---

## Troubleshooting

### Issue: TouchButton not found

**Solution**: Make sure you have TouchButton.tsx in components/

### Issue: MobileMenu not found

**Solution**: Make sure you have MobileMenu.tsx in components/

### Issue: useDeviceType not found

**Solution**: Make sure you have ResponsiveLayout.tsx in components/

### Issue: Bottom nav overlaps content

**Solution**: Add `pb-20` to main content area when mobile nav is visible

### Issue: Modal doesn't slide up

**Solution**: Make sure animate-slide-up is defined in globals.css (it already is)

### Issue: Icons not showing in PWA

**Solution**:
1. Generate PNG icons (not just SVG)
2. Add to public/ folder
3. Update manifest.json
4. Clear browser cache
5. Reinstall PWA

---

## Next Steps

After implementing these changes:

1. **Test thoroughly** on real devices
2. **Run Lighthouse audit** and fix any issues
3. **Gather user feedback** on mobile experience
4. **Iterate** based on analytics and feedback
5. **Monitor** mobile-specific metrics

---

## Additional Resources

- [MOBILE_ANALYSIS_REPORT.md](./MOBILE_ANALYSIS_REPORT.md) - Full analysis
- [TouchButton.tsx](./components/TouchButton.tsx) - Touch-optimized buttons
- [MobileMenu.tsx](./components/MobileMenu.tsx) - Mobile sidebar menu
- [MobileNav.tsx](./components/MobileNav.tsx) - Bottom navigation
- [ResponsiveLayout.tsx](./components/ResponsiveLayout.tsx) - Layout wrapper & hooks

---

**Questions?** See MOBILE_ANALYSIS_REPORT.md or ask in #dev-chat
