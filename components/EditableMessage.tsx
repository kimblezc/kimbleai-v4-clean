'use client';

import React, { useState, useRef, useEffect } from 'react';
import FormattedMessage from './FormattedMessage';
import { TouchButton } from './TouchButton';
import toast from 'react-hot-toast';

interface EditableMessageProps {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  editedAt?: string | null;
  isOwn?: boolean; // Whether this is the current user's message
  onSave?: (newContent: string) => Promise<void>;
  highlight?: string; // Search term to highlight
}

export default function EditableMessage({
  id,
  content,
  role,
  editedAt,
  isOwn = true,
  onSave,
  highlight,
}: EditableMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editValue]);

  const handleDoubleClick = () => {
    // Only allow editing user's own messages
    if (role === 'user' && isOwn && id && onSave) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!onSave || !editValue.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (editValue === content) {
      // No changes made
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue.trim());
      setIsEditing(false);
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to save message:', error);
      toast.error('Failed to update message');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(content); // Reset to original content
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Highlight search term if provided
  const highlightContent = (text: string) => {
    if (!highlight) return text;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500 text-black px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (isEditing) {
    return (
      <div className="w-full">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-base focus:outline-none focus:border-blue-500 transition-colors resize-none"
          placeholder="Edit your message..."
          rows={3}
        />
        <div className="flex items-center gap-2 mt-2">
          <TouchButton
            onClick={handleSave}
            disabled={isSaving || !editValue.trim() || editValue === content}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </TouchButton>
          <TouchButton
            onClick={handleCancel}
            disabled={isSaving}
            size="sm"
            variant="secondary"
            className="bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </TouchButton>
          <span className="text-xs text-gray-500 ml-2">
            Ctrl+Enter to save • Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`${
        role === 'user' && isOwn && id && onSave
          ? 'cursor-text hover:bg-gray-900/30 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors'
          : ''
      }`}
      title={
        role === 'user' && isOwn && id && onSave
          ? 'Double-click to edit'
          : undefined
      }
    >
      {highlight ? (
        <div style={{
          fontSize: '15px',
          lineHeight: '1.5',
          color: '#ffffff',
          whiteSpace: 'pre-wrap'
        }}>
          {highlightContent(content)}
        </div>
      ) : (
        <FormattedMessage content={content} role={role} />
      )}

      {editedAt && (
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <span className="text-gray-600">✏️</span>
          <span>Edited</span>
          <span className="text-gray-600">•</span>
          <span>{new Date(editedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
