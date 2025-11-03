# 🤖 AUTOMATION OPTIONS

Multiple ways to automate your Kimbleai workflow!

---

## Option 1: Desktop Shortcuts (RECOMMENDED)

**Run once:** Double-click `create-shortcuts.bat`

This creates 3 shortcuts on your desktop:
- **Start Kimbleai** - Runs work-start.bat
- **Save Kimbleai** - Runs work-done.bat
- **Quick Save Kimbleai** - Runs quick-save.bat

**Benefits:**
- One-click access from desktop
- Can pin to taskbar
- Can assign keyboard shortcuts (right-click → Properties → Shortcut key)

**Setup:**
1. Double-click `create-shortcuts.bat`
2. Shortcuts appear on desktop
3. (Optional) Drag to taskbar to pin them
4. (Optional) Right-click → Properties → Set hotkey (e.g., Ctrl+Alt+K)

---

## Option 2: Windows Startup (Auto-Launch)

**Run once:** Double-click `setup-startup.bat`

This makes Kimbleai start automatically when Windows boots.

**Benefits:**
- Completely automatic
- No clicking needed
- Dev server ready immediately

**Drawbacks:**
- Uses resources even if not developing
- Terminal window opens on boot

**Setup:**
1. Double-click `setup-startup.bat`
2. Confirm "yes"
3. Done! Restart to test

**To disable:**
- Press `Win + R`
- Type: `shell:startup`
- Delete "Kimbleai Auto-Start" shortcut

---

## Option 3: Keyboard Shortcuts

**Fastest access after creating desktop shortcuts!**

1. Right-click desktop shortcut
2. Properties
3. Shortcut tab → Shortcut key
4. Press your combo (e.g., `Ctrl + Alt + K`)
5. OK

**Suggested hotkeys:**
- Start: `Ctrl + Alt + K` (Kimbleai)
- Save: `Ctrl + Alt + S` (Save)
- Quick Save: `Ctrl + Alt + Q` (Quick)

Now press `Ctrl + Alt + K` anywhere to start Kimbleai!

---

## Option 4: Windows Terminal Integration

Add to Windows Terminal settings:

1. Open Windows Terminal settings (Ctrl + ,)
2. Add new profile:
```json
{
  "name": "Kimbleai Dev",
  "commandline": "cmd.exe /k \"cd C:\\Dev\\Projects\\kimbleai-v4-clean && work-start.bat\"",
  "startingDirectory": "C:\\Dev\\Projects\\kimbleai-v4-clean",
  "icon": "🚀"
}
```
3. Save
4. Now available in Terminal dropdown!

---

## Option 5: PowerShell Profile Aliases

Add to your PowerShell profile:

```powershell
# Edit profile
notepad $PROFILE

# Add these lines:
function kimble-start { cd C:\Dev\Projects\kimbleai-v4-clean; .\work-start.bat }
function kimble-save { cd C:\Dev\Projects\kimbleai-v4-clean; .\work-done.bat }
function kimble-quick { cd C:\Dev\Projects\kimbleai-v4-clean; .\quick-save.bat }

# Save and reload
. $PROFILE
```

Now type `kimble-start` in any PowerShell window!

---

## Option 6: VS Code Tasks

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Kimbleai",
      "type": "shell",
      "command": "${workspaceFolder}/work-start.bat",
      "problemMatcher": []
    },
    {
      "label": "Save Kimbleai",
      "type": "shell",
      "command": "${workspaceFolder}/work-done.bat",
      "problemMatcher": []
    }
  ]
}
```

Access via: `Ctrl + Shift + P` → "Run Task" → "Start Kimbleai"

---

## Recommended Setup:

**For most users:**
1. ✅ Run `create-shortcuts.bat` (desktop shortcuts)
2. ✅ Pin "Start Kimbleai" to taskbar
3. ✅ Assign hotkey `Ctrl + Alt + K`

**For power users:**
1. ✅ Desktop shortcuts + hotkeys
2. ✅ PowerShell aliases
3. ✅ VS Code tasks

**For "set it and forget it":**
1. ✅ Run `setup-startup.bat`
2. ✅ Kimbleai auto-starts on boot

---

## Which Should You Use?

### Desktop Shortcuts
**Best for:** Most people
**Effort:** 30 seconds one-time setup
**Access:** One click or hotkey

### Auto-Startup
**Best for:** Daily developers
**Effort:** 1 minute one-time setup
**Access:** Automatic (no action needed)

### Keyboard Shortcuts
**Best for:** Power users
**Effort:** 2 minutes per hotkey
**Access:** Press combo anywhere

### PowerShell Aliases
**Best for:** Terminal lovers
**Effort:** 5 minutes one-time setup
**Access:** Type command in terminal

---

## Test Your Setup:

After setting up automation, test it:

1. **Desktop shortcut:** Double-click "Start Kimbleai"
2. **Hotkey:** Press your assigned combo
3. **Auto-startup:** Restart computer
4. **Alias:** Open PowerShell, type `kimble-start`

All should launch work-start.bat!

---

## Troubleshooting:

### Shortcut doesn't work
- Right-click → Properties
- Check "Target" path is correct
- Check "Start in" is set to project folder

### Hotkey doesn't work
- Make sure no other program uses same combo
- Try different combination
- Restart Explorer.exe

### Auto-startup doesn't work
- Check Startup folder: `Win + R` → `shell:startup`
- Make sure shortcut exists
- Check shortcut target is correct

---

**Questions?** See WORKFLOW.md or ask in kimbleai.com chat.
