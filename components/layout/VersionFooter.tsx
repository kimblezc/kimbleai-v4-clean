/**
 * Version Footer Component
 *
 * Displays version and commit information on every page
 * Reads from version.json for dynamic commit hash
 */

import fs from 'fs';
import path from 'path';

export default function VersionFooter() {
  let version = process.env.NEXT_PUBLIC_APP_VERSION || '11.3.1';
  let commit = 'unknown';

  try {
    // Read version.json from project root
    const versionPath = path.join(process.cwd(), 'version.json');
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    version = versionData.version || version;
    commit = versionData.commit || commit;
  } catch (error) {
    // Fallback to environment variable if version.json doesn't exist
    console.warn('Unable to read version.json:', error);
  }

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <div className="text-xs text-gray-500 dark:text-gray-600 font-mono bg-gray-900/50 px-2 py-1 rounded">
        v{version} @ {commit}
      </div>
    </div>
  );
}
