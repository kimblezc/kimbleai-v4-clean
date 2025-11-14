import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom" (default: 100px)
  behavior?: ScrollBehavior; // 'smooth' or 'auto'
}

export function useAutoScroll(
  dependencies: any[] = [],
  options: UseAutoScrollOptions = {}
) {
  const { threshold = 100, behavior = 'smooth' } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastMessageCountRef = useRef(0);

  // Check if user is at bottom
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return false;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    return distanceFromBottom <= threshold;
  }, [threshold]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);

    // If user scrolls to bottom, reset new message count
    if (atBottom) {
      setNewMessageCount(0);
      lastMessageCountRef.current = dependencies[0]?.length || 0;
    }
  }, [checkIfAtBottom, dependencies]);

  // Scroll to bottom function
  const scrollToBottom = useCallback((force = false) => {
    if (!containerRef.current) return;

    if (force || isAtBottom) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
      setNewMessageCount(0);
      setShowScrollButton(false);
      lastMessageCountRef.current = dependencies[0]?.length || 0;
    }
  }, [isAtBottom, behavior, dependencies]);

  // Auto-scroll when dependencies change
  useEffect(() => {
    const currentMessageCount = dependencies[0]?.length || 0;

    // If new messages arrived and user is not at bottom, increment count
    if (currentMessageCount > lastMessageCountRef.current && !isAtBottom) {
      const newMessages = currentMessageCount - lastMessageCountRef.current;
      setNewMessageCount(prev => prev + newMessages);
    }

    // Auto-scroll if user is at bottom
    if (isAtBottom) {
      scrollToBottom();
    }

    lastMessageCountRef.current = currentMessageCount;
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Keyboard shortcut: End key to scroll to bottom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'End') {
        e.preventDefault();
        scrollToBottom(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToBottom]);

  return {
    containerRef,
    isAtBottom,
    showScrollButton,
    newMessageCount,
    scrollToBottom,
  };
}
