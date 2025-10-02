'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { SearchInput } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get('q') || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&userId=zach`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Search</h1>

          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            placeholder="Search conversations, files, projects, and more..."
            className="mb-6"
          />

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-400">Searching...</p>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <Card>
              <div className="text-center py-8">
                <span className="text-5xl mb-3 block">🔍</span>
                <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
                <p className="text-gray-400">Try different keywords or check your spelling</p>
              </div>
            </Card>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((result) => (
                <Card key={result.id} hover onClick={() => router.push(result.url)}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{result.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">{result.title}</h3>
                        <span className="text-xs text-gray-500">{result.type}</span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">{result.description}</p>
                      {result.project && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {result.project}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
