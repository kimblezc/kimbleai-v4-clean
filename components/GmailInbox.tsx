'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from './ui/card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  labels: string[];
  unread: boolean;
}

interface EmailDetails extends Email {
  to: string;
  cc?: string;
  body: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId?: string;
  }>;
}

interface Label {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export function GmailInbox() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const [processingAttachments, setProcessingAttachments] = useState<string | null>(null);

  const userId = session?.user?.email?.includes('zach') ? 'zach' : 'rebecca';

  useEffect(() => {
    if (session) {
      loadLabels();
      loadEmails();
    }
  }, [session, selectedLabel]);

  const loadLabels = async () => {
    try {
      const response = await fetch(`/api/google/gmail?action=labels&userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setLabels(data.labels);
      }
    } catch (err) {
      console.error('Failed to load labels:', err);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/google/gmail?action=list&userId=${userId}&maxResults=20&labelId=${selectedLabel}`
      );
      const data = await response.json();
      if (data.success) {
        setEmails(data.messages);
      } else {
        setError(data.error || 'Failed to load emails');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const searchEmails = async () => {
    if (!searchQuery.trim()) {
      loadEmails();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/google/gmail?action=search&userId=${userId}&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data.success) {
        setEmails(data.messages || []);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailDetails = async (emailId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/google/gmail?action=get&userId=${userId}&messageId=${emailId}`
      );
      const data = await response.json();
      if (data.success) {
        setSelectedEmail(data.email);
      }
    } catch (err) {
      console.error('Failed to load email:', err);
    } finally {
      setLoading(false);
    }
  };

  const importToKnowledge = async (email: Email) => {
    setImporting(email.id);
    try {
      const response = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: `rfc822msgid:${email.id}`,
          userId,
          maxResults: 1
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Email imported to knowledge base successfully!');
      } else {
        alert('Failed to import email: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error importing email: ' + err);
    } finally {
      setImporting(null);
    }
  };

  const downloadAttachment = async (attachment: any, messageId: string) => {
    const attachmentKey = `${messageId}-${attachment.attachmentId}`;
    setDownloadingAttachment(attachmentKey);
    try {
      const params = new URLSearchParams({
        userId,
        messageId,
        attachmentId: attachment.attachmentId || '',
        filename: attachment.filename,
        mimeType: attachment.mimeType
      });

      const response = await fetch(`/api/google/gmail/attachments?${params}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      alert('Error downloading attachment: ' + err.message);
    } finally {
      setDownloadingAttachment(null);
    }
  };

  const processAttachments = async (email: EmailDetails) => {
    setProcessingAttachments(email.id);
    try {
      const response = await fetch('/api/google/gmail/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messageId: email.id,
          processAll: true
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Processed ${data.attachmentsProcessed} attachment(s) successfully! Files have been indexed and added to your knowledge base.`);
      } else {
        alert('Failed to process attachments: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error processing attachments: ' + err.message);
    } finally {
      setProcessingAttachments(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      return dateString;
    }
  };

  const extractSender = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*<?([^>]+)?>?$/);
    if (match) {
      return match[1].trim();
    }
    return from.split('<')[0].trim() || from;
  };

  if (!session) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-400">Please sign in to view your Gmail inbox</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Sidebar with Labels - Hidden on mobile, shown in dropdown */}
      <div className="hidden md:block w-48 flex-shrink-0">
        <Card className="h-full">
          <h3 className="text-sm font-semibold text-white mb-3">Labels</h3>
          <div className="space-y-1">
            {labels.filter(l => l.type === 'system' || l.type === 'user').map((label) => (
              <button
                key={label.id}
                onClick={() => setSelectedLabel(label.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedLabel === label.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate">{label.name}</span>
                  {label.messagesUnread ? (
                    <span className="text-xs font-semibold">{label.messagesUnread}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Mobile Label Selector */}
      <div className="md:hidden">
        <Card>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {labels.filter(l => l.type === 'system' || l.type === 'user').map((label) => (
              <option key={label.id} value={label.id}>
                {label.name} {label.messagesUnread ? `(${label.messagesUnread})` : ''}
              </option>
            ))}
          </select>
        </Card>
      </div>

      {/* Email List */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Search Bar */}
        <Card>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchEmails()}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={searchEmails} disabled={loading}>
              Search
            </Button>
            {searchQuery && (
              <Button variant="secondary" onClick={() => { setSearchQuery(''); loadEmails(); }}>
                Clear
              </Button>
            )}
          </div>
        </Card>

        {/* Email List */}
        <Card className="flex-1 overflow-auto">
          {loading && !selectedEmail ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">{error}</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No emails found</div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => loadEmailDetails(email.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    email.unread
                      ? 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30'
                      : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                  } ${selectedEmail?.id === email.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold ${email.unread ? 'text-white' : 'text-gray-300'}`}>
                      {extractSender(email.from)}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                  </div>
                  <div className={`text-sm mb-1 ${email.unread ? 'text-white' : 'text-gray-400'}`}>
                    {email.subject}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{email.snippet}</div>
                  {email.unread && (
                    <div className="mt-2">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Email Detail Panel - Full screen on mobile */}
      {selectedEmail && (
        <div className="fixed md:relative inset-0 md:inset-auto md:w-96 flex-shrink-0 z-40 md:z-auto">
          <Card className="h-full overflow-auto rounded-none md:rounded-lg">
            <div className="space-y-4">
              {/* Mobile header with back button */}
              <div className="flex justify-between items-start md:hidden mb-2 pb-2 border-b border-gray-800">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>

              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-white pr-4">{selectedEmail.subject}</h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="hidden md:block text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">From:</span>
                  <div className="text-white">{selectedEmail.from}</div>
                </div>
                <div>
                  <span className="text-gray-500">To:</span>
                  <div className="text-white">{selectedEmail.to}</div>
                </div>
                {selectedEmail.cc && (
                  <div>
                    <span className="text-gray-500">Cc:</span>
                    <div className="text-white">{selectedEmail.cc}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Date:</span>
                  <div className="text-white">{new Date(selectedEmail.date).toLocaleString()}</div>
                </div>
              </div>

              {selectedEmail.attachments.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2 flex justify-between items-center">
                    <span>Attachments ({selectedEmail.attachments.length}):</span>
                    <button
                      onClick={() => processAttachments(selectedEmail)}
                      disabled={processingAttachments === selectedEmail.id}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded disabled:opacity-50"
                    >
                      {processingAttachments === selectedEmail.id ? 'Processing...' : 'Process All'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {selectedEmail.attachments.map((att, idx) => {
                      const attachmentKey = `${selectedEmail.id}-${att.attachmentId}`;
                      return (
                        <div
                          key={idx}
                          className="text-sm bg-gray-800 px-3 py-2 rounded flex justify-between items-center group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-blue-400 truncate">{att.filename}</span>
                            <span className="text-gray-500 text-xs whitespace-nowrap">
                              ({Math.round((att.size || 0) / 1024)}KB)
                            </span>
                          </div>
                          <button
                            onClick={() => downloadAttachment(att, selectedEmail.id)}
                            disabled={downloadingAttachment === attachmentKey}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 whitespace-nowrap"
                          >
                            {downloadingAttachment === attachmentKey ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4">
                <div className="text-white whitespace-pre-wrap text-sm">{selectedEmail.body}</div>
              </div>

              <Button
                fullWidth
                onClick={() => importToKnowledge(selectedEmail)}
                disabled={importing === selectedEmail.id}
              >
                {importing === selectedEmail.id ? 'Importing...' : 'Import to Knowledge Base'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
