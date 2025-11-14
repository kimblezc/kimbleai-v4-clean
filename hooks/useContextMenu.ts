import { useState, useEffect, useCallback, useRef } from 'react';

export interface Position {
  x: number;
  y: number;
}

export function useContextMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [data, setData] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Show context menu at specific position
  const showContextMenu = useCallback((e: React.MouseEvent, contextData?: any) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200; // Approximate menu width
    const menuHeight = 300; // Approximate menu height

    // Calculate position to keep menu in viewport
    let x = e.clientX;
    let y = e.clientY;

    // Adjust if menu would overflow right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    // Adjust if menu would overflow bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setPosition({ x, y });
    setData(contextData);
    setIsVisible(true);
  }, []);

  // Hide context menu
  const hideContextMenu = useCallback(() => {
    setIsVisible(false);
    setData(null);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Only close if right-clicking outside the menu
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('scroll', hideContextMenu);
      window.addEventListener('resize', hideContextMenu);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('scroll', hideContextMenu);
      window.removeEventListener('resize', hideContextMenu);
    };
  }, [isVisible, hideContextMenu]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, hideContextMenu]);

  return {
    isVisible,
    position,
    data,
    menuRef,
    showContextMenu,
    hideContextMenu,
  };
}
