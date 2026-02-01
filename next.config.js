const { execSync } = require('child_process');

// Get git commit hash at build time
function getGitCommitHash() {
  try {
    return execSync('git log -1 --format=%h').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5gb', // Support large transcription files (up to 5GB)
    },
  },
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    NEXT_PUBLIC_GIT_COMMIT_HASH: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || getGitCommitHash(),
  },
}

module.exports = nextConfig
