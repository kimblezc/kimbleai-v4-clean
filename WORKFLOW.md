# 🚀 SIMPLE DAILY WORKFLOW - KIMBLEAI

**Your code lives at:** `C:\Dev\Projects\kimbleai-v4-clean`

---

## 📅 DAILY ROUTINE

### Starting Work (PC or Laptop)

**Just double-click:** `work-start.bat`

This automatically:
1. ✅ Gets latest code from GitHub
2. ✅ Installs any new dependencies
3. ✅ Starts development server

**That's it!** Browser opens to http://localhost:3000

---

### Ending Work (PC or Laptop)

**Just double-click:** `work-done.bat`

This asks you "What did you work on?" then automatically:
1. ✅ Saves all your changes
2. ✅ Backs up to GitHub
3. ✅ Ready for next device

**That's it!** Your code is safe and synced.

---

## 🔄 SWITCHING DEVICES

### Example: PC → Laptop

**On PC (before leaving):**
- Double-click `work-done.bat`
- Type what you did (e.g., "Added login feature")
- Done! (Takes 15 seconds)

**On Laptop (when you sit down):**
- Double-click `work-start.bat`
- Wait 10 seconds
- Your PC changes appear! Keep working.

---

## ⚡ QUICK SAVE (Emergency)

**Need to switch NOW but haven't organized your work?**

Double-click: `quick-save.bat`

Instantly saves everything to GitHub with timestamp.

---

## 🎯 THREE SIMPLE SCRIPTS

1. **work-start.bat** - Start working (gets latest code)
2. **work-done.bat** - Finish working (saves to GitHub)
3. **quick-save.bat** - Emergency save

**That's literally all you need to know.**

---

## ❓ TROUBLESHOOTING

### "I forgot to run work-done.bat before switching!"

**Solution:**
- Go back to that computer
- Run `work-done.bat`
- OR: Remote desktop in and run it
- OR: Accept you'll re-do that work (happens rarely)

**Prevention:** Make it a habit - always run `work-done.bat` before closing laptop.

---

### "work-start.bat says 'Already up to date'"

**This is normal!** It means:
- No new code from other devices
- You're ready to work
- Just press any key to start server

---

### "work-done.bat shows 'nothing to commit'"

**This is normal!** It means:
- You didn't change any files
- Nothing to save
- That's fine!

---

### "I see merge conflicts"

**This means:** You edited the same file on both PC and laptop.

**Solution:**
1. `work-start.bat` will stop and show conflict
2. Open the file in VS Code
3. You'll see:
   ```
   <<<<<<< HEAD
   Your PC version
   =======
   Your Laptop version
   >>>>>>> origin/master
   ```
4. Delete the lines you DON'T want
5. Delete the `<<<<`, `====`, `>>>>` markers
6. Save file
7. Run `work-done.bat` again

**Prevention:** Always run `work-done.bat` before switching devices.

---

## 🏆 GOLDEN RULES

### Rule #1: Start with work-start.bat
**Every time** you sit down to work, double-click it first.

### Rule #2: End with work-done.bat
**Every time** you finish working, double-click it before closing laptop.

### Rule #3: Quick-save if uncertain
If you're not sure, just run `quick-save.bat`. Can't hurt!

---

## 📍 WHERE IS EVERYTHING?

### Your Code:
- **PC**: `C:\Dev\Projects\kimbleai-v4-clean`
- **Laptop**: `C:\Dev\Projects\kimbleai-v4-clean`
- **GitHub**: https://github.com/kimblezc/kimbleai-v4-clean
- **Production**: https://www.kimbleai.com (Railway)

### Scripts Location:
All in your project folder:
- `C:\Dev\Projects\kimbleai-v4-clean\work-start.bat`
- `C:\Dev\Projects\kimbleai-v4-clean\work-done.bat`
- `C:\Dev\Projects\kimbleai-v4-clean\quick-save.bat`

---

## ⏱️ TIME TO SWITCH DEVICES

**Total time:** 25 seconds

1. Double-click `work-done.bat` → 15 seconds
2. Switch to other computer
3. Double-click `work-start.bat` → 10 seconds
4. **Done!** Code is identical on both devices.

---

## 🎓 THAT'S EVERYTHING

You now know the entire workflow:
- ✅ Start: `work-start.bat`
- ✅ End: `work-done.bat`
- ✅ Emergency: `quick-save.bat`

**No cloud drives. No complexity. Just works.**

Questions? Check CLAUDE.md or ask in kimbleai.com chat.
