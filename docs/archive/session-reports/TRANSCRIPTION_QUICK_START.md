# Transcription System - Quick Start Guide

## ✅ What's Fixed

Your transcription system now includes:

1. **Speaker Separation** - Automatically detects and labels different speakers (Speaker A, Speaker B, etc.)
2. **4-File Google Drive Upload** - Exports everything you need in one organized folder
3. **Smart Organization** - Files organized by date and transcription name
4. **Comprehensive Metadata** - Full JSON with all details, timestamps, and speaker stats

---

## 🚀 How to Use

### Step 1: Transcribe Audio

1. Go to **http://localhost:3000/transcribe**
2. Browse to a folder with audio files (.m4a, .mp3, .wav)
3. Click **"Transcribe"** on any audio file
4. Wait for completion (you'll see a progress bar)

### Step 2: Export to Google Drive

When transcription is complete:

1. Click **"☁️ Export All to Drive"** button
2. Wait 5-30 seconds (depending on file size)
3. See success message with file list

### Step 3: View Your Files

Go to your Google Drive and navigate to:

```
/Transcriptions/
  /2025-01-24/           ← Today's date
    /your-audio-name/    ← Your audio filename
      - your-audio-name.m4a         ← Original audio
      - full-transcription.txt      ← Complete transcript with timestamps
      - speaker-separated.txt       ← Grouped by speaker
      - metadata.json               ← All data (speakers, timestamps, etc.)
```

---

## 📁 The 4 Files Explained

### File 1: Original Audio (your-audio-name.m4a)
- Your original audio file
- Same quality as uploaded
- Play it anytime

### File 2: full-transcription.txt
Complete transcript with timestamps and speaker labels.

**Example:**
```
TRANSCRIPTION: team-meeting.m4a
Duration: 15:42
Date: 1/24/2025, 10:30:00 AM

================================================================================

[0:00] Speaker A: Welcome everyone to today's standup.
[0:15] Speaker B: Thanks, I'll start with my updates.
[0:45] Speaker A: Great, how's the API integration going?
[1:20] Speaker B: Almost done, should be ready by Friday.
```

### File 3: speaker-separated.txt
Same content but grouped by speaker for easier reading.

**Example:**
```
SPEAKER-SEPARATED TRANSCRIPTION: team-meeting.m4a
Duration: 15:42
Date: 1/24/2025, 10:30:00 AM

================================================================================

--- SPEAKER A ---

[0:00] Welcome everyone to today's standup.
[0:45] Great, how's the API integration going?
[2:30] Perfect, let's move to the next topic.

--- SPEAKER B ---

[0:15] Thanks, I'll start with my updates.
[1:20] Almost done, should be ready by Friday.
[3:15] I agree with that approach.
```

### File 4: metadata.json
Complete data including speaker statistics, all timestamps, and metadata.

**Example:**
```json
{
  "filename": "team-meeting.m4a",
  "duration_seconds": 942,
  "duration_formatted": "15:42",
  "word_count": 2847,
  "speaker_count": 2,
  "utterance_count": 45,
  "speakers": [
    {
      "speaker_id": "A",
      "utterance_count": 23,
      "word_count": 1456
    },
    {
      "speaker_id": "B",
      "utterance_count": 22,
      "word_count": 1391
    }
  ],
  "utterances": [
    {
      "speaker": "A",
      "start_ms": 0,
      "end_ms": 5000,
      "start_time": "0:00",
      "end_time": "0:05",
      "text": "Welcome everyone to today's standup.",
      "confidence": 0.95
    }
  ],
  "auto_tags": ["meeting", "standup", "team"],
  "action_items": [
    "Complete API integration by Friday",
    "Review Q4 numbers"
  ]
}
```

---

## 🎯 Use Cases

### 1. Meeting Minutes
- **Full transcript**: Send to attendees
- **Speaker-separated**: See who said what
- **Metadata**: Extract action items automatically

### 2. Interviews
- **Full transcript**: Complete interview record
- **Speaker-separated**: Separate interviewer/candidate responses
- **Metadata**: Analyze talking time per person

### 3. Podcasts
- **Full transcript**: Blog post or show notes
- **Speaker-separated**: Identify host vs guest
- **Metadata**: Word count, duration stats

### 4. Lectures
- **Full transcript**: Study notes
- **Speaker-separated**: Q&A section identification
- **Metadata**: Key topics extracted

---

## 💡 Tips & Tricks

### Better Speaker Separation
- Use high-quality audio (avoid background noise)
- Ensure speakers don't talk over each other
- Use separate microphones if possible
- Avoid music/background audio

### Organizing Transcriptions
- Use descriptive filenames (e.g., "client-call-acme-2025-01-24.m4a")
- Files auto-organize by date
- Each transcription gets its own folder

### Finding Transcriptions
- Search by date: `/Transcriptions/2025-01-24/`
- Search by name: Use Google Drive search
- Check metadata.json for keywords/tags

---

## 🔧 Troubleshooting

### "Export failed: No Google Drive file ID found"
**Solution**: Make sure you transcribed the audio from the `/transcribe` page (not uploaded directly)

### "Only 3 files exported (missing audio)"
**Solution**: The original audio must be in Google Drive. If you uploaded locally, only 3 files will export.

### "Speaker separation not working"
**Possible causes:**
- Audio quality too poor
- Only one speaker
- Speakers talking over each other constantly

**Solution**: Try with clearer audio or accept the full transcript without speaker labels

### "Authentication expired"
**Solution**: Sign out and sign back in to refresh your Google OAuth token

---

## 📊 Cost & Limits

### Transcription Cost
- **$0.41 per hour** of audio
- Includes speaker diarization
- No additional cost for exports

### Daily Limits
- **50 hours** of audio per day
- **$25** daily cost limit
- Automatically enforced

### File Size
- **No limit** on audio file size
- Downloads from Drive (no server upload limit)
- Typical 1-hour audio = ~60MB

---

## 🎉 What's New (v2.0)

Compared to the old system:

| Feature | Old System | New System (v2.0) |
|---------|------------|-------------------|
| Files exported | 1 (TXT only) | 4 (Audio + 3 text formats) |
| Speaker separation | ❌ Not visible | ✅ Clearly labeled |
| Folder organization | Random/none | Date-based hierarchy |
| Metadata | Basic | Comprehensive JSON |
| Original audio | ❌ Lost | ✅ Preserved |
| Speaker stats | ❌ No | ✅ Yes (per speaker) |
| Timestamps | Basic | Multiple formats |
| Action items | ❌ No | ✅ Auto-extracted |

---

## 🆘 Need Help?

### Check Logs
1. Open browser console (F12)
2. Look for `[SAVE-TO-DRIVE]` or `[EXPORT]` messages
3. Check for error messages

### Test the System
Run the test script:
```bash
npx tsx scripts/test-transcription-export.ts
```

### Report an Issue
Include:
- Transcription filename
- Error message (from browser console)
- Server logs (if accessible)
- Steps to reproduce

---

## 🔗 Related Documentation

- Full implementation proof: `TRANSCRIPTION_FIX_PROOF.md`
- Test script: `scripts/test-transcription-export.ts`
- API endpoints:
  - Transcription: `/api/transcribe/assemblyai`
  - Drive upload: `/api/transcribe/save-to-drive`
  - Drive transcription: `/api/transcribe/drive-assemblyai`

---

**Version**: 2.0
**Last Updated**: 2025-01-24
**Status**: ✅ Ready to use
