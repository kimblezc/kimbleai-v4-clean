'use client'
import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  project?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [currentProject, setCurrentProject] = useState<string>('')
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [userId, setUserId] = useState('')
  const [tagInputValue, setTagInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Initialize on mount
  useEffect(() => {
    // Load conversations from localStorage
    const stored = localStorage.getItem('kimbleai_conversations')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const reconstituted = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }))
        setConversations(reconstituted)
      } catch (e) {
        console.error('Error loading conversations:', e)
      }
    }
    
    // Set or get user ID
    let uid = localStorage.getItem('kimbleai_userId')
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).substring(7)
      localStorage.setItem('kimbleai_userId', uid)
    }
    setUserId(uid)
  }, [])
  
  // Save conversations when they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('kimbleai_conversations', JSON.stringify(conversations))
    }
  }, [conversations])
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      title: 'New Conversation',
      messages: [],
      project: '',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setConversations([newConv, ...conversations])
    setCurrentConversationId(newConv.id)
    setMessages([])
    setCurrentProject('')
    setCurrentTags([])
  }
  
  const loadConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id)
    setMessages(conv.messages)
    setCurrentProject(conv.project || '')
    setCurrentTags(conv.tags || [])
  }
  
  const deleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    const updated = conversations.filter(c => c.id !== convId)
    setConversations(updated)
    
    if (currentConversationId === convId) {
      setCurrentConversationId(null)
      setMessages([])
      setCurrentProject('')
      setCurrentTags([])
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    
    const userMessage: Message = {
      id: 'msg_' + Date.now() + '_user',
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    // Create or update conversation
    let convId = currentConversationId
    let updatedConversations = [...conversations]
    
    if (!convId) {
      const newConv: Conversation = {
        id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        title: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        project: currentProject,
        tags: currentTags,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      updatedConversations = [newConv, ...conversations]
      setConversations(updatedConversations)
      setCurrentConversationId(newConv.id)
      convId = newConv.id
    }
    
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          conversationId: convId,
          projectId: currentProject
        })
      })
      
      const data = await response.json()
      
      const assistantMessage: Message = {
        id: 'msg_' + Date.now() + '_assistant',
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }
      
      const finalMessages = [...newMessages, assistantMessage]
      setMessages(finalMessages)
      
      // Update conversation in state
      const finalConversations = updatedConversations.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: finalMessages,
            updatedAt: new Date(),
            project: currentProject,
            tags: currentTags
          }
        }
        return c
      })
      setConversations(finalConversations)
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: 'msg_error_' + Date.now(),
        role: 'assistant',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: new Date()
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInputValue.trim()) {
      e.preventDefault()
      const newTag = tagInputValue.trim()
      if (!currentTags.includes(newTag)) {
        setCurrentTags([...currentTags, newTag])
      }
      setTagInputValue('')
    }
  }
  
  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove))
  }
  
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-16'} bg-gray-800 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 flex items-center">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-gray-700 rounded text-xl"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          {showSidebar && (
            <button
              onClick={createNewConversation}
              className="ml-3 px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
            >
              + New Chat
            </button>
          )}
        </div>
        
        {showSidebar && (
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Conversations</h3>
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-sm">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                    currentConversationId === conv.id 
                      ? 'bg-gray-700' 
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{conv.title}</div>
                      {conv.project && (
                        <div className="text-xs text-blue-400 mt-1">📁 {conv.project}</div>
                      )}
                      {conv.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {conv.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-600 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {conv.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="ml-2 text-gray-400 hover:text-red-400 text-lg"
                      aria-label="Delete conversation"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Project and Tags */}
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">KimbleAI V4</h1>
            
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="text"
                placeholder="Project name..."
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
              />
              
              <input
                type="text"
                placeholder="Add tag (Enter)..."
                value={tagInputValue}
                onChange={(e) => setTagInputValue(e.target.value)}
                onKeyDown={handleAddTag}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
              />
              
              {currentTags.map(tag => (
                <span key={tag} className="bg-blue-600 px-2 py-1 rounded text-xs flex items-center gap-1">
                  {tag}
                  <button 
                    onClick={() => removeTag(tag)} 
                    className="hover:text-red-200 text-sm"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="text-gray-500 text-center mt-20">
              Start a conversation or select one from the sidebar
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              <div className={`font-semibold mb-1 ${
                msg.role === 'user' ? 'text-blue-400' : 'text-green-400'
              }`}>
                {msg.role === 'user' ? 'user' : 'assistant'}
                <span className="text-xs text-gray-500 ml-2">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="pl-4 whitespace-pre-wrap text-gray-100">
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="text-yellow-400 animate-pulse">
              KimbleAI is thinking...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type a message..."
              disabled={loading}
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </form>
        
        {/* Status Bar */}
        <div className="bg-gray-900 px-4 py-2 text-xs text-gray-500 flex justify-between">
          <span>user: {userId}</span>
          <span>conversations: {conversations.length}</span>
          <span>current: {currentConversationId ? 'active' : 'none'}</span>
        </div>
      </div>
    </div>
  )
}