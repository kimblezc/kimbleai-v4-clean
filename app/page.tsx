// Force rebuild: 2025-09-15 23:17:19
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
  const [showSidebar, setShowSidebar] = useState(false)
  const [userId, setUserId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Initialize
  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('kimbleai_conversations')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setConversations(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })))
      } catch (e) {
        console.error('Error loading conversations:', e)
      }
    }
    
    // Set user ID
    let uid = localStorage.getItem('kimbleai_userId')
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).substring(7)
      localStorage.setItem('kimbleai_userId', uid)
    }
    setUserId(uid)
  }, [])
  
  // Save conversations
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('kimbleai_conversations', JSON.stringify(conversations))
    }
  }, [conversations])
  
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: 'conv_' + Date.now(),
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
    localStorage.setItem('kimbleai_conversations', JSON.stringify(updated))
    
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
      id: 'msg_' + Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    // Create or update conversation
    let convId = currentConversationId
    let updatedConversations = [...conversations]
    
    if (!convId) {
      const newConv: Conversation = {
        id: 'conv_' + Date.now(),
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
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }
      
      const finalMessages = [...newMessages, assistantMessage]
      setMessages(finalMessages)
      
      // Update conversation
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
      setMessages([...newMessages, {
        id: 'msg_error_' + Date.now(),
        role: 'assistant',
        content: 'Error: Failed to get response',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }
  
  const addTag = (tag: string) => {
    if (tag && !currentTags.includes(tag)) {
      setCurrentTags([...currentTags, tag])
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            â˜°
          </button>
          <h1 className="text-xl font-bold">KimbleAI V4</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Project..."
            value={currentProject}
            onChange={(e) => setCurrentProject(e.target.value)}
            className="px-2 py-1 bg-gray-700 rounded text-sm"
          />
          <input
            type="text"
            placeholder="Add tag..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addTag(e.currentTarget.value)
                e.currentTarget.value = ''
              }
            }}
            className="px-2 py-1 bg-gray-700 rounded text-sm"
          />
          {currentTags.map(tag => (
            <span key={tag} className="bg-blue-600 px-2 py-1 rounded text-xs">
              {tag}
              <button 
                onClick={() => setCurrentTags(currentTags.filter(t => t !== tag))}
                className="ml-1"
              >
                Ã—
              </button>
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 bg-gray-800 h-screen overflow-y-auto">
            <div className="p-4">
              <button
                onClick={createNewConversation}
                className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                + New Chat
              </button>
            </div>
            
            <div className="px-4">
              <h3 className="text-sm text-gray-400 mb-2">History</h3>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`p-2 mb-2 rounded cursor-pointer hover:bg-gray-700 ${
                    currentConversationId === conv.id ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="text-sm">{conv.title}</div>
                      {conv.project && (
                        <div className="text-xs text-blue-400">ðŸ“ {conv.project}</div>
                      )}
                      {conv.tags.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {conv.tags.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      Ã—
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Main Chat */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.map((msg) => (
              <div key={msg.id} className="mb-4">
                <div className="font-semibold text-blue-400">
                  {msg.role === 'user' ? 'user' : 'assistant'}:
                </div>
                <div className="pl-4 text-white">{msg.content}</div>
              </div>
            ))}
            {loading && <div className="text-yellow-400">Thinking...</div>}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-gray-700 rounded px-4 py-2"
                placeholder="Type a message..."
                disabled={loading}
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600"
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </form>
          
          {/* Status */}
          <div className="bg-gray-900 px-4 py-1 text-xs text-gray-500">
            user: {userId} | conversations: {conversations.length}
          </div>
        </div>
      </div>
    </div>
  )
}
