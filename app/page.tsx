'use client'
import { useState } from 'react'

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    setMessages([...messages, {role: 'user', content: input}])
    setInput('')
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages: [...messages, {role: 'user', content: input}]})
    })
    
    const data = await response.json()
    setMessages(prev => [...prev, {role: 'assistant', content: data.message}])
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-8">KimbleAI V4</h1>
      <div className="bg-gray-800 rounded-lg p-6 mb-4 h-96 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-blue-400' : 'text-green-400'}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-800 rounded px-4 py-2"
          placeholder="Type a message..."
        />
        <button type="submit" className="bg-blue-600 px-6 py-2 rounded">Send</button>
      </form>
    </div>
  )
}
