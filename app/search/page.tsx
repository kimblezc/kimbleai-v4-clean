import UnifiedSearch from '@/components/search/UnifiedSearch';

export const metadata = {
  title: 'Search - KimbleAI',
  description: 'Search across Gmail, Drive, files, and knowledge base',
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <UnifiedSearch />
      </div>
    </div>
  );
}
