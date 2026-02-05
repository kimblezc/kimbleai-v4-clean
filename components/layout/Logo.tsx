/**
 * KimbleAI Logo Component
 *
 * Displays the rotating D20 icosahedron and KimbleAI text.
 * Clicking either returns to the main page.
 *
 * RULE: This component MUST appear on every page within KimbleAI.
 */

'use client';

import Link from 'next/link';
import D20Icon from '@/components/ui/D20Icon';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { d20: 'sm' as const, text: 'text-lg' },
  md: { d20: 'sm' as const, text: 'text-xl' },
  lg: { d20: 'md' as const, text: 'text-2xl' },
};

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <Link
      href="/"
      className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${className}`}
      title="KimbleAI - Return to Home"
    >
      <D20Icon size={config.d20} rotate={true} />
      {showText && (
        <span className={`font-bold text-white ${config.text}`}>
          KimbleAI
        </span>
      )}
    </Link>
  );
}
