#!/bin/bash

# KimbleAI Laptop Sync Script
# Automatically pulls latest changes and prepares environment
# Run this when switching from desktop to laptop

echo "🔄 KimbleAI Laptop Sync Starting..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in kimbleai-v4-clean directory"
  echo "   Please cd to the project directory first"
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "   Stashing them before pulling..."
  git stash
  STASHED=1
fi

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin master

if [ $? -ne 0 ]; then
  echo "❌ Git pull failed. Please resolve conflicts manually."
  exit 1
fi

# Check if package.json changed
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
  echo "📦 package.json changed, installing dependencies..."
  npm install
fi

# Restore stashed changes if any
if [ -n "$STASHED" ]; then
  echo "📋 Restoring your stashed changes..."
  git stash pop
fi

# Clean and rebuild
echo "🏗️  Cleaning build cache..."
rm -rf .next

echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Check errors above."
  exit 1
fi

# Show session handoff
echo ""
echo "✅ Sync complete! Showing session handoff info..."
echo ""
cat SESSION_HANDOFF.md | head -50
echo ""
echo "📖 Full handoff: cat SESSION_HANDOFF.md"
echo "🚀 Start dev server: npm run dev"
echo "☁️  Deploy to Railway: railway up"
echo ""
echo "✨ Ready to continue coding!"
