'use client'
import { useState, useEffect, useRef } from 'react'
import MessageSearch from '@/components/MessageSearch'

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [userId, setUserId] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [projectId, setProjectId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    // Generate or retrieve user ID
    let storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      storedUserId = 'user_' + Math.random().toString(36).substring(7)
      localStorage.setItem('userId', storedUserId)
    }
    setUserId(storedUserId)
  }, [])
  
  // Handle message reference insertion from search
  const handleInsertReference = (reference: string, content: string) => {
    setInput(prev => prev + ' ' + reference + ' ')
    inputRef.current?.focus()
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setMessages(prev => [...prev, {role: 'user', content: userMessage}])
    setInput('')
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          messages: [...messages, {role: 'user', content: userMessage}],
          userId: userId,
          conversationId: conversationId,
          projectId: projectId,
          context: {
            platform: 'web',
            sessionId: sessionStorage.getItem('sessionId') || 'session_' + Date.now()
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }
      
      const data = await response.json()
      
      // Update conversation ID if this is the first message
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId)
      }
      
      // Update project ID if auto-assigned
      if (!projectId && data.projectId) {
        setProjectId(data.projectId)
      }
      
      setMessages(prev => [...prev, {role: 'assistant', content: data.response}])
      
      // Show metadata in console for debugging
      console.log('Response metadata:', data.metadata)
      
    } catch (err: any) {
      console.error('Chat error:', err)
      setError(err.message || 'Failed to send message')
      setMessages(prev => [...prev, {role: 'assistant', content: 'Error: ' + (err.message || 'Failed to get response')}])
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">KimbleAI V4</h1>
        <div className="text-sm text-gray-400 mb-6">
          user: {userId || 'loading...'} | 
          {conversationId ? ` conversation: ${conversationId.substring(0, 8)}...` : ' new conversation'}
          {projectId && ` | project: ${projectId.substring(0, 8)}...`}
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-4 h-[500px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-gray-500 text-center mt-20">
              Start a conversation... (Press Ctrl+K to search past messages)
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>
              <strong className="block mb-1">{msg.role === 'user' ? 'You' : 'KimbleAI'}:</strong>
              <div className="pl-4 whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="text-yellow-400 animate-pulse">
              KimbleAI is thinking...
            </div>
          )}
          {error && (
            <div className="text-red-400 mt-2">
              Error: {error}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-gray-800 rounded px-4 py-2 text-white"
            placeholder="Type a message... (Ctrl+K to search)"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className={`px-6 py-2 rounded ${isLoading ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          Connected to Supabase | Powered by GPT-4 | Auto-logging enabled | Ctrl+K to search messages
        </div>
        
        {/* Message Search Component */}
        <MessageSearch 
          userId={userId}
          onSelectMessage={handleInsertReference}
          currentConversationId={conversationId}
          currentProjectId={projectId}
        />
      </div>
    </div>
  )
}