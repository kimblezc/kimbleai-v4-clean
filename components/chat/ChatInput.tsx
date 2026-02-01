/**
 * Chat Input Component
 *
 * Features:
 * - Text input with auto-resize
 * - File upload (drag & drop)
 * - Image upload (camera on mobile)
 * - Voice input
 * - Send button with loading state
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import {
  PaperAirplaneIcon,
  PhotoIcon,
  DocumentIcon,
  MicrophoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
  conversationId?: string | null;
}

export default function ChatInput({
  onSendMessage,
  disabled,
  conversationId: _conversationId,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle send
  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || disabled) return;

    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  // Process uploaded files
  const processFiles = async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // Handle image
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => [
            ...prev,
            {
              type: 'image',
              url: e.target?.result as string,
              mimeType: file.type,
              name: file.name,
              file,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle other files
        setAttachments(prev => [
          ...prev,
          {
            type: 'file',
            mimeType: file.type,
            name: file.name,
            file,
          },
        ]);
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, []);

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

        setAttachments(prev => [
          ...prev,
          {
            type: 'audio',
            mimeType: 'audio/webm',
            name: 'recording.webm',
            file,
          },
        ]);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div
      className={`px-6 py-4 ${
        isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg z-10">
          <div className="text-blue-600 dark:text-blue-400 text-lg font-medium">
            Drop files to upload
          </div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              {attachment.type === 'image' && (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              {attachment.type === 'file' && (
                <DocumentIcon className="w-8 h-8 text-gray-500" />
              )}
              {attachment.type === 'audio' && (
                <MicrophoneIcon className="w-8 h-8 text-gray-500" />
              )}

              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                {attachment.name}
              </span>

              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Action Buttons */}
        <div className="flex gap-1 mb-2">
          {/* Image Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            title="Upload image or file"
          >
            <PhotoIcon className="w-6 h-6" />
          </button>

          {/* Voice Recording */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`p-2 rounded-lg ${
              isRecording
                ? 'text-red-500 hover:text-red-700 bg-red-100 dark:bg-red-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            <MicrophoneIcon
              className={`w-6 h-6 ${isRecording ? 'animate-pulse' : ''}`}
            />
          </button>
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-48"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!input.trim() && attachments.length === 0)}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-1"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
