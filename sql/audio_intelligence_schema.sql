-- sql/audio_intelligence_schema.sql
-- Enhanced Database Schema for Audio Intelligence Agent

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audio_intelligence_sessions CASCADE;
DROP TABLE IF EXISTS speaker_profiles CASCADE;
DROP TABLE IF EXISTS meeting_insights CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS topic_analysis CASCADE;
DROP TABLE IF EXISTS sentiment_analysis CASCADE;
DROP TABLE IF EXISTS speaker_voiceprints CASCADE;
DROP TABLE IF EXISTS real_time_sessions CASCADE;
DROP VIEW IF EXISTS audio_analytics_summary CASCADE;

-- Main audio intelligence sessions table
CREATE TABLE audio_intelligence_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT DEFAULT 'general',
  filename TEXT NOT NULL,
  file_size BIGINT,
  duration FLOAT NOT NULL,
  session_type TEXT DEFAULT 'transcription' CHECK (session_type IN ('transcription', 'real_time', 'analysis')),
  meeting_type TEXT DEFAULT 'general' CHECK (meeting_type IN ('general', 'conference', 'interview', 'presentation', 'brainstorm', 'standup', 'review')),
  processing_status TEXT DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed', 'analyzing')),

  -- Core transcription data
  transcription_data JSONB, -- Full transcription with segments, speakers, confidence

  -- Analysis results
  analysis_data JSONB, -- Meeting analysis, summary, key points
  speaker_analysis JSONB, -- Speaker identification and analysis
  sentiment_data JSONB, -- Sentiment analysis over time
  topic_data JSONB, -- Topic modeling results

  -- Processing metadata
  processing_options JSONB, -- Options used for processing
  ai_model_used TEXT DEFAULT 'whisper-1',
  processing_time_ms INTEGER,

  -- Quality metrics
  confidence_score FLOAT DEFAULT 0.0,
  speaker_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Speaker profiles table for voice recognition and analysis
CREATE TABLE speaker_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES audio_intelligence_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Speaker identification
  speaker_id TEXT NOT NULL, -- Internal speaker ID (speaker_0, speaker_1, etc.)
  speaker_name TEXT, -- Optional human-readable name
  confidence FLOAT NOT NULL DEFAULT 0.0,

  -- Voice characteristics
  voice_characteristics JSONB, -- Pitch, pace, tonality, linguistic patterns
  speaking_patterns JSONB, -- Segment length, interruptions, response latency
  participation_metrics JSONB, -- Speaking time, word count, engagement

  -- Session-specific data
  total_speaking_time FLOAT NOT NULL DEFAULT 0.0,
  segment_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  dominance_score FLOAT DEFAULT 0.0,
  engagement_level FLOAT DEFAULT 0.0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, speaker_id)
);

-- Meeting insights and analysis results
CREATE TABLE meeting_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES audio_intelligence_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Summary data
  executive_summary TEXT,
  detailed_summary TEXT,
  key_points JSONB, -- Array of key discussion points

  -- Meeting effectiveness
  effectiveness_score FLOAT DEFAULT 0.0,
  collaboration_score FLOAT DEFAULT 0.0,
  meeting_balance FLOAT DEFAULT 0.0,

  -- Insights
  dominant_speaker TEXT,
  most_engaged_speaker TEXT,
  conversation_dynamics TEXT,
  improvement_suggestions JSONB,
  follow_up_suggestions JSONB,

  -- Decision tracking
  decisions_made JSONB, -- Array of decisions with context
  decision_points JSONB, -- Timestamps and participants for decisions

  -- Meeting flow
  agenda_adherence FLOAT DEFAULT 0.0,
  topic_coverage JSONB, -- Topics covered and time spent
  meeting_flow_analysis JSONB, -- Transition quality, interruptions

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Action items extracted from meetings
CREATE TABLE action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES audio_intelligence_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Action item details
  text TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'follow-up', 'research', 'meeting', 'deliverable', 'decision', 'review')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Assignment and timing
  assignee TEXT, -- Extracted or manually assigned
  deadline TIMESTAMP WITH TIME ZONE, -- Extracted or manually set
  estimated_hours FLOAT, -- AI estimate of effort required

  -- Context and tracking
  context TEXT, -- Surrounding conversation context
  timestamp_in_meeting FLOAT, -- When in the meeting this was mentioned
  confidence_score FLOAT DEFAULT 0.0, -- AI confidence in extraction

  -- Relationships
  related_action_items UUID[], -- Related action items
  parent_action_item UUID REFERENCES action_items(id), -- For sub-tasks

  -- Progress tracking
  progress_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topic analysis and modeling results
CREATE TABLE topic_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES audio_intelligence_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Topic information
  topic_name TEXT NOT NULL,
  relevance_score FLOAT NOT NULL DEFAULT 0.0,
  time_spent FLOAT DEFAULT 0.0, -- Seconds spent on this topic

  -- Topic characteristics
  subtopics JSONB, -- Array of related subtopics
  key_phrases JSONB, -- Important phrases associated with topic
  sentiment_score FLOAT DEFAULT 0.0, -- Sentiment for this specific topic

  -- Participant data
  primary_speakers JSONB, -- Speakers who contributed most to this topic
  topic_ownership JSONB, -- Who "owns" or leads this topic

  -- Temporal data
  discussion_periods JSONB, -- When this topic was discussed (start/end times)
  topic_flow_position INTEGER, -- Order in meeting flow
  transition_quality TEXT, -- How smoothly topic was introduced/concluded

  -- Topic evolution
  topic_development JSONB, -- How the topic evolved during discussion
  resolution_status TEXT CHECK (resolution_status IN ('resolved', 'unresolved', 'partial', 'deferred')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sentiment analysis results
CREATE TABLE sentiment_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES audio_intelligence_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Overall sentiment
  overall_sentiment FLOAT NOT NULL DEFAULT 0.0, -- -1 to 1 scale
  overall_confidence FLOAT NOT NULL DEFAULT 0.0,
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),

  -- Temporal sentiment data
  sentiment_timeline JSONB, -- Sentiment over time with timestamps
  sentiment_peaks JSONB, -- Significant emotional peaks/valleys
  sentiment_shifts JSONB, -- Notable sentiment changes and triggers

  -- Speaker-specific sentiment
  speaker_sentiments JSONB, -- Sentiment by speaker
  speaker_emotional_profiles JSONB, -- Emotional characteristics per speaker

  -- Topic-specific sentiment
  topic_sentiments JSONB, -- Sentiment associated with each topic

  -- Advanced emotional analysis
  emotional_intensity FLOAT DEFAULT 0.0,
  emotional_variance FLOAT DEFAULT 0.0,
  meeting_energy_level FLOAT DEFAULT 0.0,
  stress_indicators JSONB, -- Detected stress patterns

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Speaker voiceprints for future recognition
CREATE TABLE speaker_voiceprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  speaker_name TEXT NOT NULL,

  -- Voiceprint data
  voice_characteristics JSONB NOT NULL, -- Stored voice characteristics for recognition
  recognition_confidence FLOAT DEFAULT 0.0,

  -- Usage statistics
  times_recognized INTEGER DEFAULT 1,
  last_recognized TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recognition_accuracy FLOAT DEFAULT 0.0, -- Historical accuracy

  -- Training data
  training_sessions UUID[], -- Sessions used to build this voiceprint
  total_training_time FLOAT DEFAULT 0.0, -- Total audio time used for training

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, speaker_name)
);

-- Real-time processing sessions
CREATE TABLE real_time_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Session management
  session_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),

  -- Real-time data
  live_transcript JSONB, -- Continuously updated transcript
  live_speakers JSONB, -- Current speaker identification
  live_insights JSONB, -- Real-time insights and alerts
  live_action_items JSONB, -- Action items identified in real-time

  -- Session metrics
  total_duration FLOAT DEFAULT 0.0,
  chunk_count INTEGER DEFAULT 0,
  avg_processing_latency FLOAT DEFAULT 0.0,

  -- Configuration
  processing_options JSONB,
  quality_settings JSONB,

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audio_sessions_user_id ON audio_intelligence_sessions(user_id);
CREATE INDEX idx_audio_sessions_created_at ON audio_intelligence_sessions(created_at DESC);
CREATE INDEX idx_audio_sessions_status ON audio_intelligence_sessions(processing_status);
CREATE INDEX idx_audio_sessions_type ON audio_intelligence_sessions(meeting_type);

CREATE INDEX idx_speaker_profiles_session_id ON speaker_profiles(session_id);
CREATE INDEX idx_speaker_profiles_user_id ON speaker_profiles(user_id);
CREATE INDEX idx_speaker_profiles_speaker_id ON speaker_profiles(speaker_id);

CREATE INDEX idx_meeting_insights_session_id ON meeting_insights(session_id);
CREATE INDEX idx_meeting_insights_user_id ON meeting_insights(user_id);

CREATE INDEX idx_action_items_session_id ON action_items(session_id);
CREATE INDEX idx_action_items_user_id ON action_items(user_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_priority ON action_items(priority);
CREATE INDEX idx_action_items_assignee ON action_items(assignee);
CREATE INDEX idx_action_items_deadline ON action_items(deadline);

CREATE INDEX idx_topic_analysis_session_id ON topic_analysis(session_id);
CREATE INDEX idx_topic_analysis_user_id ON topic_analysis(user_id);
CREATE INDEX idx_topic_analysis_relevance ON topic_analysis(relevance_score DESC);

CREATE INDEX idx_sentiment_analysis_session_id ON sentiment_analysis(session_id);
CREATE INDEX idx_sentiment_analysis_user_id ON sentiment_analysis(user_id);

CREATE INDEX idx_speaker_voiceprints_user_id ON speaker_voiceprints(user_id);
CREATE INDEX idx_speaker_voiceprints_name ON speaker_voiceprints(speaker_name);

CREATE INDEX idx_real_time_sessions_user_id ON real_time_sessions(user_id);
CREATE INDEX idx_real_time_sessions_status ON real_time_sessions(status);

-- Create comprehensive analytics view
CREATE VIEW audio_analytics_summary AS
SELECT
  ais.user_id,
  COUNT(DISTINCT ais.id) as total_sessions,
  SUM(ais.duration) as total_duration_seconds,
  AVG(ais.duration) as average_session_duration,
  SUM(ais.word_count) as total_words_transcribed,
  AVG(ais.confidence_score) as average_confidence,
  COUNT(DISTINCT sp.speaker_id) as unique_speakers_identified,
  COUNT(ai.id) as total_action_items,
  COUNT(CASE WHEN ai.status = 'completed' THEN 1 END) as completed_action_items,
  AVG(mi.effectiveness_score) as average_meeting_effectiveness,
  AVG(mi.collaboration_score) as average_collaboration_score,
  AVG(sa.overall_sentiment) as average_sentiment,
  COUNT(CASE WHEN ais.meeting_type = 'conference' THEN 1 END) as conference_meetings,
  COUNT(CASE WHEN ais.meeting_type = 'interview' THEN 1 END) as interview_meetings,
  COUNT(CASE WHEN ais.meeting_type = 'presentation' THEN 1 END) as presentation_meetings,
  COUNT(CASE WHEN ais.meeting_type = 'brainstorm' THEN 1 END) as brainstorm_meetings,
  MAX(ais.created_at) as last_session_date,
  EXTRACT(HOUR FROM AVG(ais.created_at::time)) as most_active_hour
FROM audio_intelligence_sessions ais
LEFT JOIN speaker_profiles sp ON ais.id = sp.session_id
LEFT JOIN action_items ai ON ais.id = ai.session_id
LEFT JOIN meeting_insights mi ON ais.id = mi.session_id
LEFT JOIN sentiment_analysis sa ON ais.id = sa.session_id
WHERE ais.processing_status = 'completed'
GROUP BY ais.user_id;

-- Create function for comprehensive analytics
CREATE OR REPLACE FUNCTION get_audio_intelligence_analytics(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'summary', (
      SELECT json_build_object(
        'totalSessions', COALESCE(total_sessions, 0),
        'totalDuration', COALESCE(total_duration_seconds, 0),
        'averageMeetingLength', COALESCE(average_session_duration, 0),
        'totalActionItems', COALESCE(total_action_items, 0),
        'completedActionItems', COALESCE(completed_action_items, 0),
        'averageEffectiveness', COALESCE(average_meeting_effectiveness, 0),
        'averageSentiment', COALESCE(average_sentiment, 0),
        'uniqueSpeakers', COALESCE(unique_speakers_identified, 0)
      )
      FROM audio_analytics_summary
      WHERE user_id = p_user_id
    ),
    'meetingTypes', (
      SELECT json_agg(
        json_build_object(
          'type', meeting_type,
          'count', COUNT(*),
          'totalDuration', SUM(duration)
        )
      )
      FROM audio_intelligence_sessions
      WHERE user_id = p_user_id AND processing_status = 'completed'
      GROUP BY meeting_type
    ),
    'topTopics', (
      SELECT json_agg(
        json_build_object(
          'topic', topic_name,
          'relevance', AVG(relevance_score),
          'frequency', COUNT(*),
          'totalTime', SUM(time_spent)
        ) ORDER BY COUNT(*) DESC
      )
      FROM topic_analysis
      WHERE user_id = p_user_id
      GROUP BY topic_name
      LIMIT 10
    ),
    'sentimentTrends', (
      SELECT json_agg(
        json_build_object(
          'date', DATE(created_at),
          'sentiment', AVG(overall_sentiment),
          'sessions', COUNT(*)
        ) ORDER BY DATE(created_at)
      )
      FROM sentiment_analysis sa
      JOIN audio_intelligence_sessions ais ON sa.session_id = ais.id
      WHERE sa.user_id = p_user_id
        AND ais.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
    ),
    'actionItemStats', (
      SELECT json_build_object(
        'byStatus', (
          SELECT json_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*) as count
            FROM action_items
            WHERE user_id = p_user_id
            GROUP BY status
          ) t
        ),
        'byPriority', (
          SELECT json_object_agg(priority, count)
          FROM (
            SELECT priority, COUNT(*) as count
            FROM action_items
            WHERE user_id = p_user_id
            GROUP BY priority
          ) t
        ),
        'completionRate', (
          SELECT ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL /
            NULLIF(COUNT(*), 0) * 100, 2
          )
          FROM action_items
          WHERE user_id = p_user_id
        )
      )
    ),
    'speakerAnalytics', (
      SELECT json_agg(
        json_build_object(
          'speakerName', COALESCE(speaker_name, speaker_id),
          'totalSpeakingTime', SUM(total_speaking_time),
          'averageEngagement', AVG(engagement_level),
          'sessionsParticipated', COUNT(DISTINCT session_id)
        )
      )
      FROM speaker_profiles
      WHERE user_id = p_user_id
      GROUP BY COALESCE(speaker_name, speaker_id)
      ORDER BY SUM(total_speaking_time) DESC
      LIMIT 10
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE audio_intelligence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_voiceprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access their own audio sessions" ON audio_intelligence_sessions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own speaker profiles" ON speaker_profiles
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own meeting insights" ON meeting_insights
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own action items" ON action_items
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own topic analysis" ON topic_analysis
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own sentiment analysis" ON sentiment_analysis
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own voiceprints" ON speaker_voiceprints
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

CREATE POLICY "Users can access their own real-time sessions" ON real_time_sessions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::TEXT);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audio_sessions_updated_at
  BEFORE UPDATE ON audio_intelligence_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speaker_profiles_updated_at
  BEFORE UPDATE ON speaker_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_insights_updated_at
  BEFORE UPDATE ON meeting_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speaker_voiceprints_updated_at
  BEFORE UPDATE ON speaker_voiceprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON audio_intelligence_sessions TO authenticated;
GRANT ALL ON speaker_profiles TO authenticated;
GRANT ALL ON meeting_insights TO authenticated;
GRANT ALL ON action_items TO authenticated;
GRANT ALL ON topic_analysis TO authenticated;
GRANT ALL ON sentiment_analysis TO authenticated;
GRANT ALL ON speaker_voiceprints TO authenticated;
GRANT ALL ON real_time_sessions TO authenticated;
GRANT SELECT ON audio_analytics_summary TO authenticated;

-- Add some sample data types and constraints
ALTER TABLE audio_intelligence_sessions
ADD CONSTRAINT check_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

ALTER TABLE speaker_profiles
ADD CONSTRAINT check_speaker_confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0),
ADD CONSTRAINT check_dominance_score_range CHECK (dominance_score >= 0.0 AND dominance_score <= 1.0),
ADD CONSTRAINT check_engagement_range CHECK (engagement_level >= 0.0 AND engagement_level <= 1.0);

ALTER TABLE meeting_insights
ADD CONSTRAINT check_effectiveness_range CHECK (effectiveness_score >= 0.0 AND effectiveness_score <= 1.0),
ADD CONSTRAINT check_collaboration_range CHECK (collaboration_score >= 0.0 AND collaboration_score <= 1.0),
ADD CONSTRAINT check_balance_range CHECK (meeting_balance >= 0.0 AND meeting_balance <= 1.0);

ALTER TABLE sentiment_analysis
ADD CONSTRAINT check_sentiment_range CHECK (overall_sentiment >= -1.0 AND overall_sentiment <= 1.0),
ADD CONSTRAINT check_sentiment_confidence_range CHECK (overall_confidence >= 0.0 AND overall_confidence <= 1.0);

-- Create additional indexes for complex queries
CREATE INDEX idx_action_items_compound ON action_items(user_id, status, priority, deadline);
CREATE INDEX idx_topic_analysis_compound ON topic_analysis(user_id, relevance_score DESC, time_spent DESC);
CREATE INDEX idx_sentiment_timeline ON sentiment_analysis USING GIN(sentiment_timeline);
CREATE INDEX idx_speaker_characteristics ON speaker_profiles USING GIN(voice_characteristics);
CREATE INDEX idx_session_analysis_data ON audio_intelligence_sessions USING GIN(analysis_data);

-- Add full-text search capabilities
ALTER TABLE audio_intelligence_sessions ADD COLUMN search_vector tsvector;
CREATE INDEX idx_audio_sessions_search ON audio_intelligence_sessions USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_audio_session_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.filename, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.transcription_data->>'text', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.analysis_data->>'summary', '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audio_session_search_vector_trigger
  BEFORE INSERT OR UPDATE ON audio_intelligence_sessions
  FOR EACH ROW EXECUTE FUNCTION update_audio_session_search_vector();

-- Comments for documentation
COMMENT ON TABLE audio_intelligence_sessions IS 'Main table storing audio transcription sessions and analysis results';
COMMENT ON TABLE speaker_profiles IS 'Detailed speaker analysis and voice characteristics for each session';
COMMENT ON TABLE meeting_insights IS 'Meeting effectiveness analysis and insights';
COMMENT ON TABLE action_items IS 'Action items extracted from meetings with tracking capabilities';
COMMENT ON TABLE topic_analysis IS 'Topic modeling and analysis results';
COMMENT ON TABLE sentiment_analysis IS 'Comprehensive sentiment analysis over time and by speaker';
COMMENT ON TABLE speaker_voiceprints IS 'Voice recognition profiles for consistent speaker identification';
COMMENT ON TABLE real_time_sessions IS 'Real-time processing sessions for live transcription';
COMMENT ON VIEW audio_analytics_summary IS 'Comprehensive analytics view for user dashboards';
COMMENT ON FUNCTION get_audio_intelligence_analytics IS 'Returns comprehensive analytics JSON for a user';