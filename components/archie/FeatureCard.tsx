'use client';

import React from 'react';
import Link from 'next/link';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  stats?: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal';
  badge?: string;
}

const colorMap = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    hover: 'hover:border-blue-500/50 hover:bg-blue-500/15',
    shadow: 'hover:shadow-blue-500/20'
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    hover: 'hover:border-purple-500/50 hover:bg-purple-500/15',
    shadow: 'hover:shadow-purple-500/20'
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    hover: 'hover:border-green-500/50 hover:bg-green-500/15',
    shadow: 'hover:shadow-green-500/20'
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    hover: 'hover:border-orange-500/50 hover:bg-orange-500/15',
    shadow: 'hover:shadow-orange-500/20'
  },
  pink: {
    gradient: 'from-pink-500 to-pink-600',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    hover: 'hover:border-pink-500/50 hover:bg-pink-500/15',
    shadow: 'hover:shadow-pink-500/20'
  },
  teal: {
    gradient: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
    hover: 'hover:border-teal-500/50 hover:bg-teal-500/15',
    shadow: 'hover:shadow-teal-500/20'
  }
};

export function FeatureCard({
  icon,
  title,
  description,
  href,
  stats,
  color,
  badge
}: FeatureCardProps) {
  const colors = colorMap[color];

  return (
    <Link
      href={href}
      className={`
        group relative overflow-hidden
        bg-gray-900/50 backdrop-blur-sm
        border-2 ${colors.border}
        rounded-2xl p-6
        transition-all duration-300 ease-out
        ${colors.hover}
        hover:shadow-xl ${colors.shadow}
        hover:scale-[1.02]
        cursor-pointer
      `}
    >
      {/* Gradient overlay on hover */}
      <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-10
        bg-gradient-to-br ${colors.gradient}
        transition-opacity duration-300
      `} />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon and Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`
            text-5xl
            filter drop-shadow-lg
            group-hover:scale-110
            transition-transform duration-300
          `}>
            {icon}
          </div>
          {badge && (
            <span className={`
              px-3 py-1 rounded-full text-xs font-bold
              ${colors.bg} ${colors.text}
              border ${colors.border}
            `}>
              {badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2 group-hover:${colors.text} transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        {/* Stats */}
        {stats && (
          <div className={`
            flex items-center gap-2 text-sm font-medium ${colors.text}
            ${colors.bg} rounded-lg px-3 py-2
            border ${colors.border}
          `}>
            <span>{stats}</span>
          </div>
        )}

        {/* Arrow indicator */}
        <div className={`
          mt-4 flex items-center gap-2 text-sm font-medium ${colors.text}
          opacity-0 group-hover:opacity-100
          transform translate-x-0 group-hover:translate-x-1
          transition-all duration-300
        `}>
          <span>Open</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
