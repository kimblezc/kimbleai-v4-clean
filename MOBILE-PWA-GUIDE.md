# KimbleAI v4 - Mobile & PWA Implementation Guide

## Overview

KimbleAI v4 is now **fully mobile-responsive** and supports **Progressive Web App (PWA)** installation on all devices. This guide covers the mobile-first design, PWA features, and testing procedures.

---

## Mobile Responsiveness

### Breakpoints

We use Tailwind CSS breakpoints for responsive design:

- **Mobile (sm)**: `< 640px` - Single column, bottom navigation
- **Tablet (md)**: `640px - 1024px` - Two columns, collapsible sidebar
- **Desktop (lg+)**: `> 1024px` - Three columns, full sidebar

### Key Mobile Features

#### 1. Bottom Navigation (`MobileNav.tsx`)
- Fixed bottom navigation bar on mobile devices
- 5 main tabs: Chat, Gmail, Files, Calendar, More
- Large touch targets (44x44px minimum)
- Active state indicators
- Safe area support for notched devices

#### 2. Hamburger Menu (`MobileMenu.tsx`)
- Slide-in sidebar menu from left
- User switcher (Zach/Rebecca)
- Project selector with conversation counts
- Settings and account options
- Smooth animations and backdrop

#### 3. Touch-Optimized Components (`TouchButton.tsx`)
- `TouchButton`: Large, easily tappable buttons with haptic feedback
- `FAB`: Floating Action Button for primary actions
- `IconButton`: Icon-only buttons with proper touch targets
- `PullToRefresh`: Pull-down to refresh functionality

#### 4. Responsive Layout (`ResponsiveLayout.tsx`)
- Automatic device detection
- Orientation change handling
- Safe area insets for notched devices (iPhone X+)
- Conditional rendering based on device type

---

## PWA Features

### Installation

#### Android (Chrome/Edge)
1. Visit KimbleAI in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home screen"
3. Tap "Install" in the prompt
4. App icon appears on home screen

#### iOS (Safari)
1. Visit KimbleAI in Safari
2. Tap the Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. App icon appears on home screen

#### Desktop (Chrome/Edge)
1. Visit KimbleAI in Chrome/Edge
2. Look for install icon in address bar
3. Click "Install"
4. App opens in standalone window

### PWA Components

#### 1. PWA Install Prompt (`PWAInstallPrompt.tsx`)
- Automatic install prompt after 30 seconds
- iOS-specific instructions modal
- Update notification banner
- Dismissible with localStorage persistence

#### 2. Service Worker (`public/service-worker.js`)
- Offline support
- Caching strategy:
  - **Static assets**: Cache-first
  - **Images**: Cache-first with network fallback
  - **API calls**: Network-only (with offline error handling)
  - **Dynamic content**: Network-first with cache fallback
- Background sync for offline actions
- Push notification support

#### 3. Web App Manifest (`public/manifest.json`)
- App name and branding
- Icons (72x72 to 512x512)
- Display mode: `standalone`
- Theme color: `#2563eb` (blue)
- Shortcuts for quick actions
- File handlers for audio, images, PDFs
- Share target integration

---

## Component Updates

### Gmail Inbox (Mobile-Responsive)
- **Mobile**: Dropdown label selector, full-screen email view
- **Tablet/Desktop**: Sidebar with labels, split view
- Back button on mobile for email details
- Swipe gestures planned for future release

### Advanced File Viewer (Mobile-Responsive)
- **Touch-optimized controls**: Larger buttons for PDF navigation
- **Pinch-to-zoom**: Works on images and PDFs
- **Responsive tabs**: Horizontal scroll on mobile
- **Full-screen mode**: Email attachments and files

### Main Page (Mobile-Responsive)
- Uses `ResponsiveLayout` wrapper
- Conditionally renders mobile nav
- Hamburger menu for sidebar
- Responsive grid layouts

---

## Testing

### Manual Testing Checklist

#### iPhone (Safari)
- [ ] Page loads without horizontal scroll
- [ ] Bottom navigation visible and functional
- [ ] Hamburger menu opens smoothly
- [ ] Touch targets at least 44x44px
- [ ] Text readable without zoom
- [ ] PWA installable via Share menu
- [ ] Safe area insets respected (notch area)
- [ ] Orientation changes handled gracefully

#### Android (Chrome)
- [ ] Page loads without horizontal scroll
- [ ] Bottom navigation visible and functional
- [ ] Install prompt appears
- [ ] Touch interactions smooth
- [ ] PWA installable via menu
- [ ] Offline mode works (service worker)
- [ ] Push notifications work (if enabled)

#### iPad (Safari)
- [ ] Two-column layout on tablet size
- [ ] Touch targets appropriate
- [ ] Sidebar collapsible
- [ ] Split-screen multitasking works

#### Desktop
- [ ] Three-column layout
- [ ] Full sidebar visible
- [ ] No mobile navigation
- [ ] Install prompt in address bar

### Automated Testing

Run the responsive testing script:

```bash
npm run test:responsive
```

This will:
- Test multiple viewport sizes
- Screenshot each device/size
- Verify touch target sizes
- Check PWA manifest and service worker
- Test accessibility features
- Generate HTML report

Screenshots saved to: `screenshots/`
Report saved to: `test-results/responsive-report.json`

---

## Performance Optimizations

### Mobile-Specific
1. **Lazy loading**: Images and components load on-demand
2. **Code splitting**: Separate bundles for mobile/desktop
3. **Reduced animations**: On low-end devices
4. **Optimized images**: WebP format with fallbacks
5. **Minimal JavaScript**: Core functionality only

### PWA Caching
1. **Static assets**: Cached immediately on install
2. **Dynamic content**: Cached after first load
3. **Images**: Cached indefinitely
4. **API responses**: Network-first for freshness

---

## Customization

### Adding New Mobile Components

```tsx
import { TouchButton } from '@/components/TouchButton';
import { useDeviceType } from '@/components/ResponsiveLayout';

function MyComponent() {
  const deviceType = useDeviceType();

  return (
    <div className="p-4 md:p-6">
      <TouchButton
        variant="primary"
        size={deviceType === 'mobile' ? 'lg' : 'md'}
        fullWidth={deviceType === 'mobile'}
      >
        My Action
      </TouchButton>
    </div>
  );
}
```

### Custom Breakpoints

Add custom breakpoints in `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        '3xl': '1920px',
      },
    },
  },
}
```

---

## Troubleshooting

### PWA Not Installing

**Problem**: Install prompt doesn't appear

**Solutions**:
1. Verify manifest is valid: `https://manifest-validator.appspot.com/`
2. Check service worker registration in DevTools
3. Ensure HTTPS (required for PWA)
4. Clear browser cache and try again

### Horizontal Scroll on Mobile

**Problem**: Page scrolls horizontally

**Solutions**:
1. Check for fixed-width elements: Use `max-w-full`
2. Verify viewport meta tag in layout
3. Test with `overflow-x-hidden` temporarily
4. Run responsive testing script to identify issue

### Touch Targets Too Small

**Problem**: Buttons hard to tap on mobile

**Solutions**:
1. Use `TouchButton` component instead of regular buttons
2. Add `min-h-[44px] min-w-[44px]` classes
3. Increase padding on mobile: `py-3 md:py-2`

### Service Worker Not Updating

**Problem**: Changes not reflected after deploy

**Solutions**:
1. Update `CACHE_VERSION` in `service-worker.js`
2. Use "Skip waiting" in DevTools
3. Clear all site data in browser settings
4. Send update message from app:

```js
if (registration.waiting) {
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload();
}
```

---

## Best Practices

### Mobile UI/UX
1. **Touch targets**: Minimum 44x44px (48x48px ideal)
2. **Font size**: Minimum 16px for body text (prevents zoom)
3. **Contrast**: WCAG AA standard (4.5:1 for text)
4. **Loading states**: Always show progress indicators
5. **Error messages**: Clear, actionable, visible
6. **Forms**: Stack vertically on mobile, use native inputs

### PWA
1. **Offline first**: Design for offline, enhance with online
2. **Install prompt**: Show after user engagement (30s+)
3. **Update notification**: Prompt user when new version available
4. **Network fallbacks**: Always handle offline gracefully
5. **Icon sizes**: Provide all required sizes (192x192, 512x512)

### Performance
1. **Code splitting**: Load only what's needed
2. **Image optimization**: Use Next.js Image component
3. **Lazy loading**: Components below fold
4. **Debounce**: Input handlers and API calls
5. **Memoization**: Expensive calculations and renders

---

## Future Enhancements

### Planned Features
- [ ] Swipe gestures for email actions
- [ ] Offline message composition
- [ ] Voice input support
- [ ] Haptic feedback on interactions
- [ ] Dark/light theme toggle
- [ ] Biometric authentication
- [ ] Background sync for large uploads
- [ ] Share sheet integration

### Under Consideration
- [ ] Native app wrappers (Capacitor/Tauri)
- [ ] Desktop PWA shortcuts
- [ ] Advanced caching strategies
- [ ] WebRTC for real-time features
- [ ] Web Bluetooth for IoT integration

---

## Resources

### Documentation
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://web.dev/add-manifest/)
- [Responsive Design](https://web.dev/responsive-web-design-basics/)

### Tools
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
- [Manifest Validator](https://manifest-validator.appspot.com/)
- [BrowserStack](https://www.browserstack.com/) - Device testing
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)

### Testing Services
- [LambdaTest](https://www.lambdatest.com/) - Cross-browser testing
- [Percy](https://percy.io/) - Visual regression testing
- [Sauce Labs](https://saucelabs.com/) - Mobile device testing

---

## Support

For issues or questions:
1. Check this guide first
2. Run the test suite: `npm run test:responsive`
3. Review browser console for errors
4. Check DevTools Application tab for PWA status
5. Contact support with screenshots and device info

---

**Version**: 1.0.0
**Last Updated**: 2025-10-11
**Maintained by**: KimbleAI Development Team
