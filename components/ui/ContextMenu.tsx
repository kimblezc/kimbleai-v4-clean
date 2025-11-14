'use client';

import React, { forwardRef } from 'react';
import { Position } from '@/hooks/useContextMenu';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  shortcut?: string;
}

interface ContextMenuProps {
  isVisible: boolean;
  position: Position;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ isVisible, position, items, onClose }, ref) => {
    if (!isVisible) return null;

    const handleItemClick = (item: ContextMenuItem) => {
      if (!item.disabled && !item.divider) {
        item.onClick();
        onClose();
      }
    };

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
        />

        {/* Menu */}
        <div
          ref={ref}
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] animate-fade-in"
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`,
          }}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={index}
                  className="h-px bg-gray-800 my-1"
                />
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between gap-3 transition-colors ${
                  item.disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : item.danger
                    ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon && <span className="text-base">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-gray-600">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
