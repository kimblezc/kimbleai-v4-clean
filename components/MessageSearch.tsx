'use client'
import { useState, useCallback, useEffect } from 'react'

interface SearchResult {
  id: string
  content: string
  role: string
  timestamp: string
  conversationId: string
  projectId?: string
  metadata: any
  reference: string
  preview: string
}

interface MessageSearchProps {
  userId: string
  onSelectMessage?: (reference: string, content: string) => void
  currentConversationId?: string
  currentProjectId?: string
}

export default function MessageSearch({ 
  userId, 
  onSelectMessage, 
  currentConversationId,
  currentProjectId 
}: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchType, setSearchType] = useState<'messages' | 'files' | 'decisions' | 'actions'>('messages')
  const [filters, setFilters] = useState({
    onlyCurrentConversation: false,
    onlyCurrentProject: false,
    role: 'all' as 'all' | 'user' | 'assistant',
    hasCode: false,
    hasDecisions: false
  })
  const [selectedMessage, setSelectedMessage] = useState<SearchResult | null>(null)
  
  const performSearch = useCallback(async () => {
    if (!query.trim() && searchType === 'messages') return
    
    setIsSearching(true)
    try {
      const searchFilters: any = {
        userId,
        limit: 20
      }
      
      if (filters.onlyCurrentConversation && currentConversationId) {
        searchFilters.conversationId = currentConversationId
      }
      if (filters.onlyCurrentProject && currentProjectId) {
        searchFilters.projectId = currentProjectId
      }
      if (filters.role !== 'all') {
        searchFilters.role = filters.role
      }
      if (filters.hasCode) {
        searchFilters.hasCode = true
      }
      if (filters.hasDecisions) {
        searchFilters.hasDecisions = true
      }
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters: searchFilters,
          searchType
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [query, searchType, filters, userId, currentConversationId, currentProjectId])
  
  const loadMessageContext = async (messageId: string) => {
    try {
      const response = await fetch(`/api/search?messageId=${messageId}&includeContext=true`)
      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error('Failed to load message context:', error)
    }
    return null
  }
  
  const handleSelectMessage = async (result: SearchResult) => {
    setSelectedMessage(result)
    const context = await loadMessageContext(result.id)
    if (onSelectMessage) {
      onSelectMessage(result.reference, result.content)
    }
  }
  
  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])
  
  // Auto-search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query || searchType !== 'messages') {
        performSearch()
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query, performSearch])
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Search messages (Ctrl+K)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Search Messages</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for messages, code, decisions..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded"
              autoFocus
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              <option value="messages">Messages</option>
              <option value="files">Files</option>
              <option value="decisions">Decisions</option>
              <option value="actions">Action Items</option>
            </select>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filters.onlyCurrentConversation}
                onChange={(e) => setFilters(f => ({ ...f, onlyCurrentConversation: e.target.checked }))}
                className="mr-2"
              />
              Current conversation only
            </label>
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filters.onlyCurrentProject}
                onChange={(e) => setFilters(f => ({ ...f, onlyCurrentProject: e.target.checked }))}
                className="mr-2"
              />
              Current project only
            </label>
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filters.hasCode}
                onChange={(e) => setFilters(f => ({ ...f, hasCode: e.target.checked }))}
                className="mr-2"
              />
              Has code
            </label>
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filters.hasDecisions}
                onChange={(e) => setFilters(f => ({ ...f, hasDecisions: e.target.checked }))}
                className="mr-2"
              />
              Has decisions
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(f => ({ ...f, role: e.target.value as any }))}
              className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
            >
              <option value="all">All roles</option>
              <option value="user">User only</option>
              <option value="assistant">Assistant only</option>
            </select>
          </div>
        </div>
        
        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching && (
            <div className="text-center text-gray-400 py-8">
              Searching...
            </div>
          )}
          
          {!isSearching && results.length === 0 && query && (
            <div className="text-center text-gray-400 py-8">
              No results found for "{query}"
            </div>
          )}
          
          {!isSearching && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelectMessage(result)}
                  className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-sm font-semibold ${
                      result.role === 'user' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {result.role === 'user' ? 'You' : 'KimbleAI'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {result.preview}
                  </div>
                  {result.metadata?.tags && result.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.metadata.tags.map((tag: string) => (
                        <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>Reference: {result.reference}</span>
                    {result.metadata?.code_blocks?.length > 0 && (
                      <span>📝 Has code</span>
                    )}
                    {result.metadata?.decisions?.length > 0 && (
                      <span>🎯 Has decisions</span>
                    )}
                    {result.metadata?.action_items?.length > 0 && (
                      <span>✅ Has actions</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Message Details */}
        {selectedMessage && (
          <div className="border-t border-gray-700 p-4">
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400 mb-2">Selected message:</div>
              <div className="text-white text-sm">{selectedMessage.reference}</div>
              <button
                onClick={() => {
                  if (onSelectMessage) {
                    onSelectMessage(selectedMessage.reference, selectedMessage.content)
                  }
                  setIsOpen(false)
                }}
                className="mt-2 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
              >
                Insert Reference
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="border-t border-gray-700 p-3 text-xs text-gray-500 text-center">
          Press Ctrl+K to open search • ESC to close • Click a message to reference it
        </div>
      </div>
    </div>
  )
}