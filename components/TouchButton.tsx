'use client';

import React from 'react';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function TouchButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled = false,
  ...props
}: TouchButtonProps) {
  const baseStyles = 'btn-touch inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/30',
    secondary: 'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg shadow-red-500/30',
    ghost: 'bg-transparent hover:bg-gray-800 active:bg-gray-700 text-gray-300 hover:text-white',
  };

  const sizeStyles = {
    sm: 'text-sm px-3 py-2 min-h-[40px]',
    md: 'text-base px-4 py-3 min-h-[44px]',
    lg: 'text-lg px-6 py-4 min-h-[52px]',
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

// Floating Action Button (FAB)
interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FAB({
  icon,
  position = 'bottom-right',
  className = '',
  ...props
}: FABProps) {
  const positionStyles = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <button
      className={`fab ${positionStyles[position]} w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-xl shadow-blue-500/50 flex items-center justify-center transition-all active:scale-95 ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}

// Icon Button (for touch-optimized icon-only buttons)
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // For accessibility
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  className = '',
  ...props
}: IconButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white',
    ghost: 'bg-transparent hover:bg-gray-800 active:bg-gray-700 text-gray-300 hover:text-white',
  };

  return (
    <button
      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg flex items-center justify-center transition-all active:scale-95 ${variantStyles[variant]} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}

// Pull to Refresh Indicator
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  threshold?: number;
  children: React.ReactNode;
}

export function PullToRefresh({
  onRefresh,
  threshold = 80,
  children,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const startY = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    startY.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div
          className={`w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: `rotate(${pullDistance * 2}deg)`,
          }}
        />
      </div>

      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}
