// components/agents/AudioIntelligenceDashboard.tsx
// Advanced Audio Intelligence Dashboard for meeting insights and transcription management

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  Play,
  Pause,
  Square,
  Mic,
  Users,
  MessageSquare,
  Clock,
  TrendingUp,
  Search,
  Download,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  CheckSquare,
  AlertCircle,
  Lightbulb,
  FileAudio,
  Brain,
  Zap,
  Target
} from 'lucide-react';

interface AudioSession {
  id: string;
  filename: string;
  duration: number;
  speakerCount: number;
  created_at: string;
  meeting_type: string;
  processing_status: 'processing' | 'completed' | 'failed';
  analysis_data?: any;
  transcription_data?: any;
}

interface SpeakerAnalysis {
  speakers: any[];
  speakingTime: { [key: string]: number };
  confidence: { overall: number };
  insights: {
    dominantSpeaker: string;
    collaborationLevel: number;
    meetingBalance: number;
  };
}

interface MeetingInsights {
  summary: {
    brief: string;
    keyPoints: string[];
  };
  actionItems: any[];
  sentiment: {
    overall: { sentiment: number; label: string };
  };
  topics: any[];
}

export default function AudioIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('upload');
  const [sessions, setSessions] = useState<AudioSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AudioSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioAnalytics, setAudioAnalytics] = useState<any>(null);
  const [speakerAnalysis, setSpeakerAnalysis] = useState<SpeakerAnalysis | null>(null);
  const [meetingInsights, setMeetingInsights] = useState<MeetingInsights | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [realTimeTranscript, setRealTimeTranscript] = useState('');
  const [capabilities, setCapabilities] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadSessions();
    loadAudioAnalytics();
    loadCapabilities();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/agents/audio-intelligence?action=sessions&userId=zach');
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadAudioAnalytics = async () => {
    try {
      const response = await fetch('/api/agents/audio-intelligence?action=analytics&userId=zach');
      const data = await response.json();
      if (data.success) {
        setAudioAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadCapabilities = async () => {
    try {
      const response = await fetch('/api/agents/audio-intelligence?action=capabilities');
      const data = await response.json();
      if (data.success) {
        setCapabilities(data.capabilities);
      }
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('action', 'transcribe');
      formData.append('audioFile', file);
      formData.append('userId', 'zach');
      formData.append('options', JSON.stringify({
        enableSpeakerDiarization: true,
        includeEmotions: true,
        meetingType: 'general',
        analysisDepth: 'comprehensive'
      }));

      const response = await fetch('/api/agents/audio-intelligence', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadProgress(100);
        await loadSessions();

        // Auto-select the new session for analysis
        if (data.result.transcriptionId) {
          await analyzeSession(data.result.transcriptionId);
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        await handleFileUpload(audioFile);

        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      alert('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzeSession = async (sessionId: string) => {
    setIsAnalyzing(true);

    try {
      // Get comprehensive analysis
      const analysisResponse = await fetch('/api/agents/audio-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_meeting',
          transcriptionId: sessionId,
          options: {
            analysisDepth: 'comprehensive',
            generateActionItems: true,
            includeEmotions: true,
            extractKeyMoments: true
          }
        })
      });

      const analysisData = await analysisResponse.json();
      if (analysisData.success) {
        setMeetingInsights(analysisData.analysis);
      }

      // Get speaker analysis
      const speakerResponse = await fetch('/api/agents/audio-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'speaker_identification',
          transcriptionId: sessionId,
          options: {
            useVoiceprints: true,
            analyzeParticipation: true
          }
        })
      });

      const speakerData = await speakerResponse.json();
      if (speakerData.success) {
        setSpeakerAnalysis(speakerData.speakerAnalysis);
      }

      // Update sessions
      await loadSessions();

    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const searchTranscripts = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch('/api/agents/audio-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_transcripts',
          options: {
            query: searchQuery,
            userId: 'zach',
            semanticSearch: true
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        // Handle search results
        console.log('Search results:', data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            Audio Intelligence Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced transcription, speaker identification, and meeting insights
          </p>
        </div>
        <Button onClick={loadSessions} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      {audioAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileAudio className="w-4 h-4 text-blue-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{audioAnalytics.totalSessions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-green-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {Math.round((audioAnalytics.totalDuration || 0) / 3600)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckSquare className="w-4 h-4 text-orange-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">Action Items</p>
                  <p className="text-2xl font-bold">{audioAnalytics.actionItemsGenerated || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">Avg Meeting</p>
                  <p className="text-2xl font-bold">
                    {Math.round((audioAnalytics.averageMeetingLength || 0) / 60)}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="upload">Upload & Record</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Audio File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drop your audio file here or click to browse
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {capabilities && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Supported formats: {capabilities.transcription?.supportedFormats?.join(', ')}</p>
                    <p>Max file size: {capabilities.transcription?.maxFileSize}</p>
                    <p>Max duration: {capabilities.transcription?.maxDuration}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Live Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                    isRecording ? 'bg-red-100 animate-pulse' : 'bg-muted'
                  }`}>
                    <Mic className={`w-12 h-12 ${isRecording ? 'text-red-600' : 'text-muted-foreground'}`} />
                  </div>

                  <div className="space-y-2">
                    {!isRecording ? (
                      <Button onClick={startRecording} className="w-full">
                        <Play className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="destructive" className="w-full">
                        <Square className="w-4 h-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                  </div>

                  {isRecording && (
                    <div className="text-sm text-muted-foreground">
                      Recording in progress... Click stop when finished.
                    </div>
                  )}
                </div>

                {realTimeTranscript && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Live Transcript:</p>
                    <p className="text-sm">{realTimeTranscript}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="w-5 h-5" />
                Audio Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileAudio className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No audio sessions yet. Upload or record your first meeting!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedSession?.id === session.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{session.filename}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(session.duration / 60)}m
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {session.speakerCount} speakers
                              </span>
                              <Badge variant="secondary">
                                {session.meeting_type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                session.processing_status === 'completed' ? 'default' :
                                session.processing_status === 'processing' ? 'secondary' : 'destructive'
                              }
                            >
                              {session.processing_status}
                            </Badge>
                            {session.processing_status === 'completed' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  analyzeSession(session.id);
                                }}
                                disabled={isAnalyzing}
                              >
                                <Brain className="w-4 h-4 mr-1" />
                                Analyze
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {speakerAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Speaker Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Confidence</p>
                        <p className="text-2xl font-bold">
                          {Math.round(speakerAnalysis.confidence.overall * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Balance</p>
                        <p className="text-2xl font-bold">
                          {Math.round(speakerAnalysis.insights.meetingBalance * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Speaking Time Distribution</h4>
                      {Object.entries(speakerAnalysis.speakingTime).map(([speakerId, time]) => {
                        const percentage = (time / Object.values(speakerAnalysis.speakingTime).reduce((a, b) => a + b, 0)) * 100;
                        return (
                          <div key={speakerId} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{speakerId}</span>
                              <span>{Math.round(percentage)}%</span>
                            </div>
                            <Progress value={percentage} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Dominant Speaker:</strong> {speakerAnalysis.insights.dominantSpeaker}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Collaboration Score:</strong> {Math.round(speakerAnalysis.insights.collaborationLevel * 100)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {meetingInsights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Meeting Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Brief Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {meetingInsights.summary.brief}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Key Points</h4>
                      <ul className="space-y-1">
                        {meetingInsights.summary.keyPoints.map((point, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {meetingInsights.sentiment && (
                      <div>
                        <h4 className="font-medium mb-2">Overall Sentiment</h4>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              meetingInsights.sentiment.overall.label === 'positive' ? 'default' :
                              meetingInsights.sentiment.overall.label === 'negative' ? 'destructive' : 'secondary'
                            }
                          >
                            {meetingInsights.sentiment.overall.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Score: {meetingInsights.sentiment.overall.sentiment.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {meetingInsights?.actionItems && meetingInsights.actionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meetingInsights.actionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <CheckSquare className="w-4 h-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.assignee && (
                            <Badge variant="outline" className="text-xs">
                              {item.assignee}
                            </Badge>
                          )}
                          <Badge
                            variant={
                              item.priority === 'urgent' ? 'destructive' :
                              item.priority === 'high' ? 'default' :
                              item.priority === 'medium' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                          {item.deadline && (
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(item.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analytics Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {audioAnalytics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{audioAnalytics.totalSessions || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Sessions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {Math.round((audioAnalytics.totalDuration || 0) / 3600)}h
                        </p>
                        <p className="text-sm text-muted-foreground">Total Duration</p>
                      </div>
                    </div>

                    {audioAnalytics.topicTrends && (
                      <div>
                        <h4 className="font-medium mb-2">Trending Topics</h4>
                        <div className="space-y-2">
                          {audioAnalytics.topicTrends.slice(0, 5).map((topic: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{topic.name}</span>
                              <Badge variant="secondary">{topic.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No analytics data available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">💡 Productivity Tip</h4>
                    <p className="text-sm text-blue-700">
                      Schedule shorter meetings for better engagement. Your average meeting length is {Math.round((audioAnalytics?.averageMeetingLength || 0) / 60)} minutes.
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-1">📊 Meeting Balance</h4>
                    <p className="text-sm text-green-700">
                      Encourage more participation from quieter team members to improve collaboration scores.
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-1">⚡ Action Items</h4>
                    <p className="text-sm text-orange-700">
                      You've generated {audioAnalytics?.actionItemsGenerated || 0} action items. Consider implementing a follow-up system.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Transcripts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search across all transcripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchTranscripts()}
                  />
                  <Button onClick={searchTranscripts}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Search functionality will display results here.</p>
                  <p className="text-sm">Try searching for specific topics, speakers, or keywords.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Processing Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Default Meeting Type</label>
                  <Select defaultValue="general">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="brainstorm">Brainstorm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Analysis Depth</label>
                  <Select defaultValue="detailed">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Features</label>
                  <div className="space-y-2">
                    {[
                      'Speaker Identification',
                      'Emotion Detection',
                      'Action Item Extraction',
                      'Real-time Processing',
                      'Semantic Search'
                    ].map((feature) => (
                      <label key={feature} className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{feature}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {capabilities ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Transcription</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {capabilities.transcription?.features?.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Speaker Analysis</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {capabilities.speakerIdentification?.features?.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Meeting Intelligence</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {capabilities.meetingIntelligence?.features?.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Loading capabilities...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}