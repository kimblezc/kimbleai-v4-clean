import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-gray-900 border border-gray-800 rounded-lg p-6
        ${hover ? 'hover:border-gray-700 hover:shadow-lg transition-all cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Additional Card subcomponents for analytics compatibility
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-white ${className}`}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-400 ${className}`}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-2">{value}</p>
          {trend && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  trend.value > 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  conversations: number;
  files: number;
  lastActivity: string;
  tags?: string[];
  onClick?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({
  id,
  name,
  description,
  status,
  conversations,
  files,
  lastActivity,
  tags = [],
  onClick,
  onDelete,
}: ProjectCardProps) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-500',
    completed: 'bg-blue-500/20 text-blue-500',
    paused: 'bg-orange-500/20 text-orange-500',
    archived: 'bg-gray-500/20 text-gray-500',
  };

  return (
    <Card hover onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
          {description && (
            <p className="text-sm text-gray-400 line-clamp-2">{description}</p>
          )}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <span>💬</span>
          <span>{conversations} chats</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📁</span>
          <span>{files} files</span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
              +{tags.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-500">Updated {lastActivity}</span>
        {onDelete && id !== 'general' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}

interface FileCardProps {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  project?: string;
  thumbnail?: string;
  onClick?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function FileCard({
  id,
  name,
  type,
  size,
  uploadedAt,
  project,
  thumbnail,
  onClick,
  onDownload,
  onDelete,
}: FileCardProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📎';
  };

  return (
    <Card hover onClick={onClick}>
      <div className="flex items-start gap-3">
        {thumbnail ? (
          <div
            className="w-16 h-16 rounded bg-gray-800 bg-cover bg-center flex-shrink-0"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />
        ) : (
          <div className="w-16 h-16 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">{getFileIcon(type)}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate mb-1">{name}</h4>
          <p className="text-xs text-gray-400 mb-2">
            {formatFileSize(size)} • {uploadedAt}
          </p>
          {project && (
            <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
              {project}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
        {onDownload && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            Download
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}
