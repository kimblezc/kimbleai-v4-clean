# Audio Intelligence Agent

## Overview

The Audio Intelligence Agent is an advanced transcription and meeting intelligence system that transforms meetings into actionable insights. It goes far beyond basic transcription by providing speaker identification, sentiment analysis, action item extraction, and comprehensive meeting analytics.

## Features

### 🎯 Core Capabilities

- **Advanced Multi-Speaker Transcription**: Automatic speaker identification and diarization
- **Real-Time Processing**: Live transcription with streaming insights
- **Meeting Intelligence**: Comprehensive analysis of meeting effectiveness
- **Action Item Extraction**: Automatic identification and tracking of action items
- **Sentiment Analysis**: Emotional tone analysis over time and by speaker
- **Topic Modeling**: Identification and analysis of discussion topics
- **Speaker Analytics**: Voice characteristics and participation metrics
- **Semantic Search**: Search across all transcripts with contextual understanding

### 🔬 Advanced Analysis

- **Meeting Effectiveness Scoring**: Quantitative assessment of meeting quality
- **Collaboration Analysis**: Team interaction and participation balance
- **Decision Tracking**: Identification and documentation of key decisions
- **Key Moment Detection**: Highlighting of important discussion points
- **Follow-up Suggestions**: AI-generated recommendations for next steps

## Architecture

### API Endpoints

**Main Endpoint**: `/api/agents/audio-intelligence`

#### POST Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `transcribe` | Advanced transcription with speaker identification | `audioFile`, `options` |
| `analyze_meeting` | Comprehensive meeting analysis | `transcriptionId`, `options` |
| `extract_insights` | Deep meeting insights extraction | `transcriptionId`, `options` |
| `speaker_identification` | Enhanced speaker analysis | `transcriptionId`, `speakerNames` |
| `action_items` | Extract and categorize action items | `transcriptionId`, `options` |
| `summary` | Generate meeting summaries | `transcriptionId`, `summaryType` |
| `sentiment_analysis` | Analyze sentiment over time | `transcriptionId`, `options` |
| `topic_modeling` | Identify and analyze topics | `transcriptionId`, `numberOfTopics` |
| `search_transcripts` | Search across all transcripts | `query`, `filters` |
| `real_time_process` | Process real-time audio chunks | `audioChunk`, `sessionId` |

#### GET Actions

| Action | Description | Returns |
|--------|-------------|---------|
| `sessions` | Get user's audio sessions | Array of session objects |
| `analytics` | Get comprehensive analytics | Analytics summary |
| `capabilities` | Get system capabilities | Feature and limitation details |

### Core Libraries

#### AudioIntelligence Class (`lib/audio-intelligence.ts`)

Main orchestration class for audio processing and analysis:

```typescript
const audioIntelligence = new AudioIntelligence(openaiClient, supabaseClient, userId);

// Advanced transcription
const result = await audioIntelligence.advancedTranscription(audioFile, {
  enableSpeakerDiarization: true,
  includeEmotions: true,
  meetingType: 'conference'
});

// Meeting analysis
const analysis = await audioIntelligence.analyzeMeetingContent(sessionId, {
  analysisDepth: 'comprehensive',
  extractActionItems: true,
  performSentimentAnalysis: true
});
```

#### SpeakerDiarization Class (`lib/speaker-diarization.ts`)

Advanced speaker identification and voice analysis:

```typescript
const diarization = new SpeakerDiarization();

// Identify speakers
const speakerAnalysis = await diarization.identifySpeakers(segments, speakerNames);

// Enhanced speaker identification
const enhanced = await diarization.enhancedSpeakerIdentification(segments, {
  useVoiceprints: true,
  analyzeParticipation: true,
  identifyTurnTaking: true
});
```

### Database Schema

The system uses a comprehensive database schema designed for advanced audio analytics:

#### Core Tables

- **`audio_intelligence_sessions`**: Main sessions with transcription and analysis data
- **`speaker_profiles`**: Detailed speaker characteristics and metrics
- **`meeting_insights`**: Meeting effectiveness and collaboration analysis
- **`action_items`**: Extracted action items with tracking capabilities
- **`topic_analysis`**: Topic modeling and discussion flow analysis
- **`sentiment_analysis`**: Temporal and speaker-specific sentiment data
- **`speaker_voiceprints`**: Voice recognition profiles for consistency
- **`real_time_sessions`**: Live processing session management

#### Analytics View

The `audio_analytics_summary` view provides comprehensive analytics including:
- Total sessions and duration
- Speaker identification metrics
- Action item completion rates
- Meeting effectiveness scores
- Sentiment trends

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Optional - for enhanced features
DEEPGRAM_API_KEY=your_deepgram_key  # For advanced diarization
ASSEMBLY_AI_KEY=your_assembly_key   # Alternative transcription
```

### Processing Options

```typescript
interface ProcessingOptions {
  // Transcription
  language?: string;                    // Default: 'en'
  enableSpeakerDiarization?: boolean;   // Default: true
  includeEmotions?: boolean;            // Default: false

  // Analysis
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';  // Default: 'detailed'
  extractActionItems?: boolean;         // Default: true
  performSentimentAnalysis?: boolean;   // Default: true
  identifyKeyMoments?: boolean;         // Default: true

  // Meeting Context
  meetingType?: 'conference' | 'interview' | 'presentation' | 'brainstorm' | 'general';
  speakerNames?: { [speakerId: string]: string };

  // Quality Settings
  confidenceThreshold?: number;         // Default: 0.7
  minSpeakerCount?: number;            // Default: 1
  maxSpeakerCount?: number;            // Default: 20
}
```

## Usage Examples

### Basic Transcription

```typescript
// Upload and transcribe
const formData = new FormData();
formData.append('action', 'transcribe');
formData.append('audioFile', file);
formData.append('userId', 'user123');
formData.append('options', JSON.stringify({
  enableSpeakerDiarization: true,
  includeEmotions: true,
  meetingType: 'conference'
}));

const response = await fetch('/api/agents/audio-intelligence', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### Meeting Analysis

```typescript
// Analyze a completed transcription
const analysisResponse = await fetch('/api/agents/audio-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'analyze_meeting',
    transcriptionId: 'session-uuid',
    options: {
      analysisDepth: 'comprehensive',
      generateActionItems: true,
      includeEmotions: true
    }
  })
});

const analysis = await analysisResponse.json();
```

### Real-Time Processing

```typescript
// Start real-time session
const realTimeResponse = await fetch('/api/agents/audio-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'real_time_process',
    audioFile: audioChunk,
    options: {
      sessionId: 'rt-session-123',
      enableLiveDiarization: true,
      provideLiveInsights: true
    }
  })
});
```

### Search Transcripts

```typescript
// Semantic search across transcripts
const searchResponse = await fetch('/api/agents/audio-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'search_transcripts',
    options: {
      query: 'project timeline discussion',
      userId: 'user123',
      semanticSearch: true,
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    }
  })
});
```

## Dashboard Integration

The `AudioIntelligenceDashboard` component provides a comprehensive interface:

### Features

- **File Upload**: Drag-and-drop audio file processing
- **Live Recording**: Real-time audio capture and transcription
- **Session Management**: View and analyze past sessions
- **Analytics**: Comprehensive meeting analytics and insights
- **Search**: Semantic search across all transcripts
- **Settings**: Configuration and capability management

### Component Usage

```tsx
import AudioIntelligenceDashboard from '@/components/agents/AudioIntelligenceDashboard';

export default function AudioPage() {
  return (
    <div>
      <AudioIntelligenceDashboard />
    </div>
  );
}
```

## Performance Considerations

### File Limits

- **Maximum File Size**: 100MB
- **Maximum Duration**: 4 hours
- **Supported Formats**: MP3, WAV, M4A, FLAC, WebM
- **Real-time Latency**: < 2 seconds

### Processing Times

- **Basic Transcription**: ~1/10th of audio duration
- **Advanced Analysis**: ~1/5th of audio duration
- **Speaker Identification**: +30% processing time
- **Comprehensive Analysis**: ~1/3rd of audio duration

### Optimization Tips

1. **Use appropriate analysis depth** for your needs
2. **Pre-define speaker names** for better identification
3. **Split long recordings** into segments for faster processing
4. **Use real-time mode** for live meetings
5. **Enable only needed features** to reduce processing time

## Cost Management

The system integrates with the cost monitoring system:

- **Whisper API costs** are tracked per user
- **GPT-4 analysis costs** are monitored and throttled
- **Embedding generation** for semantic search is cost-optimized
- **Usage analytics** help optimize processing choices

## Security and Privacy

### Data Protection

- **End-to-end encryption** for audio uploads
- **Temporary storage** with automatic cleanup
- **User data isolation** with Row Level Security
- **Audit logging** for all processing activities

### Access Control

- **User-based isolation**: Users can only access their own data
- **Role-based permissions** for admin functions
- **API key protection** for external services
- **Secure file handling** with virus scanning

## Troubleshooting

### Common Issues

#### Upload Failures

```bash
# Check file format
curl -X POST /api/agents/audio-intelligence \
  -F "action=transcribe" \
  -F "audioFile=@meeting.mp3" \
  -F "userId=user123"
```

#### Poor Speaker Identification

```typescript
// Provide speaker names for better results
const options = {
  speakerNames: {
    'speaker_0': 'John Smith',
    'speaker_1': 'Jane Doe'
  },
  confidenceThreshold: 0.8
};
```

#### Slow Processing

```typescript
// Use basic analysis for faster results
const options = {
  analysisDepth: 'basic',
  includeEmotions: false,
  performTopicModeling: false
};
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `AUDIO_001` | Unsupported format | Convert to supported format |
| `AUDIO_002` | File too large | Split or compress file |
| `AUDIO_003` | Processing timeout | Use shorter segments |
| `AUDIO_004` | Insufficient audio quality | Use higher quality recording |
| `AUDIO_005` | Speaker identification failed | Provide speaker names |

## API Reference

### Request Format

```typescript
interface AudioIntelligenceRequest {
  action: string;
  userId?: string;
  audioFile?: File;
  transcriptionId?: string;
  meetingId?: string;
  options?: ProcessingOptions;
}
```

### Response Format

```typescript
interface AudioIntelligenceResponse {
  success: boolean;
  action: string;
  result?: any;
  error?: string;
  details?: string;
  processingTime?: number;
}
```

### Error Handling

```typescript
try {
  const response = await fetch('/api/agents/audio-intelligence', options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Processing failed');
  }

  return data.result;
} catch (error) {
  console.error('Audio Intelligence error:', error);
  // Handle error appropriately
}
```

## Advanced Features

### Custom Analysis Prompts

```typescript
const options = {
  customPrompts: [
    "Identify any compliance issues discussed",
    "Extract budget-related decisions",
    "Highlight technical requirements mentioned"
  ]
};
```

### Voice Recognition Training

```typescript
// Store voiceprint for future recognition
const voiceprint = await diarization.extractVoiceCharacteristics(segments);
diarization.storeVoiceprint('john_smith', voiceprint);
```

### Webhook Integration

```typescript
// Configure webhooks for processing completion
const options = {
  webhook: {
    url: 'https://your-app.com/webhook/audio-complete',
    events: ['transcription_complete', 'analysis_complete']
  }
};
```

## Migration and Updates

### From Basic Transcription

1. Update API calls to use new endpoint
2. Modify database schema using provided SQL
3. Update frontend components
4. Configure new environment variables

### Version Compatibility

- **v1.0**: Basic transcription only
- **v2.0**: Added speaker identification
- **v3.0**: Full audio intelligence features
- **v4.0**: Real-time processing and advanced analytics

## Support and Maintenance

### Monitoring

- **Processing success rates** via analytics dashboard
- **API response times** through monitoring
- **Cost tracking** through integrated cost monitor
- **Error rates** and debugging information

### Backup and Recovery

- **Automated backups** of analysis results
- **Point-in-time recovery** for critical data
- **Disaster recovery** procedures
- **Data export** capabilities

### Updates

- **Automatic updates** for analysis models
- **Feature flag control** for new capabilities
- **Backward compatibility** maintenance
- **Migration tools** for schema updates

---

## Quick Start

1. **Install dependencies**: Ensure OpenAI and Supabase are configured
2. **Run database migration**: Execute `audio_intelligence_schema.sql`
3. **Configure environment**: Set required environment variables
4. **Test upload**: Upload a short audio file through the dashboard
5. **Review results**: Check transcription and analysis quality
6. **Customize settings**: Adjust processing options as needed

For detailed implementation examples, see the test files and component usage in the codebase.