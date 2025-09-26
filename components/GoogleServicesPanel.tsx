'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface ServiceStatus {
  gmail: 'idle' | 'testing' | 'success' | 'error';
  drive: 'idle' | 'testing' | 'success' | 'error';
  calendar: 'idle' | 'testing' | 'success' | 'error';
}

export default function GoogleServicesPanel() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<ServiceStatus>({
    gmail: 'idle',
    drive: 'idle',
    calendar: 'idle'
  });
  const [results, setResults] = useState<{[key: string]: any}>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emailCompose, setEmailCompose] = useState({
    to: '',
    subject: '',
    body: '',
    sending: false
  });

  const testService = async (service: 'gmail' | 'drive' | 'calendar') => {
    setStatus(prev => ({ ...prev, [service]: 'testing' }));

    try {
      let response;
      if (service === 'gmail') {
        response = await fetch('/api/google/gmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_recent',
            maxResults: 1,
            userId: 'zach'
          })
        });
      } else if (service === 'drive') {
        response = await fetch('/api/google/drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'search',
            query: '',
            userId: 'zach'
          })
        });
      } else {
        response = await fetch('/api/google/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_events',
            userId: 'zach'
          })
        });
      }

      const data = await response.json();

      if (data.success || (data.messages && data.messages.length > 0) || (data.files && data.files.length > 0) || (data.events && data.events.length > 0)) {
        setStatus(prev => ({ ...prev, [service]: 'success' }));
        setResults(prev => ({ ...prev, [service]: data }));
      } else {
        setStatus(prev => ({ ...prev, [service]: 'error' }));
        setResults(prev => ({ ...prev, [service]: data }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, [service]: 'error' }));
      setResults(prev => ({ ...prev, [service]: { error: `Failed to fetch ${service} data`, details: String(error) } }));
    }
  };

  const sendEmail = async () => {
    setEmailCompose(prev => ({ ...prev, sending: true }));

    try {
      const response = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_email',
          userId: session?.user?.email?.includes('zach') ? 'zach' : 'rebecca',
          emailData: {
            to: emailCompose.to,
            subject: emailCompose.subject,
            body: emailCompose.body
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setEmailCompose({ to: '', subject: '', body: '', sending: false });
        alert('Email sent successfully!');
      } else {
        alert('Failed to send email: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error sending email: ' + String(error));
    } finally {
      setEmailCompose(prev => ({ ...prev, sending: false }));
    }
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'testing': return '🟡'; // Yellow - testing
      case 'success': return '🟢'; // Green - success
      case 'error': return '🔴'; // Red - error
      default: return '⚪'; // White - idle
    }
  };

  const getResultSummary = (service: string, data: any) => {
    if (!data) return 'Not tested yet';
    if (data.error) return `Error: ${data.error}`;

    if (service === 'gmail') {
      return data.messages?.length > 0
        ? `✓ Found ${data.messages.length} email(s). Latest: "${data.messages[0]?.subject}"`
        : 'No emails found';
    }
    if (service === 'drive') {
      return data.files?.length > 0
        ? `✓ Found ${data.files.length} file(s). Recent: "${data.files[0]?.name}"`
        : 'No files found';
    }
    if (service === 'calendar') {
      return data.events?.length > 0
        ? `✓ Found ${data.events.length} event(s)`
        : data.details?.includes('Calendar API') || data.error?.includes('Calendar API')
          ? '⚠ Calendar API needs to be enabled in Google Cloud Console'
          : 'No events found';
    }
    return 'Unknown result';
  };

  if (!session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        <h2 style={{ color: '#fff', marginBottom: '20px' }}>🔗 Google Services</h2>
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '30px',
          borderRadius: '12px',
          border: '2px dashed #444'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
          <h3 style={{ color: '#fff', marginBottom: '15px' }}>Authentication Required</h3>
          <p style={{ color: '#888', marginBottom: '20px', lineHeight: '1.5' }}>
            Sign in with your Google account to access Gmail, Drive, and Calendar integrations.
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            Your Google Services button is visible but requires authentication to function.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: '#fff', height: '100%', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#fff' }}>
          🔗 Google Services Status
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Test your Google integrations. Traffic lights show status: ⚪ Ready 🟡 Testing 🟢 Success 🔴 Error
        </p>
      </div>

      {/* Gmail Service */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '15px',
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{getStatusIcon(status.gmail)}</span>
            <span style={{ fontSize: '18px', fontWeight: '500' }}>📧 Gmail</span>
          </div>
          <button
            onClick={() => testService('gmail')}
            disabled={status.gmail === 'testing'}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: status.gmail === 'testing' ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: status.gmail === 'testing' ? 0.6 : 1
            }}
          >
            {status.gmail === 'testing' ? 'Testing...' : 'Test'}
          </button>
        </div>
        <p style={{ color: '#ccc', fontSize: '14px', margin: '0' }}>
          {getResultSummary('gmail', results.gmail)}
        </p>
      </div>

      {/* Drive Service */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '15px',
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{getStatusIcon(status.drive)}</span>
            <span style={{ fontSize: '18px', fontWeight: '500' }}>📁 Drive</span>
          </div>
          <button
            onClick={() => testService('drive')}
            disabled={status.drive === 'testing'}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: status.drive === 'testing' ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: status.drive === 'testing' ? 0.6 : 1
            }}
          >
            {status.drive === 'testing' ? 'Testing...' : 'Test'}
          </button>
        </div>
        <p style={{ color: '#ccc', fontSize: '14px', margin: '0' }}>
          {getResultSummary('drive', results.drive)}
        </p>
      </div>

      {/* Calendar Service */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '15px',
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{getStatusIcon(status.calendar)}</span>
            <span style={{ fontSize: '18px', fontWeight: '500' }}>📅 Calendar</span>
          </div>
          <button
            onClick={() => testService('calendar')}
            disabled={status.calendar === 'testing'}
            style={{
              padding: '8px 16px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: status.calendar === 'testing' ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              opacity: status.calendar === 'testing' ? 0.6 : 1
            }}
          >
            {status.calendar === 'testing' ? 'Testing...' : 'Test'}
          </button>
        </div>
        <p style={{ color: '#ccc', fontSize: '14px', margin: '0' }}>
          {getResultSummary('calendar', results.calendar)}
        </p>
      </div>

      {/* Test All Button */}
      <button
        onClick={() => {
          testService('gmail');
          setTimeout(() => testService('drive'), 500);
          setTimeout(() => testService('calendar'), 1000);
        }}
        disabled={Object.values(status).some(s => s === 'testing')}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: Object.values(status).some(s => s === 'testing') ? 'not-allowed' : 'pointer',
          opacity: Object.values(status).some(s => s === 'testing') ? 0.6 : 1,
          marginTop: '10px'
        }}
      >
        🚀 Test All Services
      </button>

      {/* Advanced Features Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: 'transparent',
          color: '#888',
          border: '1px dashed #444',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        {showAdvanced ? '📝 Hide Advanced Features' : '📝 Show Advanced Features'}
      </button>

      {/* Advanced Features Panel */}
      {showAdvanced && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#0f0f0f',
          borderRadius: '12px',
          border: '1px solid #333'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '18px' }}>
            ✨ Power User Features
          </h3>

          {/* Gmail Compose */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#4ade80', marginBottom: '10px' }}>📧 Send Email</h4>
            <input
              type="email"
              placeholder="To: recipient@example.com"
              value={emailCompose.to}
              onChange={(e) => setEmailCompose(prev => ({ ...prev, to: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                marginBottom: '8px'
              }}
            />
            <input
              type="text"
              placeholder="Subject"
              value={emailCompose.subject}
              onChange={(e) => setEmailCompose(prev => ({ ...prev, subject: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                marginBottom: '8px'
              }}
            />
            <textarea
              placeholder="Email body..."
              value={emailCompose.body}
              onChange={(e) => setEmailCompose(prev => ({ ...prev, body: e.target.value }))}
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                marginBottom: '8px',
                resize: 'vertical'
              }}
            />
            <button
              onClick={sendEmail}
              disabled={emailCompose.sending || !emailCompose.to || !emailCompose.subject}
              style={{
                padding: '8px 16px',
                backgroundColor: emailCompose.sending ? '#666' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: (emailCompose.sending || !emailCompose.to || !emailCompose.subject) ? 'not-allowed' : 'pointer',
                opacity: (emailCompose.sending || !emailCompose.to || !emailCompose.subject) ? 0.6 : 1
              }}
            >
              {emailCompose.sending ? 'Sending...' : '📤 Send Email'}
            </button>
          </div>

          {/* Drive Upload Placeholder */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#2563eb', marginBottom: '10px' }}>📁 Drive Upload</h4>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Coming next: Drag & drop file upload to Google Drive
            </p>
          </div>

          {/* Calendar Create Placeholder */}
          <div>
            <h4 style={{ color: '#16a34a', marginBottom: '10px' }}>📅 Create Event</h4>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Coming next: Quick calendar event creation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}