'use client';

import React from 'react';
import D20Dice from './D20Dice';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message = 'Loading...',
  fullScreen = false
}: LoadingScreenProps) {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-6">
        {/* Animated D20 Dice */}
        <D20Dice size={80} spinning={true} />

        {/* Loading message */}
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-blue-400">{message}</p>

          {/* Animated dots */}
          <div className="flex gap-1 justify-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
