import { NextResponse } from 'next/server';
import { readdirSync, statSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: any = {
    cwd: process.cwd(),
    dirs: {},
    tmpTest: null,
  };

  // Check common directories
  const dirsToCheck = ['/', '/tmp', '/app', '/var/tmp', process.cwd()];

  for (const dir of dirsToCheck) {
    try {
      const stat = statSync(dir);
      const files = readdirSync(dir).slice(0, 10); // First 10 files
      results.dirs[dir] = {
        exists: true,
        isDirectory: stat.isDirectory(),
        writable: null, // will test below
        files: files,
      };

      // Test if writable
      try {
        const testFile = join(dir, `.test-${Date.now()}.txt`);
        writeFileSync(testFile, 'test');
        unlinkSync(testFile);
        results.dirs[dir].writable = true;
      } catch {
        results.dirs[dir].writable = false;
      }
    } catch (error: any) {
      results.dirs[dir] = { exists: false, error: error.message };
    }
  }

  // Test /tmp specifically
  try {
    mkdirSync('/tmp/mcp-test', { recursive: true });
    writeFileSync('/tmp/mcp-test/test.txt', 'hello');
    unlinkSync('/tmp/mcp-test/test.txt');
    results.tmpTest = 'success';
  } catch (error: any) {
    results.tmpTest = error.message;
  }

  return NextResponse.json(results);
}
