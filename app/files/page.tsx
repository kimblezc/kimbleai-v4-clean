'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { FileCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchInput, Select } from '../../components/ui/Input';
import { useRouter } from 'next/navigation';
import LoadingScreen from '../../components/LoadingScreen';

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files?userId=zach');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === 'all' || file.project_id === projectFilter;
    return matchesSearch && matchesProject;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingScreen message="Loading files..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Files</h1>
            <p className="text-gray-400">Manage and organize your files</p>
          </div>
          <Button icon="⬆️" onClick={() => router.push('/files/upload')}>
            Upload File
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search files..."
            />
          </div>
          <Select
            value={projectFilter}
            onChange={setProjectFilter}
            options={[
              { value: 'all', label: 'All Projects' },
              { value: 'general', label: 'General' },
            ]}
          />
        </div>

        {filteredFiles.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <span className="text-6xl mb-4 block">📁</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery || projectFilter !== 'all'
                ? 'No files found'
                : 'No files yet'}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || projectFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first file to get started'}
            </p>
            {!searchQuery && projectFilter === 'all' && (
              <Button onClick={() => router.push('/files/upload')}>Upload File</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                id={file.id}
                name={file.filename}
                type={file.file_type}
                size={file.file_size}
                uploadedAt={new Date(file.created_at).toLocaleDateString()}
                project={file.project_id}
                onClick={() => {}}
                onDownload={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
