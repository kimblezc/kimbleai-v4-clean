# Transcription System - Complete Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────┘

1. User uploads audio to Google Drive
   │
   ├─→ audio-file.m4a saved in Drive
   └─→ Drive File ID generated

2. User navigates to /transcribe page
   │
   ├─→ Browses Google Drive folders
   ├─→ Finds audio file
   └─→ Clicks "Transcribe" button

3. Transcription starts
   │
   ├─→ API: /api/transcribe/drive-assemblyai
   ├─→ Downloads audio from Google Drive
   ├─→ Uploads to AssemblyAI
   ├─→ Starts transcription with speaker_labels: true
   └─→ Returns job ID

4. User waits (progress bar shows status)
   │
   ├─→ Frontend polls /api/transcribe/assemblyai?jobId=...
   ├─→ Progress: 0% → 30% → 60% → 90% → 100%
   └─→ Status changes: queued → processing → completed

5. User clicks "Export All to Drive"
   │
   ├─→ API: /api/transcribe/save-to-drive
   ├─→ Creates 4 files
   └─→ Uploads to organized folder

6. User opens Google Drive
   │
   └─→ Finds files in /Transcriptions/[date]/[name]/
```

---

## Detailed Component Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSCRIPTION PROCESS                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Google Drive │ ← User uploads audio file
└──────┬───────┘
       │
       │ File ID: 1abc...xyz
       │
       ↓
┌──────────────────────┐
│ /transcribe Page     │
│ (Frontend)           │
├──────────────────────┤
│ - Browse folders     │
│ - Select audio file  │
│ - Click "Transcribe" │
└──────┬───────────────┘
       │
       │ POST /api/transcribe/drive-assemblyai
       │ { fileId, fileName, userId, projectId }
       │
       ↓
┌──────────────────────────────┐
│ Drive-AssemblyAI Endpoint    │
│ (Backend)                    │
├──────────────────────────────┤
│ 1. Get Google OAuth token    │
│ 2. Download audio from Drive │
│ 3. Upload to AssemblyAI      │
│ 4. Request transcription:    │
│    - speaker_labels: true    │
│ 5. Save to database:         │
│    - job_id                  │
│    - assemblyai_id           │
│    - googleDriveFileId       │
│    - mimeType                │
└──────┬───────────────────────┘
       │
       │ Returns: { success, jobId }
       │
       ↓
┌──────────────────────┐
│ AssemblyAI Service   │
├──────────────────────┤
│ - Transcribes audio  │
│ - Detects speakers   │
│ - Labels utterances  │
│ - Adds timestamps    │
└──────┬───────────────┘
       │
       │ Polling every 5 seconds
       │ GET /api/transcribe/assemblyai?jobId=...
       │
       ↓
┌──────────────────────────────┐
│ AssemblyAI Endpoint          │
│ (Backend - GET)              │
├──────────────────────────────┤
│ 1. Check database for job    │
│ 2. Query AssemblyAI status   │
│ 3. Update database           │
│ 4. Return status/result      │
└──────┬───────────────────────┘
       │
       │ When completed:
       │ {
       │   status: "completed",
       │   result: {
       │     text: "...",
       │     utterances: [
       │       { speaker: "A", text: "..." },
       │       { speaker: "B", text: "..." }
       │     ]
       │   }
       │ }
       │
       ↓
┌──────────────────────┐
│ Frontend             │
│ (Transcribe Page)    │
├──────────────────────┤
│ Shows:               │
│ ✅ Complete          │
│ 📄 TXT               │
│ 📦 JSON              │
│ 🎬 SRT               │
│ ☁️ Export to Drive   │ ← User clicks this
└──────┬───────────────┘
       │
       │ POST /api/transcribe/save-to-drive
       │ { transcriptionId, userId, multiFormat: true }
       │
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Save-to-Drive Endpoint                                          │
│ (Backend)                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Fetch transcription from database                           │
│ 2. Create folder structure:                                    │
│    /Transcriptions/[YYYY-MM-DD]/[name]/                        │
│                                                                 │
│ 3. Create 4 files:                                             │
│                                                                 │
│    FILE 1: Original Audio                                      │
│    ┌────────────────────────────────┐                          │
│    │ - Download from Drive          │                          │
│    │   (using googleDriveFileId)    │                          │
│    │ - Upload to organized folder   │                          │
│    │ - Preserve MIME type           │                          │
│    └────────────────────────────────┘                          │
│                                                                 │
│    FILE 2: Full Transcription                                  │
│    ┌────────────────────────────────┐                          │
│    │ Format:                        │                          │
│    │ [0:00] Speaker A: text         │                          │
│    │ [0:15] Speaker B: text         │                          │
│    │ ...                            │                          │
│    │ Tags: meeting, standup         │                          │
│    │ Action Items:                  │                          │
│    │ 1. Complete API by Friday      │                          │
│    └────────────────────────────────┘                          │
│                                                                 │
│    FILE 3: Speaker-Separated                                   │
│    ┌────────────────────────────────┐                          │
│    │ Format:                        │                          │
│    │ --- SPEAKER A ---              │                          │
│    │ [0:00] text                    │                          │
│    │ [0:45] text                    │                          │
│    │                                │                          │
│    │ --- SPEAKER B ---              │                          │
│    │ [0:15] text                    │                          │
│    │ [1:20] text                    │                          │
│    └────────────────────────────────┘                          │
│                                                                 │
│    FILE 4: Metadata JSON                                       │
│    ┌────────────────────────────────┐                          │
│    │ {                              │                          │
│    │   speaker_count: 2,            │                          │
│    │   speakers: [                  │                          │
│    │     {                          │                          │
│    │       speaker_id: "A",         │                          │
│    │       utterance_count: 23,     │                          │
│    │       word_count: 1456         │                          │
│    │     }                          │                          │
│    │   ],                           │                          │
│    │   utterances: [...],           │                          │
│    │   auto_tags: [...],            │                          │
│    │   action_items: [...]          │                          │
│    │ }                              │                          │
│    └────────────────────────────────┘                          │
│                                                                 │
│ 4. Return success with file list                               │
└─────┬───────────────────────────────────────────────────────────┘
      │
      │ Returns:
      │ {
      │   success: true,
      │   files: [
      │     { format: "Original Audio", name: "...", webViewLink: "..." },
      │     { format: "Full Transcription (TXT)", ... },
      │     { format: "Speaker-Separated (TXT)", ... },
      │     { format: "Metadata (JSON)", ... }
      │   ]
      │ }
      │
      ↓
┌──────────────────────┐
│ Frontend             │
├──────────────────────┤
│ Shows success alert: │
│                      │
│ ✅ Exported 4 files  │
│ • Original Audio     │
│ • Full Transcript    │
│ • Speaker-Separated  │
│ • Metadata           │
└──────────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA TRANSFORMATIONS                         │
└─────────────────────────────────────────────────────────────────────┘

1. AUDIO FILE
   ┌─────────────────┐
   │ meeting.m4a     │
   │ Size: 45.2 MB   │
   │ Duration: 15:42 │
   └────────┬────────┘
            │
            ↓

2. ASSEMBLYAI TRANSCRIPTION
   ┌──────────────────────────────────────────┐
   │ {                                        │
   │   text: "Welcome everyone...",           │
   │   audio_duration: 942,                   │
   │   utterances: [                          │
   │     {                                    │
   │       speaker: "A",                      │
   │       start: 0,                          │
   │       end: 5000,                         │
   │       text: "Welcome everyone...",       │
   │       confidence: 0.95                   │
   │     },                                   │
   │     {                                    │
   │       speaker: "B",                      │
   │       start: 15000,                      │
   │       end: 20000,                        │
   │       text: "Thanks for having me...",   │
   │       confidence: 0.93                   │
   │     }                                    │
   │   ]                                      │
   │ }                                        │
   └────────┬─────────────────────────────────┘
            │
            ↓

3. DATABASE RECORD
   ┌──────────────────────────────────────────┐
   │ audio_transcriptions                     │
   │ ├─ id: 123                               │
   │ ├─ user_id: "zach"                       │
   │ ├─ filename: "meeting.m4a"               │
   │ ├─ duration: 942                         │
   │ ├─ text: "Welcome everyone..."           │
   │ ├─ assemblyai_id: "abc123"               │
   │ ├─ status: "completed"                   │
   │ └─ metadata: {                           │
   │      googleDriveFileId: "1abc...xyz",    │
   │      mimeType: "audio/m4a",              │
   │      utterances: [...],                  │
   │      auto_tags: ["meeting", "standup"],  │
   │      action_items: [...]                 │
   │    }                                     │
   └────────┬─────────────────────────────────┘
            │
            ↓

4. EXPORT TO DRIVE (4 FILES)

   FILE 1: meeting.m4a
   ┌────────────────────────┐
   │ [Binary audio data]    │
   │ Size: 45.2 MB          │
   │ Type: audio/m4a        │
   └────────────────────────┘

   FILE 2: full-transcription.txt
   ┌────────────────────────────────────┐
   │ TRANSCRIPTION: meeting.m4a         │
   │ Duration: 15:42                    │
   │ Date: 1/24/2025, 10:30:00 AM       │
   │                                    │
   │ [0:00] Speaker A: Welcome...       │
   │ [0:15] Speaker B: Thanks...        │
   │ [0:45] Speaker A: Great point...   │
   │                                    │
   │ TAGS: meeting, standup, team       │
   │ ACTION ITEMS:                      │
   │ 1. Complete API by Friday          │
   └────────────────────────────────────┘

   FILE 3: speaker-separated.txt
   ┌────────────────────────────────────┐
   │ --- SPEAKER A ---                  │
   │ [0:00] Welcome everyone...         │
   │ [0:45] Great point...              │
   │                                    │
   │ --- SPEAKER B ---                  │
   │ [0:15] Thanks for having me...     │
   │ [1:20] Almost done...              │
   └────────────────────────────────────┘

   FILE 4: metadata.json
   ┌────────────────────────────────────┐
   │ {                                  │
   │   "filename": "meeting.m4a",       │
   │   "speaker_count": 2,              │
   │   "speakers": [                    │
   │     {                              │
   │       "speaker_id": "A",           │
   │       "utterance_count": 23        │
   │     },                             │
   │     {                              │
   │       "speaker_id": "B",           │
   │       "utterance_count": 22        │
   │     }                              │
   │   ],                               │
   │   "utterances": [...],             │
   │   "auto_tags": [...]               │
   │ }                                  │
   └────────────────────────────────────┘
```

---

## Folder Organization

```
Google Drive
│
└─── Transcriptions/                    ← Main folder (auto-created)
     │
     ├─── 2025-01-24/                   ← Date folders (auto-created)
     │    │
     │    ├─── team-standup-morning/    ← Transcription folders (auto-created)
     │    │    ├─ team-standup-morning.m4a
     │    │    ├─ full-transcription.txt
     │    │    ├─ speaker-separated.txt
     │    │    └─ metadata.json
     │    │
     │    ├─── client-call-acme-corp/
     │    │    ├─ client-call-acme-corp.m4a
     │    │    ├─ full-transcription.txt
     │    │    ├─ speaker-separated.txt
     │    │    └─ metadata.json
     │    │
     │    └─── interview-candidate-john/
     │         ├─ interview-candidate-john.m4a
     │         ├─ full-transcription.txt
     │         ├─ speaker-separated.txt
     │         └─ metadata.json
     │
     ├─── 2025-01-25/
     │    ├─── morning-meeting/
     │    └─── afternoon-brainstorm/
     │
     └─── 2025-01-26/
          ├─── weekly-review/
          └─── planning-session/
```

**Benefits:**
- Easy to find by date
- All files for one transcription grouped together
- Scalable (handles thousands of transcriptions)
- Chronological browsing

---

## Speaker Separation Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPEAKER DIARIZATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1. Audio Input
   ┌──────────────────────┐
   │ Mixed audio track    │
   │ Multiple speakers    │
   └──────┬───────────────┘
          │
          ↓

2. AssemblyAI Processing
   ┌────────────────────────────────────┐
   │ - Analyzes voice characteristics   │
   │ - Detects speaker changes          │
   │ - Assigns speaker labels (A, B, C) │
   │ - Adds timestamps                  │
   └──────┬─────────────────────────────┘
          │
          ↓

3. Utterances Generated
   ┌──────────────────────────────────────────────┐
   │ [                                            │
   │   { speaker: "A", start: 0,     text: "..." }, │
   │   { speaker: "B", start: 15000, text: "..." }, │
   │   { speaker: "A", start: 45000, text: "..." }, │
   │   { speaker: "B", start: 80000, text: "..." }, │
   │   { speaker: "C", start: 120000, text: "..." } │
   │ ]                                            │
   └──────┬───────────────────────────────────────┘
          │
          ↓

4. Two Output Formats

   A) Full Transcription (chronological)
   ┌────────────────────────────────┐
   │ [0:00] Speaker A: ...          │
   │ [0:15] Speaker B: ...          │
   │ [0:45] Speaker A: ...          │
   │ [1:20] Speaker B: ...          │
   │ [2:00] Speaker C: ...          │
   └────────────────────────────────┘

   B) Speaker-Separated (grouped)
   ┌────────────────────────────────┐
   │ --- SPEAKER A ---              │
   │ [0:00] ...                     │
   │ [0:45] ...                     │
   │                                │
   │ --- SPEAKER B ---              │
   │ [0:15] ...                     │
   │ [1:20] ...                     │
   │                                │
   │ --- SPEAKER C ---              │
   │ [2:00] ...                     │
   └────────────────────────────────┘
```

**Accuracy Factors:**
- Audio quality (noise, clarity)
- Speaker distinction (different voices)
- Overlap (speakers talking over each other)
- Duration (longer = more accurate)

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

Scenario 1: Original Audio Not Found
┌──────────────────────────┐
│ googleDriveFileId = null │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Skip original audio      │
│ Continue with 3 files:   │
│ - full-transcription.txt │
│ - speaker-separated.txt  │
│ - metadata.json          │
└──────────────────────────┘

Scenario 2: Speaker Separation Unavailable
┌──────────────────────────┐
│ utterances = []          │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ speaker-separated.txt shows:     │
│ "No speaker separation available"│
│ + plain text transcript          │
└──────────────────────────────────┘

Scenario 3: Folder Creation Fails
┌──────────────────────────┐
│ Error creating folder    │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Upload to Drive root     │
│ Log warning              │
│ Continue export          │
└──────────────────────────┘

Scenario 4: Authentication Expired
┌──────────────────────────┐
│ Google token expired     │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Return 401 error         │
│ Show: "Please sign in"   │
│ User clicks sign in      │
└──────────────────────────┘

All Errors:
- Logged to console
- User-friendly message shown
- Retry option available
- System continues gracefully
```

---

## Performance Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE METRICS                             │
└─────────────────────────────────────────────────────────────────────┘

Transcription Time
┌────────────────────────────┐
│ 5-minute audio  → 3-5 min  │
│ 15-minute audio → 8-15 min │
│ 30-minute audio → 20-30 min│
│ 1-hour audio    → 30-60 min│
└────────────────────────────┘

Export Time
┌────────────────────────────┐
│ Small (< 10MB)  → 5-10 sec │
│ Medium (10-50MB)→ 10-20 sec│
│ Large (50MB+)   → 20-40 sec│
└────────────────────────────┘

File Sizes
┌─────────────────────────────────────┐
│ Original audio: 60MB per hour       │
│ Full transcript: 10-50KB per hour   │
│ Speaker-separated: 10-50KB per hour │
│ Metadata JSON: 100KB-5MB per hour   │
└─────────────────────────────────────┘

Cost
┌────────────────────────────┐
│ Transcription: $0.41/hour  │
│ Storage: Free (in Drive)   │
│ Export: Free               │
└────────────────────────────┘
```

---

**Created**: 2025-01-24
**Version**: 2.0
**Status**: ✅ Production Ready
