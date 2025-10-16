import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Whitelist of allowed commands for security
const ALLOWED_COMMANDS = [
  'ls',
  'pwd',
  'git status',
  'git log',
  'git branch',
  'git diff',
  'npm --version',
  'node --version',
  'whoami',
  'date',
  'echo',
];

const isCommandAllowed = (command: string): boolean => {
  // Check if command starts with any allowed command
  return ALLOWED_COMMANDS.some((allowed) =>
    command.trim().startsWith(allowed)
  );
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow Zach and Rebecca
    const allowedEmails = [
      'zach.kimble@gmail.com',
      'rebecca.kimble@example.com', // Update with Rebecca's actual email
    ];

    if (!allowedEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { command } = await request.json();

    if (!command) {
      return NextResponse.json({ success: false, error: 'Command required' }, { status: 400 });
    }

    // Security check - only allow whitelisted commands
    if (!isCommandAllowed(command)) {
      return NextResponse.json({
        success: false,
        error: `Command not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`,
      }, { status: 403 });
    }

    // Execute command with timeout
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000, // 10 second timeout
        cwd: process.cwd(),
      });

      const output = stdout || stderr || 'Command executed successfully\r\n';

      return NextResponse.json({
        success: true,
        output,
      });
    } catch (execError: any) {
      return NextResponse.json({
        success: false,
        error: execError.message || 'Command execution failed',
        output: execError.stdout || execError.stderr || '',
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error executing command:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}
