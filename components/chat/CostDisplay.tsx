/**
 * Cost Display Component
 *
 * Shows current conversation cost
 */

'use client';

interface CostDisplayProps {
  cost: number;
}

export default function CostDisplay({ cost }: CostDisplayProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Conversation Cost:
      </div>
      <div className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
        ${cost.toFixed(4)}
      </div>
    </div>
  );
}
