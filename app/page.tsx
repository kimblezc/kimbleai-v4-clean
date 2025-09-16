'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  userId?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  project?: string;
  tags?: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<'zach' | 'rebecca'>('zach');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentProject, setCurrentProject] = useState('');
  const [currentTags, setCurrentTags] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    startNewConversation();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chat?userId=' + currentUser);
      const data = await response.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
    
    // Also load from localStorage as backup
    const saved = localStorage.getItem('kimbleai_conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConversations(prev => [...prev, ...parsed]);
    }
  };

  const startNewConversation = () => {
    const newId = 'conv_' + Date.now();
    setCurrentConversationId(newId);
    setMessages([]);
    setCurrentProject('');
    setCurrentTags('');
  };

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${convId}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
        setCurrentConversationId(convId);
        
        // Load project and tags
        const conv = conversations.find(c => c.id === convId);
        if (conv) {
          setCurrentProject(conv.project || '');
          setCurrentTags(conv.tags?.join(', ') || '');
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const saveConversation = () => {
    if (!currentConversationId || messages.length === 0) return;
    
    const conversation: Conversation = {
      id: currentConversationId,
      title: messages[0]?.content.substring(0, 50) || 'New Chat',
      messages: messages,
      project: currentProject,
      tags: currentTags.split(',').map(t => t.trim()).filter(t => t),
      userId: currentUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const existing = conversations.filter(c => c.id !== currentConversationId);
    const updated = [conversation, ...existing];
    setConversations(updated);
    localStorage.setItem('kimbleai_conversations', JSON.stringify(updated));
  };

  const deleteConversation = (convId: string) => {
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    localStorage.setItem('kimbleai_conversations', JSON.stringify(updated));
    
    if (convId === currentConversationId) {
      startNewConversation();
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
      userId: currentUser
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: currentUser,
          conversationId: currentConversationId,
          projectId: currentProject,
          tags: currentTags.split(',').map(t => t.trim()).filter(t => t)
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation ID if new
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      // Save conversation after each message
      saveConversation();
      
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
          
          {/* User Selector */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setCurrentUser('zach')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                currentUser === 'zach' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Zach
            </button>
            <button
              onClick={() => setCurrentUser('rebecca')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                currentUser === 'rebecca' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rebecca
            </button>
          </div>
          
          <button
            onClick={startNewConversation}
            className="w-full mt-3 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            + New Conversation
          </button>
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-4">
          {conversations
            .filter(c => c.userId === currentUser)
            .map(conv => (
            <div
              key={conv.id}
              className={`mb-2 p-3 rounded-lg cursor-pointer transition-colors ${
                conv.id === currentConversationId 
                  ? 'bg-blue-50 border-blue-200 border' 
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div 
                onClick={() => loadConversation(conv.id)}
                className="flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">
                    {conv.title}
                  </div>
                  {conv.project && (
                    <div className="text-xs text-blue-600 mt-1">
                      📁 {conv.project}
                    </div>
                  )}
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {conv.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="text-red-500 hover:text-red-700 text-xs ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-gray-500 hover:text-gray-700"
              >
                ☰
              </button>
              <h1 className="text-xl font-semibold text-gray-800">
                KimbleAI V4 - {currentUser === 'zach' ? '👨‍💻 Zach' : '👩‍💼 Rebecca'}
              </h1>
            </div>
            
            {/* Project and Tags */}
            <div className="flex gap-3">
              <input
                type="text"
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                placeholder="Project"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={currentTags}
                onChange={(e) => setCurrentTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                Start a conversation with KimbleAI
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? currentUser === 'zach' 
                        ? 'bg-blue-500 text-white'
                        : 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'user' && message.userId && (
                    <div className="text-xs opacity-75 mb-1">
                      {message.userId}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 px-4 py-3 rounded-lg text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputValue.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}