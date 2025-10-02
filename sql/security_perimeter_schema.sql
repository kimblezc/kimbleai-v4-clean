-- Security Perimeter Agent Database Schema
-- Comprehensive security tracking and monitoring tables

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================
-- SECURITY EVENTS TABLE
-- ================================

-- Main security events tracking table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request', 'login', 'logout', 'threat_detected',
    'rate_limit_exceeded', 'ddos_attempt', 'suspicious_activity',
    'authentication_failure', 'authorization_failure', 'admin_action'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  details JSONB DEFAULT '{}',
  ip_address INET NOT NULL,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  response_status INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  risk_score FLOAT DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  blocked BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ================================
-- SECURITY SESSIONS TABLE
-- ================================

-- Track active security sessions
CREATE TABLE IF NOT EXISTS security_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  ip_address INET NOT NULL,
  user_agent TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('guest', 'authenticated', 'premium')) DEFAULT 'guest',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 0,
  risk_score FLOAT DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  status TEXT NOT NULL CHECK (status IN ('active', 'terminated', 'expired')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ================================
-- IP REPUTATION TABLE
-- ================================

-- Track IP address reputation and patterns
CREATE TABLE IF NOT EXISTS ip_reputation (
  ip_address INET PRIMARY KEY,
  reputation_score FLOAT DEFAULT 0.5 CHECK (reputation_score >= 0.0 AND reputation_score <= 1.0),
  total_requests INTEGER DEFAULT 0,
  threat_events INTEGER DEFAULT 0,
  blocked_events INTEGER DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  country_code CHAR(2),
  asn INTEGER,
  is_tor BOOLEAN DEFAULT FALSE,
  is_vpn BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_datacenter BOOLEAN DEFAULT FALSE,
  threat_feeds JSONB DEFAULT '[]', -- External threat intelligence
  notes TEXT,
  whitelist_reason TEXT,
  blacklist_reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('unknown', 'trusted', 'suspicious', 'blocked')) DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- RATE LIMITING TABLE
-- ================================

-- Track rate limiting counters and violations
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP:tier or user_id
  limit_type TEXT NOT NULL CHECK (limit_type IN ('ip', 'user', 'endpoint')),
  endpoint_pattern TEXT,
  current_count INTEGER DEFAULT 0,
  limit_threshold INTEGER NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_duration INTERVAL DEFAULT INTERVAL '1 minute',
  violations INTEGER DEFAULT 0,
  last_violation TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- THREAT INTELLIGENCE TABLE
-- ================================

-- Store threat intelligence and patterns
CREATE TABLE IF NOT EXISTS threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type TEXT NOT NULL CHECK (threat_type IN (
    'malicious_ip', 'user_agent_pattern', 'path_pattern', 'header_pattern',
    'sql_injection', 'xss_attempt', 'directory_traversal', 'bot_signature',
    'ddos_pattern', 'brute_force', 'credential_stuffing'
  )),
  indicator TEXT NOT NULL, -- The actual threat indicator (IP, pattern, etc.)
  indicator_type TEXT NOT NULL CHECK (indicator_type IN (
    'ip', 'cidr', 'domain', 'regex', 'hash', 'string'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  source TEXT NOT NULL, -- Internal, external feed, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}',
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'expired')) DEFAULT 'active',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- SECURITY POLICIES TABLE
-- ================================

-- Define and store security policies
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'rate_limit', 'access_control', 'threat_response', 'authentication'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN (
    'global', 'ip', 'user', 'endpoint', 'tier'
  )),
  target_value TEXT, -- Specific target (IP, user ID, endpoint pattern, etc.)
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 100,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- SECURITY ALERTS TABLE
-- ================================

-- Track security alerts and notifications
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'threshold_exceeded', 'new_threat', 'system_anomaly', 'policy_violation',
    'authentication_anomaly', 'data_breach_attempt', 'service_degradation'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',
  source_event_ids UUID[],
  affected_resources TEXT[],
  status TEXT NOT NULL CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive')) DEFAULT 'new',
  assigned_to TEXT,
  resolved_by TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ================================
-- SECURITY CONFIGURATIONS TABLE
-- ================================

-- Store security configuration settings
CREATE TABLE IF NOT EXISTS security_configurations (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array')),
  category TEXT NOT NULL,
  description TEXT,
  validation_rules JSONB DEFAULT '{}',
  requires_restart BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- SECURITY AUDIT LOG TABLE
-- ================================

-- Comprehensive audit trail for security-related actions
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  session_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Security Events Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_session_id ON security_events(session_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_risk_score ON security_events(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_blocked ON security_events(blocked);
CREATE INDEX IF NOT EXISTS idx_security_events_processed ON security_events(processed);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_ip_timestamp ON security_events(ip_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp ON security_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);

-- JSONB indexes for details field
CREATE INDEX IF NOT EXISTS idx_security_events_details_gin ON security_events USING gin(details);

-- Security Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_security_sessions_user_id ON security_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_ip_address ON security_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_sessions_status ON security_sessions(status);
CREATE INDEX IF NOT EXISTS idx_security_sessions_last_activity ON security_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_security_sessions_tier ON security_sessions(tier);
CREATE INDEX IF NOT EXISTS idx_security_sessions_risk_score ON security_sessions(risk_score DESC);

-- IP Reputation Indexes
CREATE INDEX IF NOT EXISTS idx_ip_reputation_reputation_score ON ip_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_status ON ip_reputation(status);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_last_seen ON ip_reputation(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_threat_events ON ip_reputation(threat_events DESC);

-- Rate Limits Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_limit_type ON rate_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_violations ON rate_limits(violations DESC);

-- Threat Intelligence Indexes
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_indicator ON threat_intelligence(indicator);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_threat_type ON threat_intelligence(threat_type);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_severity ON threat_intelligence(severity);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_status ON threat_intelligence(status);

-- Security Policies Indexes
CREATE INDEX IF NOT EXISTS idx_security_policies_policy_type ON security_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_security_policies_enabled ON security_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_security_policies_priority ON security_policies(priority);

-- Security Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_assigned_to ON security_alerts(assigned_to);

-- ================================
-- FUNCTIONS AND TRIGGERS
-- ================================

-- Function to update IP reputation based on events
CREATE OR REPLACE FUNCTION update_ip_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert IP reputation
  INSERT INTO ip_reputation (ip_address, last_seen)
  VALUES (NEW.ip_address, NEW.timestamp)
  ON CONFLICT (ip_address) DO UPDATE SET
    last_seen = NEW.timestamp,
    total_requests = ip_reputation.total_requests + 1,
    threat_events = ip_reputation.threat_events +
      CASE WHEN NEW.risk_score >= 0.7 THEN 1 ELSE 0 END,
    blocked_events = ip_reputation.blocked_events +
      CASE WHEN NEW.blocked THEN 1 ELSE 0 END,
    reputation_score = GREATEST(0.0, LEAST(1.0,
      ip_reputation.reputation_score -
      CASE
        WHEN NEW.risk_score >= 0.9 THEN 0.1
        WHEN NEW.risk_score >= 0.7 THEN 0.05
        WHEN NEW.risk_score >= 0.5 THEN 0.01
        ELSE -0.001 -- Small positive adjustment for good behavior
      END
    )),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update IP reputation on security events
CREATE TRIGGER trigger_update_ip_reputation
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION update_ip_reputation();

-- Function to auto-expire old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start + window_duration < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup rate limits periodically
CREATE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_rate_limits();

-- Function to auto-create security alerts for high-risk events
CREATE OR REPLACE FUNCTION auto_create_security_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Create alert for critical events
  IF NEW.severity = 'critical' OR NEW.risk_score >= 0.9 THEN
    INSERT INTO security_alerts (
      alert_type,
      severity,
      title,
      description,
      details,
      source_event_ids
    ) VALUES (
      CASE
        WHEN NEW.event_type = 'ddos_attempt' THEN 'service_degradation'
        WHEN NEW.event_type = 'authentication_failure' THEN 'authentication_anomaly'
        ELSE 'threshold_exceeded'
      END,
      NEW.severity,
      'High Risk Security Event Detected',
      'Automatic alert generated for ' || NEW.event_type || ' from IP ' || NEW.ip_address::text,
      jsonb_build_object(
        'event_type', NEW.event_type,
        'risk_score', NEW.risk_score,
        'ip_address', NEW.ip_address,
        'timestamp', NEW.timestamp
      ),
      ARRAY[NEW.id]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create alerts
CREATE TRIGGER trigger_auto_create_alerts
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_security_alerts();

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert session info
  INSERT INTO security_sessions (
    session_id, user_id, ip_address, user_agent,
    last_activity, request_count
  )
  VALUES (
    NEW.session_id, NEW.user_id, NEW.ip_address, NEW.user_agent,
    NEW.timestamp, 1
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_activity = NEW.timestamp,
    request_count = security_sessions.request_count + 1,
    risk_score = GREATEST(0.0, LEAST(1.0,
      (security_sessions.risk_score + NEW.risk_score) / 2
    ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- ================================
-- SECURITY ANALYTICS FUNCTIONS
-- ================================

-- Function to get security metrics for a time period
CREATE OR REPLACE FUNCTION get_security_metrics(
  start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_events BIGINT,
  threat_events BIGINT,
  blocked_events BIGINT,
  unique_ips BIGINT,
  unique_sessions BIGINT,
  avg_risk_score NUMERIC,
  top_threat_types JSONB,
  severity_breakdown JSONB
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE risk_score >= 0.7) as threat_events,
    COUNT(*) FILTER (WHERE blocked = true) as blocked_events,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT session_id) as unique_sessions,
    ROUND(AVG(risk_score), 3) as avg_risk_score,

    -- Top threat types
    (SELECT jsonb_object_agg(event_type, event_count)
     FROM (
       SELECT event_type, COUNT(*) as event_count
       FROM security_events
       WHERE timestamp BETWEEN start_time AND end_time
         AND risk_score >= 0.7
       GROUP BY event_type
       ORDER BY event_count DESC
       LIMIT 10
     ) threat_types) as top_threat_types,

    -- Severity breakdown
    (SELECT jsonb_object_agg(severity, severity_count)
     FROM (
       SELECT severity, COUNT(*) as severity_count
       FROM security_events
       WHERE timestamp BETWEEN start_time AND end_time
       GROUP BY severity
     ) severities) as severity_breakdown

  FROM security_events
  WHERE timestamp BETWEEN start_time AND end_time;
$$;

-- Function to detect anomalies in traffic patterns
CREATE OR REPLACE FUNCTION detect_traffic_anomalies(
  window_minutes INTEGER DEFAULT 60,
  threshold_multiplier NUMERIC DEFAULT 3.0
)
RETURNS TABLE (
  ip_address INET,
  request_count BIGINT,
  avg_baseline NUMERIC,
  anomaly_score NUMERIC,
  severity TEXT
)
LANGUAGE SQL STABLE
AS $$
  WITH recent_activity AS (
    SELECT
      ip_address,
      COUNT(*) as current_requests
    FROM security_events
    WHERE timestamp >= NOW() - (window_minutes || ' minutes')::INTERVAL
    GROUP BY ip_address
  ),
  baseline_activity AS (
    SELECT
      ip_address,
      AVG(hourly_count) as avg_baseline
    FROM (
      SELECT
        ip_address,
        date_trunc('hour', timestamp) as hour,
        COUNT(*) as hourly_count
      FROM security_events
      WHERE timestamp >= NOW() - INTERVAL '7 days'
        AND timestamp < NOW() - (window_minutes || ' minutes')::INTERVAL
      GROUP BY ip_address, date_trunc('hour', timestamp)
    ) hourly_stats
    GROUP BY ip_address
  )
  SELECT
    ra.ip_address,
    ra.current_requests,
    COALESCE(ba.avg_baseline, 0) as avg_baseline,
    CASE
      WHEN ba.avg_baseline > 0
      THEN ra.current_requests / ba.avg_baseline
      ELSE ra.current_requests::NUMERIC
    END as anomaly_score,
    CASE
      WHEN COALESCE(ra.current_requests / NULLIF(ba.avg_baseline, 0), ra.current_requests) >= threshold_multiplier * 2
      THEN 'critical'
      WHEN COALESCE(ra.current_requests / NULLIF(ba.avg_baseline, 0), ra.current_requests) >= threshold_multiplier
      THEN 'high'
      WHEN COALESCE(ra.current_requests / NULLIF(ba.avg_baseline, 0), ra.current_requests) >= threshold_multiplier * 0.5
      THEN 'medium'
      ELSE 'low'
    END as severity
  FROM recent_activity ra
  LEFT JOIN baseline_activity ba ON ra.ip_address = ba.ip_address
  WHERE COALESCE(ra.current_requests / NULLIF(ba.avg_baseline, 0), ra.current_requests) >= threshold_multiplier * 0.5
  ORDER BY anomaly_score DESC;
$$;

-- ================================
-- INITIAL CONFIGURATION DATA
-- ================================

-- Insert default security configurations
INSERT INTO security_configurations (key, value, data_type, category, description, created_by) VALUES
('rate_limit_guest_requests', '10', 'number', 'rate_limiting', 'Requests per minute for guest users', 'system'),
('rate_limit_guest_window', '60000', 'number', 'rate_limiting', 'Rate limit window in milliseconds for guests', 'system'),
('rate_limit_authenticated_requests', '100', 'number', 'rate_limiting', 'Requests per minute for authenticated users', 'system'),
('rate_limit_authenticated_window', '60000', 'number', 'rate_limiting', 'Rate limit window in milliseconds for authenticated users', 'system'),
('rate_limit_premium_requests', '1000', 'number', 'rate_limiting', 'Requests per minute for premium users', 'system'),
('rate_limit_premium_window', '60000', 'number', 'rate_limiting', 'Rate limit window in milliseconds for premium users', 'system'),
('threat_threshold_suspicious', '0.7', 'number', 'threat_detection', 'Risk score threshold for suspicious activity', 'system'),
('threat_threshold_high_risk', '0.8', 'number', 'threat_detection', 'Risk score threshold for high risk', 'system'),
('threat_threshold_critical', '0.9', 'number', 'threat_detection', 'Risk score threshold for critical threats', 'system'),
('session_max_idle_time', '1800000', 'number', 'session_management', 'Maximum idle time in milliseconds', 'system'),
('session_token_rotation_interval', '900000', 'number', 'session_management', 'Token rotation interval in milliseconds', 'system'),
('ddos_max_requests_per_second', '20', 'number', 'ddos_protection', 'Maximum requests per second threshold', 'system'),
('ddos_burst_threshold', '50', 'number', 'ddos_protection', 'Burst detection threshold', 'system'),
('ddos_block_duration', '300000', 'number', 'ddos_protection', 'IP block duration in milliseconds', 'system')
ON CONFLICT (key) DO NOTHING;

-- Insert default threat intelligence patterns
INSERT INTO threat_intelligence (threat_type, indicator, indicator_type, severity, source, description) VALUES
('sql_injection', 'union.*select', 'regex', 'high', 'internal', 'SQL injection UNION SELECT pattern'),
('sql_injection', 'drop.*table', 'regex', 'critical', 'internal', 'SQL injection DROP TABLE pattern'),
('xss_attempt', '<script', 'string', 'high', 'internal', 'XSS script tag attempt'),
('xss_attempt', 'javascript:', 'string', 'medium', 'internal', 'JavaScript protocol XSS attempt'),
('directory_traversal', '\.\./', 'string', 'medium', 'internal', 'Directory traversal attempt'),
('bot_signature', 'bot|crawler|spider|scraper', 'regex', 'low', 'internal', 'Common bot user agent patterns'),
('malicious_ip', '127.0.0.1', 'ip', 'low', 'internal', 'Example malicious IP (replace with real threats)')
ON CONFLICT (indicator) DO NOTHING;

-- ================================
-- ROW LEVEL SECURITY
-- ================================

-- Enable RLS on security tables
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin access for security tables)
CREATE POLICY "Admin access to security events" ON security_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to security sessions" ON security_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to IP reputation" ON ip_reputation
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to rate limits" ON rate_limits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to threat intelligence" ON threat_intelligence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to security policies" ON security_policies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to security alerts" ON security_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to security configurations" ON security_configurations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

CREATE POLICY "Admin access to security audit log" ON security_audit_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE security_events IS 'Comprehensive security event logging and monitoring';
COMMENT ON TABLE security_sessions IS 'Active session tracking with security metrics';
COMMENT ON TABLE ip_reputation IS 'IP address reputation scoring and threat tracking';
COMMENT ON TABLE rate_limits IS 'Rate limiting counters and violation tracking';
COMMENT ON TABLE threat_intelligence IS 'Threat indicators and patterns database';
COMMENT ON TABLE security_policies IS 'Security policy definitions and rules';
COMMENT ON TABLE security_alerts IS 'Security alerts and incident management';
COMMENT ON TABLE security_configurations IS 'Security system configuration settings';
COMMENT ON TABLE security_audit_log IS 'Comprehensive audit trail for security actions';

COMMENT ON FUNCTION get_security_metrics IS 'Generate security metrics for dashboard analytics';
COMMENT ON FUNCTION detect_traffic_anomalies IS 'Detect unusual traffic patterns and potential threats';