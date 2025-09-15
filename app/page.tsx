'use client'
import { useState } from 'react'

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })
      
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response' }])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">KimbleAI V4</h1>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-[400px] overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>
              <strong>{msg.role}:</strong> {msg.content}
            </div>
          ))}
          {loading && <div className="text-yellow-400">Loading...</div>}
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-gray-800 rounded px-4 py-2"
            placeholder="Type a message..."
            disabled={loading}
          />
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600"
            disabled={loading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}