'use client';

import { useState } from 'react';

interface FileUploadProps {
  userId: string;
  onUploadComplete?: () => void;
}

export default function FileUpload({ userId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUploadStatus(`Successfully indexed: ${file.name}`);
        setTimeout(() => setUploadStatus(''), 3000);
        if (onUploadComplete) onUploadComplete();
      } else {
        setUploadStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadStatus(`Failed to upload ${file.name}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#40414f',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px'
    }}>
      <h3 style={{ color: '#ececf1', fontSize: '16px', marginBottom: '12px' }}>
        Upload Document
      </h3>
      
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#10a37f' : '#565869'}`,
          borderRadius: '6px',
          padding: '30px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragActive ? '#343541' : 'transparent',
          transition: 'all 0.3s'
        }}
      >
        <input
          type="file"
          id="file-upload"
          onChange={handleChange}
          accept=".txt,.md,.pdf,.docx,.doc,.csv"
          style={{ display: 'none' }}
        />
        
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <div style={{ color: '#8e8ea0', fontSize: '14px' }}>
            {uploading ? (
              <div>Uploading...</div>
            ) : (
              <>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                <div>Drop file here or click to browse</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  Supports: TXT, MD, PDF, DOCX, CSV
                </div>
              </>
            )}
          </div>
        </label>
      </div>
      
      {uploadStatus && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: uploadStatus.includes('Error') ? '#ef4444' : '#10a37f',
          color: 'white',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
}