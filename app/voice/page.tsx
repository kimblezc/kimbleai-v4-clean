'use client';

/**
 * Voice Chat Interface
 *
 * Real-time voice conversation interface using OpenAI Realtime API.
 * Features dark D&D theme consistent with Archie dashboard.
 *
 * Features:
 * - Push-to-talk and continuous conversation modes
 * - Real-time audio visualization
 * - Conversation history with timestamps
 * - Voice selection (alloy, echo, shimmer)
 * - Interruption support
 * - Low-latency streaming
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeVoice, RealtimeEvent } from '@/lib/realtime-voice-client';
import { Button } from '@/components/ui/button-shadcn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-shadcn';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Settings, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export default function VoicePage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'alloy' | 'echo' | 'shimmer'>('alloy');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Realtime Voice Client
  const {
    client,
    isConnected,
    isRecording,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    interrupt,
  } = useRealtimeVoice({
    apiKey: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    voice: selectedVoice,
    instructions: `You are Archie, a wise and mystical AI assistant represented as a horned owl with piercing green eyes.
You speak with wisdom and clarity, helping users with their questions and tasks.
Keep responses concise but insightful, as if you're an ancient oracle sharing knowledge.`,
    turnDetection: pushToTalk
      ? { type: 'none' }
      : {
          type: 'server_vad',
          threshold: 0.5,
          prefixPadding: 300,
          silenceDuration: 500,
        },
    onEvent: (event: RealtimeEvent, data: any) => {
      console.log('Voice event:', event, data);

      if (event === 'conversation.item.created' && data.item) {
        addMessage(data.item);
      }

      if (event === 'input_audio_buffer.speech_started') {
        setIsSpeaking(true);
      }

      if (event === 'input_audio_buffer.speech_stopped') {
        setIsSpeaking(false);
      }
    },
    onError: (err) => {
      console.error('Voice error:', err);
    },
  });

  // Add message to conversation
  const addMessage = (item: any) => {
    if (item.type === 'message') {
      const content = item.content
        .map((c: any) => {
          if (c.type === 'text') return c.text;
          if (c.type === 'input_text') return c.text;
          if (c.type === 'audio') return '[Audio message]';
          return '';
        })
        .join(' ');

      setMessages((prev) => [
        ...prev,
        {
          id: item.id,
          role: item.role,
          content,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle connect/disconnect
  const handleToggleConnection = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
      if (!pushToTalk) {
        await startRecording();
      }
    }
  };

  // Handle push-to-talk
  const handlePushToTalk = async () => {
    if (!isConnected) return;

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // Clear conversation
  const handleClearConversation = () => {
    setMessages([]);
    if (client) {
      client.clearHistory();
    }
  };

  // Interrupt AI response
  const handleInterrupt = () => {
    if (client) {
      interrupt();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              🦉 Voice Chat with Archie
            </h1>
            <p className="text-slate-400 mt-2">
              Real-time voice conversation powered by OpenAI Realtime API
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push('/archie')}
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
          >
            ← Back to Archie
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <div className="col-span-2 space-y-6">
          {/* Status Card */}
          <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-400 font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="text-gray-400">Disconnected</span>
                    </div>
                  )}

                  {isSpeaking && (
                    <div className="flex items-center gap-2 ml-4">
                      <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span className="text-purple-400 text-sm">Speaking...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInterrupt}
                    disabled={!isConnected}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <VolumeX className="w-4 h-4 mr-1" />
                    Stop
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearConversation}
                    disabled={messages.length === 0}
                    className="border-slate-500/50 text-slate-400 hover:bg-slate-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Conversation History */}
          <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-purple-300">Conversation</CardTitle>
              <CardDescription className="text-slate-400">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-20">
                  <Mic className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start a conversation!</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'bg-slate-800/50 border border-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-400">
                        {msg.role === 'user' ? '👤 You' : '🦉 Archie'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-200">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                {/* Connect/Disconnect Button */}
                <Button
                  size="lg"
                  onClick={handleToggleConnection}
                  className={`${
                    isConnected
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  } text-white px-8 py-6 text-lg`}
                >
                  {isConnected ? (
                    <>
                      <PhoneOff className="w-6 h-6 mr-2" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Phone className="w-6 h-6 mr-2" />
                      Connect
                    </>
                  )}
                </Button>

                {/* Push-to-Talk Button (only in PTT mode) */}
                {pushToTalk && isConnected && (
                  <Button
                    size="lg"
                    onMouseDown={handlePushToTalk}
                    onMouseUp={handlePushToTalk}
                    onTouchStart={handlePushToTalk}
                    onTouchEnd={handlePushToTalk}
                    className={`${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white px-8 py-6 text-lg`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-6 h-6 mr-2" />
                        Release to Send
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6 mr-2" />
                        Hold to Talk
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Settings Card */}
          <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-purple-300 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voice Selection */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  AI Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as any)}
                  disabled={isConnected}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="alloy">Alloy (Neutral)</option>
                  <option value="echo">Echo (Warm)</option>
                  <option value="shimmer">Shimmer (Soft)</option>
                </select>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Mode
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setPushToTalk(false)}
                    disabled={isConnected}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      !pushToTalk
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    } disabled:opacity-50`}
                  >
                    <div className="font-medium">Continuous</div>
                    <div className="text-xs opacity-75">
                      Voice activity detection
                    </div>
                  </button>

                  <button
                    onClick={() => setPushToTalk(true)}
                    disabled={isConnected}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      pushToTalk
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    } disabled:opacity-50`}
                  >
                    <div className="font-medium">Push-to-Talk</div>
                    <div className="text-xs opacity-75">
                      Hold button to speak
                    </div>
                  </button>
                </div>
              </div>

              {/* API Key (optional) */}
              {!process.env.NEXT_PUBLIC_OPENAI_API_KEY && (
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={isConnected}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Required for voice chat
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-purple-300 text-sm">
                💡 How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-2">
              <p>
                • <strong className="text-purple-300">Continuous mode:</strong> Speak naturally, Archie will respond when you pause
              </p>
              <p>
                • <strong className="text-purple-300">Push-to-talk:</strong> Hold the button while speaking
              </p>
              <p>
                • <strong className="text-purple-300">Interrupt:</strong> Click "Stop" to interrupt Archie mid-response
              </p>
              <p className="pt-2 border-t border-slate-700">
                Using OpenAI Realtime API with gpt-4o-realtime for low-latency voice conversations.
              </p>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="bg-red-900/20 border-red-500/30">
              <CardContent className="pt-6">
                <div className="text-red-400 text-sm">
                  <strong>Error:</strong> {error.message}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
