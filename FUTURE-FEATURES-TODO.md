# Future Features - TODO

**Last Updated:** October 7, 2025

## Audio Transcription Enhancements

### 1. Batch Processing & Sorting
**Priority:** Medium
**Status:** Planned

#### Description:
Allow users to upload multiple audio files at once and process them in batch with automatic sorting and organization.

#### Features:
- **Multi-file Upload**
  - Drag-and-drop multiple files
  - Select multiple files from Google Drive
  - Queue management with progress for each file

- **Automatic Sorting**
  - AI-based categorization by content
  - Sort by date/duration/speaker count
  - Auto-assign to projects based on content analysis
  - Group related recordings (e.g., same meeting series)

- **Batch Export**
  - Export all transcriptions in a project
  - Choose date range for bulk export
  - Single click to export week/month of recordings
  - Consolidated summary report

#### Implementation Notes:
- Use parallel processing for multiple uploads
- AssemblyAI supports concurrent requests
- Need queue UI to show all active transcriptions
- Add bulk actions menu
- Consider cost limits for batch operations

#### User Flow:
1. User selects "Batch Upload" button
2. Selects multiple M4A files (or from Drive folder)
3. System analyzes filenames/metadata for auto-categorization
4. User reviews suggested projects/categories
5. Confirms and starts batch processing
6. Progress dashboard shows all transcriptions
7. When complete, option to "Export All" to organized Drive folders

#### Technical Requirements:
- Queue system for managing multiple jobs
- Progress tracking for each file
- Pause/resume capability
- Cost estimation before starting batch
- Automatic retry on failures

---

## Other Planned Features

### 2. Real-time Transcription
- Live audio transcription during recording
- WebRTC integration for live calls
- Instant speaker identification

### 3. Custom Speaker Names
- Allow renaming "Speaker A" → "John"
- Save speaker profiles across recordings
- Voice fingerprinting for auto-identification

### 4. Transcription Search
- Full-text search across all transcriptions
- Filter by project, date, speaker
- Timestamp-based navigation
- Export search results

### 5. Team Collaboration
- Shared transcription folders
- Comment/annotation on specific timestamps
- @mention team members in transcripts
- Permission management

---

**Note:** These features are logged for future development. Priority will be determined based on user feedback and business needs.
