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
  DocumentTextIcon,
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
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

  // Handle audio file upload for transcription
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();

      // Insert transcript into input
      setInput(prev => prev + (prev ? '\n\n' : '') + data.transcript);

      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio file. Please try again.');
    } finally {
      setIsTranscribing(false);
      // Reset file input
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      className={`px-3 sm:px-6 py-3 sm:py-4 ${
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
        <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              {attachment.type === 'image' && (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded"
                />
              )}
              {attachment.type === 'file' && (
                <DocumentIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
              )}
              {attachment.type === 'audio' && (
                <MicrophoneIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
              )}

              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[100px] sm:max-w-[150px]">
                {attachment.name}
              </span>

              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Action Buttons - Hidden on very small screens, shown in row */}
        <div className="hidden xs:flex gap-0.5 sm:gap-1 mb-1.5 sm:mb-2">
          {/* Image Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 touch-manipulation"
            title="Upload image or file"
          >
            <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Voice Recording */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`p-1.5 sm:p-2 rounded-lg touch-manipulation ${
              isRecording
                ? 'text-red-500 hover:text-red-700 bg-red-100 dark:bg-red-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            <MicrophoneIcon
              className={`w-5 h-5 sm:w-6 sm:h-6 ${isRecording ? 'animate-pulse' : ''}`}
            />
          </button>

          {/* Audio Transcription - Hidden on small screens */}
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={disabled || isTranscribing}
            className={`hidden sm:block p-1.5 sm:p-2 rounded-lg touch-manipulation ${
              isTranscribing
                ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50`}
            title="Upload audio file for transcription"
          >
            <DocumentTextIcon
              className={`w-5 h-5 sm:w-6 sm:h-6 ${isTranscribing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Mobile: Combined upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="xs:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 touch-manipulation mb-1"
          title="Upload"
        >
          <PhotoIcon className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-32 sm:max-h-48 text-base"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!input.trim() && attachments.length === 0)}
          className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5 sm:mb-1 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
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

      {/* Hidden Audio Input for Transcription */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac,.wma,.opus"
        onChange={handleAudioUpload}
        className="hidden"
      />
    </div>
  );
}
