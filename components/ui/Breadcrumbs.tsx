'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbSegment {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Generate breadcrumb segments from pathname
  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    if (!pathname || pathname === '/') {
      return [{ label: 'Home', href: '/' }];
    }

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbSegment[] = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Format segment label (capitalize, replace hyphens with spaces)
      let label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Custom labels for specific routes
      const customLabels: Record<string, string> = {
        'archie': 'Archie',
        'projects': 'Projects',
        'tags': 'Tags',
        'files': 'Files',
        'search': 'Search',
        'costs': 'Cost Tracker',
        'models': 'Models',
        'analytics': 'Analytics',
        'settings': 'Settings',
        'dashboard': 'Dashboard',
      };

      label = customLabels[segment] || label;

      breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length === 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 px-4 py-2 bg-gray-950/50 border-b border-gray-800/50">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          {index > 0 && (
            <span className="text-gray-600">/</span>
          )}
          {index === breadcrumbs.length - 1 ? (
            // Current page (not clickable)
            <span className="text-gray-300 font-medium">{crumb.label}</span>
          ) : (
            // Clickable breadcrumb
            <Link
              href={crumb.href}
              className="hover:text-gray-200 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Responsive version that collapses on mobile
export function ResponsiveBreadcrumbs() {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    if (!pathname || pathname === '/') {
      return [{ label: 'Home', href: '/' }];
    }

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbSegment[] = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      let label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const customLabels: Record<string, string> = {
        'archie': 'Archie',
        'projects': 'Projects',
        'tags': 'Tags',
        'files': 'Files',
        'search': 'Search',
        'costs': 'Cost Tracker',
        'models': 'Models',
        'analytics': 'Analytics',
        'settings': 'Settings',
        'dashboard': 'Dashboard',
      };

      label = customLabels[segment] || label;

      breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 px-4 py-2 bg-gray-950/50 border-b border-gray-800/50">
      {/* Mobile: Show only last 2 segments */}
      <div className="flex items-center gap-2 md:hidden">
        {breadcrumbs.length > 2 && (
          <>
            <Link
              href={breadcrumbs[breadcrumbs.length - 2].href}
              className="hover:text-gray-200 transition-colors"
            >
              {breadcrumbs[breadcrumbs.length - 2].label}
            </Link>
            <span className="text-gray-600">/</span>
          </>
        )}
        <span className="text-gray-300 font-medium">
          {breadcrumbs[breadcrumbs.length - 1].label}
        </span>
      </div>

      {/* Desktop: Show all segments */}
      <div className="hidden md:flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && (
              <span className="text-gray-600">/</span>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-300 font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-gray-200 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}
