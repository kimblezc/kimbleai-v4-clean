# How to Organize Content with Projects

**Your kimbleai.com already has a full projects system!** You can create projects like "D&D Campaign Spring 2025" or "Military Transition Planning" and organize all your content under them.

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Create Your Projects

**Via API** (easiest for now):
```javascript
// In browser console on kimbleai.com
fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    userId: 'zach-admin-001',
    projectData: {
      name: 'D&D Campaign Spring 2025',
      description: 'My weekly D&D game sessions',
      priority: 'high',
      tags: ['dnd', 'gaming', 'campaign']
    }
  })
}).then(r => r.json()).then(console.log);
```

**Create a second project for Military Transition**:
```javascript
fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    userId: 'zach-admin-001',
    projectData: {
      name: 'Military Transition Planning',
      description: 'Career transition and job search',
      priority: 'critical',
      tags: ['military', 'transition', 'career']
    }
  })
}).then(r => r.json()).then(console.log);
```

### Step 2: Get Your Project IDs

```javascript
fetch('/api/projects?userId=zach-admin-001&action=list')
  .then(r => r.json())
  .then(data => {
    console.log('Your Projects:');
    data.projects.forEach(p => {
      console.log(`${p.name}: ${p.id}`);
    });
  });
```

**Save these IDs!** Example:
- D&D: `proj_dd-campaign-spring-2025_1738398720000`
- Military: `proj_military-transition-planning_1738398740000`

### Step 3: Upload Audio to a Project

When uploading audio, the frontend already sends `currentProject`. You just need to **set** `currentProject` before uploading:

**In browser console before uploading**:
```javascript
// Set current project to D&D
window.currentProject = 'proj_dd-campaign-spring-2025_1738398720000';

// OR set to Military Transition
window.currentProject = 'proj_military-transition-planning_1738398740000';
```

Then upload your audio file normally!

### Step 4: View Project Content

```javascript
// Get all content for your D&D project
fetch('/api/projects/content?projectId=proj_dd-campaign-spring-2025_1738398720000&userId=zach-admin-001')
  .then(r => r.json())
  .then(data => {
    console.log(`${data.project.name}: ${data.stats.total_count} items`);
    console.log('Audio:', data.content.audio_transcriptions);
    console.log('Conversations:', data.content.conversations);
    console.log('Knowledge:', data.content.knowledge_base);
  });
```

---

## 🎲 Example: Organizing D&D Content

### Create D&D Project
```javascript
const dndProject = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    userId: 'zach-admin-001',
    projectData: {
      name: 'D&D - Waterdeep Dragon Heist',
      description: 'Campaign sessions, character notes, and story arcs',
      status: 'active',
      priority: 'high',
      tags: ['dnd', 'waterdeep', 'campaign', 'gaming'],
      metadata: {
        client: 'Personal',
        tech_stack: ['dice', 'character-sheets', 'maps']
      }
    }
  })
}).then(r => r.json());

console.log('D&D Project Created:', dndProject.project.id);
```

### Upload Session Recording
```javascript
// Set project before uploading
window.currentProject = dndProject.project.id;

// Then use the audio upload button on kimbleai.com
// Recording will be automatically assigned to D&D project
```

### View All D&D Content
```javascript
const dndContent = await fetch(`/api/projects/content?projectId=${dndProject.project.id}&userId=zach-admin-001`)
  .then(r => r.json());

console.log(`D&D Campaign has ${dndContent.stats.total_count} items:`);
console.log(`- ${dndContent.stats.audio_count} audio transcriptions`);
console.log(`- ${dndContent.stats.conversation_count} conversations`);
console.log(`- ${dndContent.stats.knowledge_count} knowledge items`);
```

### Search Within D&D Project
```javascript
// Get all transcriptions for D&D
const dndTranscriptions = dndContent.content.audio_transcriptions;

// Search for specific sessions
const combatSessions = dndTranscriptions.filter(t =>
  t.text?.toLowerCase().includes('initiative') ||
  t.text?.toLowerCase().includes('roll for attack')
);

console.log(`Found ${combatSessions.length} combat-heavy sessions`);
```

---

## 🎖️ Example: Organizing Military Transition Content

### Create Military Transition Project
```javascript
const milProject = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    userId: 'zach-admin-001',
    projectData: {
      name: 'Military Transition - Tech Career Path',
      description: 'Interviews, networking calls, and career planning',
      status: 'active',
      priority: 'critical',
      tags: ['military', 'transition', 'tech', 'career', 'networking'],
      metadata: {
        deadline: '2026-01-01', // Target transition date
        client: 'Personal Career'
      }
    }
  })
}).then(r => r.json());

console.log('Military Project Created:', milProject.project.id);
```

### Upload Interview Recording
```javascript
window.currentProject = milProject.project.id;
// Upload audio of networking call or interview
```

### Track Transition Progress
```javascript
const milContent = await fetch(`/api/projects/content?projectId=${milProject.project.id}&userId=zach-admin-001`)
  .then(r => r.json());

console.log('Military Transition Progress:');
console.log(`- Networking calls recorded: ${milContent.stats.audio_count}`);
console.log(`- Companies researched: ${milContent.stats.knowledge_count}`);
console.log(`- Action items: ${milContent.content.audio_transcriptions.reduce((sum, t) => sum + (t.action_items?.length || 0), 0)}`);
```

---

## 📋 Managing Projects

### List All Projects
```javascript
fetch('/api/projects?userId=zach-admin-001&action=list')
  .then(r => r.json())
  .then(data => {
    console.log(`You have ${data.total} projects:`);
    data.projects.forEach(p => {
      console.log(`- ${p.name} (${p.status}): ${p.stats.total_conversations} conversations`);
    });
  });
```

### Update Project
```javascript
fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    userId: 'zach-admin-001',
    projectId: 'proj_dd-campaign-spring-2025_1738398720000',
    updates: {
      status: 'completed', // Mark campaign as finished
      priority: 'low'
    }
  })
}).then(r => r.json()).then(console.log);
```

### Delete Project
```javascript
fetch('/api/projects/delete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'zach-admin-001',
    projectId: 'proj_old-project_1234567890'
  })
}).then(r => r.json()).then(console.log);
```

---

## 🔍 Advanced Features

### Hierarchical Projects
Create sub-projects:
```javascript
// Parent project
const parentProject = await createProject({
  name: 'D&D - All Campaigns',
  description: 'Master project for all D&D content'
});

// Child project
const childProject = await createProject({
  name: 'D&D - Waterdeep Dragon Heist',
  description: 'Specific campaign',
  parentProjectId: parentProject.project.id // Link to parent
});
```

### Project Analytics
```javascript
fetch(`/api/projects?action=analytics&projectId=YOUR_PROJECT_ID`)
  .then(r => r.json())
  .then(data => {
    console.log('Project Analytics:');
    console.log('Overview:', data.analytics.overview);
    console.log('Timeline:', data.analytics.timeline);
    console.log('Productivity:', data.analytics.productivity);
  });
```

### Filter Projects
```javascript
fetch('/api/projects?userId=zach-admin-001&action=list')
  .then(r => r.json())
  .then(data => {
    // Filter to active projects only
    const active = data.projects.filter(p => p.status === 'active');

    // Filter by tags
    const dndProjects = data.projects.filter(p => p.tags.includes('dnd'));
    const milProjects = data.projects.filter(p => p.tags.includes('military'));

    console.log(`Active: ${active.length}`);
    console.log(`D&D: ${dndProjects.length}`);
    console.log(`Military: ${milProjects.length}`);
  });
```

---

## 🎨 Future UI Enhancement

**Coming soon:** A visual project selector on the upload page so you don't need to use console commands.

For now, the workflow is:
1. Create projects via API (one-time setup)
2. Set `window.currentProject` before uploading
3. View content via `/api/projects/content`

---

## 🚀 Quick Commands Cheat Sheet

```javascript
// === CREATE PROJECTS ===

// D&D Project
await fetch('/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'create', userId: 'zach-admin-001', projectData: {name: 'D&D Campaign', description: 'My D&D sessions', tags: ['dnd']}})}).then(r => r.json());

// Military Project
await fetch('/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'create', userId: 'zach-admin-001', projectData: {name: 'Military Transition', description: 'Career planning', tags: ['military', 'transition']}})}).then(r => r.json());

// === LIST PROJECTS ===
await fetch('/api/projects?userId=zach-admin-001&action=list').then(r => r.json()).then(d => d.projects.forEach(p => console.log(p.name, p.id)));

// === SET PROJECT FOR UPLOAD ===
window.currentProject = 'YOUR_PROJECT_ID_HERE';

// === VIEW PROJECT CONTENT ===
await fetch('/api/projects/content?projectId=YOUR_PROJECT_ID&userId=zach-admin-001').then(r => r.json()).then(console.log);
```

---

## 📊 What Gets Organized

When you assign content to a project, it includes:

1. **Audio Transcriptions** - All uploaded audio files
2. **Conversations** - Chat conversations with AI
3. **Knowledge Base** - Indexed information
4. **Auto-Generated Tags** - Automatically categorized
5. **Action Items** - Extracted from transcriptions
6. **Speaker Labels** - Who said what (in audio)
7. **Sentiment Analysis** - Emotional tone
8. **Key Topics** - Main themes discussed

---

## ✅ Benefits

**Separation**: D&D content stays separate from Military Transition content
**Search**: Find specific sessions or calls quickly
**Analytics**: Track progress and activity per project
**Organization**: Hierarchical structure (parent/child projects)
**Auto-Tagging**: AI automatically categorizes content
**Collaboration**: Add teammates to projects (future)
**Timeline**: See chronological view of project activity

---

## 🎯 Example Workflows

### Workflow 1: Weekly D&D Session
1. Open kimbleai.com
2. Console: `window.currentProject = 'proj_dnd-campaign_123'`
3. Upload audio recording
4. Transcription automatically tagged with D&D keywords
5. View all sessions: `/api/projects/content?projectId=proj_dnd-campaign_123`

### Workflow 2: Job Interview Tracking
1. Create "Military Transition" project (one-time)
2. Before each interview recording: Set project ID
3. Upload interview audio
4. Review action items extracted automatically
5. Search across all interviews for specific topics

### Workflow 3: Campaign Analysis
1. Get all D&D transcriptions for project
2. Search for character names, combat encounters, story arcs
3. Generate summary of campaign progress
4. Identify key moments and decisions

---

## 🔧 Troubleshooting

**Problem**: Upload doesn't assign to project
**Solution**: Make sure `window.currentProject` is set BEFORE uploading

**Problem**: Can't find project ID
**Solution**: Run `fetch('/api/projects?userId=zach-admin-001&action=list').then(r => r.json()).then(console.log)`

**Problem**: Project content is empty
**Solution**: Verify you uploaded audio AFTER setting `window.currentProject`

**Problem**: Want to move existing transcription to project
**Solution**: Update via database (Supabase) or re-upload with correct project

---

## 📝 Next Steps

1. **Run database migration** (adds project_id to audio_transcriptions):
   ```sql
   -- Run in Supabase SQL Editor
   -- File: database/add-project-to-transcriptions.sql
   ```

2. **Create your projects** using the API calls above

3. **Set project before uploading** your next audio file

4. **View organized content** via `/api/projects/content`

---

**Your content organization system is ready to use!** 🎉

No hardcoded categories - you create projects for whatever you need (D&D, Military Transition, Work, Personal, etc.)
