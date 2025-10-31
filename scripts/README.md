# KimbleAI Scripts

Utility scripts for development and deployment automation.

## Laptop Sync Script

**Purpose**: Automatically sync your laptop with the latest desktop changes.

### Usage

When switching from desktop to laptop:

**Linux/Mac:**
```bash
cd ~/path/to/kimbleai-v4-clean
./scripts/laptop-sync.sh
```

**Windows (PowerShell):**
```powershell
cd C:\path\to\kimbleai-v4-clean
.\scripts\laptop-sync.ps1
```

### What It Does

1. ✅ Checks you're in the right directory
2. 💾 Stashes any uncommitted changes
3. 📥 Pulls latest changes from GitHub
4. 📦 Installs dependencies if package.json changed
5. 📋 Restores your stashed changes
6. 🏗️ Cleans build cache
7. 🔨 Rebuilds the project
8. 📖 Shows session handoff summary

### One-Time Setup

**Linux/Mac:**
```bash
# Make script executable (already done)
chmod +x scripts/laptop-sync.sh

# Optional: Create alias for quick access
echo 'alias kimble-sync="cd ~/path/to/kimbleai-v4-clean && ./scripts/laptop-sync.sh"' >> ~/.bashrc
source ~/.bashrc

# Now you can run from anywhere:
kimble-sync
```

**Windows (PowerShell):**
```powershell
# Enable script execution (if needed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Optional: Create function in PowerShell profile
notepad $PROFILE
# Add this line:
# function kimble-sync { cd C:\path\to\kimbleai-v4-clean; .\scripts\laptop-sync.ps1 }

# Reload profile:
. $PROFILE

# Now you can run from anywhere:
kimble-sync
```

## Other Scripts

### Railway Deployment

**setup-railway-env.ps1 / setup-railway-env.sh**
- Sets up environment variables on Railway
- Run once after Railway project creation

**test-railway-deployment.ts**
- Comprehensive deployment verification
- Run after deploying to Railway

### Utilities

**validate-env-whitespace.js**
- Validates .env files for whitespace issues
- Runs automatically before build
