# 🧪 Project Deletion Testing Guide
**KimbleAI v4 - Test the Fixed Project Management**

## 🌐 Live Testing URL
**https://kimbleai.com**

## 📋 Test Steps

### Step 1: Create Test Projects
1. **Visit kimbleai.com**
2. **Look for "Projects" section** in the left sidebar
3. **Click the "+" button** next to "Projects"
4. **Create multiple test projects:**
   - "Test Project 1"
   - "Test Project 2"
   - "DND Campaign Test"
   - "Work Test Project"
5. **Verify** new projects appear **at the top** of the list

### Step 2: Test Project Scrolling
1. **Create 8+ projects** to exceed the 300px container height
2. **Verify** you can **scroll** through the project list
3. **Check** that scrollbars are **visible** and functional

### Step 3: Test Project Deletion
1. **Select a test project** (click on it to make it current)
2. **Click the 🗑️ delete button** next to the project name
3. **Verify the confirmation dialog** appears with warning text
4. **Click "OK"** to confirm deletion
5. **Check that:**
   - Project **disappears from the list immediately**
   - Success message shows: "Project deleted successfully!"
   - You're **switched to General project** if you deleted current project

### Step 4: Test Persistence
1. **Delete 2-3 projects**
2. **Refresh the page** (F5 or Ctrl+R)
3. **Verify** deleted projects **stay deleted** after reload
4. **Switch users** (Zach ↔ Rebecca) and back
5. **Verify** deleted projects **remain deleted**

### Step 5: Test Protection
1. **Try to delete "General" project**
2. **Verify** it shows "Cannot delete the General project"
3. **Confirm** General project cannot be removed

## 🔧 Advanced Testing

### Test Conversation Movement
1. **Create a project** and **send some messages** in it
2. **Delete the project**
3. **Switch to General project**
4. **Verify** conversations from deleted project appear in General

### Test Project Recreation Prevention
1. **Delete a project** with conversations
2. **Send new messages** that might auto-create projects
3. **Verify** deleted project names **don't reappear**

## 🐛 What to Look For

### ✅ Expected Behavior:
- Projects delete immediately and permanently
- Scrollable project list with visible scrollbars
- New projects appear at top
- Deleted projects stay deleted after page refresh
- Cannot delete "General" project
- Conversations move to General when project deleted

### ❌ Issues to Report:
- Projects reappear after deletion
- No scrollbar when many projects
- Projects don't delete at all
- Page errors or crashes
- Lost conversations after deletion

## 🛠️ Debug Information

### Browser Console
Open **Developer Tools (F12)** → **Console** tab to see:
- Any JavaScript errors
- Deletion confirmation logs
- LocalStorage entries: `kimbleai_deleted_projects_zach` or `kimbleai_deleted_projects_rebecca`

### LocalStorage Check
In **Developer Tools** → **Application** → **LocalStorage** → **kimbleai.com**:
- Look for `kimbleai_deleted_projects_zach`
- Should contain array of deleted project IDs

### Network Tab
Check **Network** tab for:
- API calls to `/api/conversations`
- Any failed requests during project operations

## 📞 Reporting Results

After testing, report:
1. **✅ What worked correctly**
2. **❌ What didn't work**
3. **🐛 Any error messages**
4. **📊 Browser/device used**
5. **👤 User account tested (Zach/Rebecca)**

---
**Testing URL:** https://kimbleai.com
**Expected Result:** Complete, persistent project deletion with scrollable interface