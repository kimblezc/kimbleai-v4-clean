# Drive Intelligence Agent - Configuration & Documentation

## Overview

The Drive Intelligence Agent is a comprehensive smart file management system for Google Drive that goes beyond basic upload functionality. It provides intelligent organization, duplicate detection, permission optimization, and storage analytics.

## Features

### 🗂️ Auto-Organization
- **Content-based file classification**: Automatically categorizes files by type and content
- **Smart folder structure**: Creates logical folder hierarchies
- **Custom organization rules**: Configurable rules for different file types
- **Batch processing**: Handles large numbers of files efficiently

### 🔍 Duplicate Detection
- **Advanced algorithms**: Detects duplicates by name, size, and content similarity
- **Smart merging**: Intelligent recommendations for handling duplicates
- **Space optimization**: Calculates potential storage savings
- **Safe processing**: Dry-run mode for preview before changes

### 🔐 Permission Optimization
- **Security analysis**: Identifies overly broad permissions
- **Access pattern analysis**: Reviews sharing patterns
- **Compliance checking**: Ensures files meet security standards
- **Automated recommendations**: Suggests permission improvements

### 📊 Storage Analytics
- **Usage reporting**: Detailed breakdown of storage usage
- **Large file identification**: Finds files consuming most space
- **Growth analysis**: Tracks storage trends over time
- **Optimization suggestions**: Recommends ways to save space

### 📋 Version Control
- **Version detection**: Identifies file versions and duplicates
- **Intelligent naming**: Suggests consistent naming conventions
- **Archive management**: Organizes old versions automatically
- **Cleanup recommendations**: Suggests files for archival

## API Endpoints

### POST /api/agents/drive-intelligence

Main endpoint for all Drive Intelligence operations.

#### Actions

1. **analyze** - Analyze drive structure
2. **organize** - Auto-organize files by content
3. **deduplicate** - Detect and merge duplicates
4. **optimize_permissions** - Analyze and optimize permissions
5. **storage_report** - Generate storage usage report
6. **version_control** - Manage file versions
7. **auto_organize** - Run full optimization

#### Request Format

```json
{
  "action": "analyze",
  "userId": "zach",
  "folderId": "optional_folder_id",
  "options": {
    "dryRun": true,
    "aggressiveness": "moderate",
    "includeSharedFiles": false,
    "maxDepth": 10,
    "fileTypes": ["document", "spreadsheet"],
    "sizeThreshold": 104857600
  }
}
```

#### Response Format

```json
{
  "success": true,
  "action": "analyze",
  "analysis": {
    "totalFiles": 1250,
    "totalFolders": 45,
    "totalSize": 5368709120,
    "fileTypes": {
      "application/vnd.google-apps.document": 325,
      "application/pdf": 128
    },
    "duplicates": [],
    "largeFiles": [],
    "organizationScore": 75,
    "recommendations": []
  }
}
```

### GET /api/agents/drive-intelligence

Check system status and capabilities.

#### Response

```json
{
  "success": true,
  "capabilities": {
    "available": true,
    "features": [
      "Content-based file organization",
      "Duplicate detection and merging",
      "Permission optimization"
    ]
  },
  "status": "ready"
}
```

## Organization Rules

The system uses a priority-based rule engine for file organization:

### Default Rules

1. **Documents** (Priority 1)
   - Google Docs, PDFs, Word documents
   - Target: `/Documents`

2. **Spreadsheets** (Priority 1)
   - Google Sheets, Excel files
   - Target: `/Spreadsheets`

3. **Presentations** (Priority 1)
   - Google Slides, PowerPoint files
   - Target: `/Presentations`

4. **Images** (Priority 1)
   - All image file types
   - Target: `/Images`

5. **Archives** (Priority 2)
   - ZIP, RAR, 7Z files
   - Target: `/Archives`

6. **Old Files** (Priority 3)
   - Files older than 1 year
   - Target: `/Archive/Old Files`

7. **Large Files** (Priority 4)
   - Files larger than 100MB
   - Target: `/Large Files`

### Custom Rules

You can define custom rules by extending the `organizationRules` array in the `DriveOptimizer` class:

```typescript
{
  name: 'Project Files',
  condition: (file) => file.name.includes('project-') && file.mimeType.includes('document'),
  targetFolder: 'Projects/Active',
  description: 'Project-related documents',
  priority: 2
}
```

## Configuration Options

### Optimization Aggressiveness

- **conservative**: Only obvious improvements, minimal changes
- **moderate**: Balanced approach with smart recommendations (default)
- **aggressive**: Maximum optimization, may require review

### File Type Filters

Support for filtering by MIME types:
- `application/vnd.google-apps.document`
- `application/vnd.google-apps.spreadsheet`
- `application/vnd.google-apps.presentation`
- `application/pdf`
- `image/*`
- `text/*`

### Size Thresholds

- **Large files**: Default 50MB (configurable)
- **Archive threshold**: Default 100MB
- **Bulk processing**: Handles up to 1000 files per batch

## Integration with Existing Systems

### Google Drive API Integration

The system integrates with existing Google Drive APIs in:
- `/app/api/google/drive/route.ts` - Basic Drive operations
- `/app/api/google/workspace/` - Workspace integration

### Database Integration

Uses existing Supabase tables:
- `user_tokens` - Google authentication
- `knowledge_base` - File content indexing
- `users` - User management

### Authentication

Leverages existing Google OAuth implementation:
- Requires `drive` and `drive.file` scopes
- Uses refresh tokens for long-running operations
- Respects user permissions and sharing settings

## Security Considerations

### Permission Analysis

The system analyzes and reports on:
- Public files with edit access (High severity)
- Domain-wide edit permissions (Medium severity)
- Files discoverable by search engines (Medium severity)
- Excessive individual permissions (Low severity)

### Data Protection

- **No permanent storage**: File content is analyzed temporarily
- **Dry-run default**: All operations default to preview mode
- **User consent**: Requires explicit user action for changes
- **Audit trail**: Logs all operations for review

### Privacy

- Only processes files the user has access to
- Respects Google Drive sharing permissions
- No external data transmission beyond Google APIs
- Complies with Google API terms of service

## Usage Examples

### Basic Drive Analysis

```javascript
// Analyze entire drive
const response = await fetch('/api/agents/drive-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'analyze',
    options: { maxDepth: 5 }
  })
});
```

### Auto-Organization (Dry Run)

```javascript
// Preview organization changes
const response = await fetch('/api/agents/drive-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'organize',
    options: {
      dryRun: true,
      aggressiveness: 'moderate'
    }
  })
});
```

### Duplicate Detection

```javascript
// Find and analyze duplicates
const response = await fetch('/api/agents/drive-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'deduplicate',
    options: {
      dryRun: true,
      autoMerge: false
    }
  })
});
```

### Full Optimization

```javascript
// Run complete optimization suite
const response = await fetch('/api/agents/drive-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'auto_organize',
    options: {
      dryRun: false,
      aggressiveness: 'moderate',
      includeSharedFiles: false
    }
  })
});
```

## Component Usage

### Dashboard Integration

```jsx
import DriveIntelligenceDashboard from '@/components/agents/DriveIntelligenceDashboard';

function App() {
  return (
    <div>
      <DriveIntelligenceDashboard />
    </div>
  );
}
```

### Programmatic Access

```typescript
import { DriveOptimizer } from '@/lib/drive-optimization';

// Initialize optimizer
const optimizer = new DriveOptimizer(drive, supabase, userId);

// Run analysis
const analysis = await optimizer.analyzeDriveStructure();

// Organize files
const result = await optimizer.organizeByContent(folderId, options);
```

## Performance Considerations

### Rate Limiting

- Google Drive API quota: 1,000 requests per 100 seconds per user
- Batch operations are chunked to respect limits
- Automatic retry with exponential backoff

### Memory Usage

- Processes files in batches of 100
- Streams large file content analysis
- Garbage collection after each batch

### Execution Time

- Analysis: ~30 seconds for 1,000 files
- Organization: ~2 minutes for 500 file moves
- Duplication: ~1 minute for 1,000 files
- Full optimization: ~5 minutes for average drive

## Error Handling

### Common Errors

1. **Authentication Issues**
   - Missing or expired tokens
   - Insufficient permissions
   - Google API quota exceeded

2. **File Access Errors**
   - Files moved or deleted during operation
   - Permission changes during processing
   - Network connectivity issues

3. **Processing Errors**
   - Large file timeout
   - Content analysis failures
   - Batch operation failures

### Recovery Strategies

- Automatic retry with backoff
- Partial success reporting
- Rollback capabilities for critical errors
- Detailed error logging and reporting

## Monitoring and Logging

### Metrics Tracked

- Files processed per operation
- Success/failure rates
- Performance timing
- User satisfaction scores

### Log Levels

- **INFO**: Normal operations and results
- **WARN**: Non-critical issues and retries
- **ERROR**: Failed operations and exceptions
- **DEBUG**: Detailed processing information

## Future Enhancements

### Planned Features

1. **AI-powered categorization**: Use machine learning for smarter organization
2. **Collaborative filtering**: Learn from user behavior patterns
3. **Integration with other cloud storage**: Support for Dropbox, OneDrive
4. **Advanced analytics**: Detailed usage reports and insights
5. **Automated scheduling**: Regular maintenance and optimization
6. **Team management**: Multi-user organization and policies

### API Extensions

1. **Webhook support**: Real-time drive change notifications
2. **Bulk operations API**: Handle massive file operations
3. **Custom rule API**: User-defined organization rules
4. **Integration API**: Third-party app integrations

## Support and Troubleshooting

### Common Issues

1. **Slow performance**: Check Google API quotas and network connectivity
2. **Missing files**: Verify permissions and file sharing settings
3. **Unexpected organization**: Review organization rules and priorities
4. **Permission errors**: Ensure proper Google Drive API scopes

### Getting Help

1. Check the error logs in the dashboard
2. Verify Google authentication and permissions
3. Test with dry-run mode before making changes
4. Contact support with detailed error descriptions

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Compatibility**: Google Drive API v3, Node.js 18+