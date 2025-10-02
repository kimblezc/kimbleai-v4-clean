/**
 * Secure Environment Variable Utility
 *
 * Prevents hidden character bugs (newlines, spaces, tabs) in environment variables.
 * Validates format and provides helpful error messages.
 *
 * @example
 * import { getEnv, validateApiKey } from '@/lib/env-utils';
 *
 * // Basic usage with automatic trimming
 * const apiKey = getEnv('ASSEMBLYAI_API_KEY', { required: true });
 *
 * // With format validation
 * const apiKey = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
 */

export interface EnvOptions {
  /** Require the environment variable (throw if missing) */
  required?: boolean;
  /** Trim whitespace (default: true) */
  trim?: boolean;
  /** Validate format with regex */
  pattern?: RegExp;
  /** Custom error message */
  errorMessage?: string;
  /** Mask value in logs (default: true for keys) */
  mask?: boolean;
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
}

export class EnvError extends Error {
  constructor(
    public varName: string,
    public reason: string,
    public value?: string
  ) {
    super(`Environment variable ${varName} is invalid: ${reason}`);
    this.name = 'EnvError';
  }
}

/**
 * Safely get an environment variable with automatic trimming and validation
 *
 * @example
 * // Basic usage
 * const apiKey = getEnv('ASSEMBLYAI_API_KEY', { required: true });
 *
 * @example
 * // With pattern validation
 * const apiKey = getEnv('ASSEMBLYAI_API_KEY', {
 *   required: true,
 *   pattern: /^[a-f0-9]{32}$/,
 *   errorMessage: 'AssemblyAI API key must be 32 hex characters'
 * });
 *
 * @example
 * // URL validation
 * const webhookUrl = getEnv('ZAPIER_WEBHOOK_URL', {
 *   pattern: /^https:\/\//,
 *   errorMessage: 'Webhook URL must start with https://'
 * });
 */
export function getEnv(
  varName: string,
  options: EnvOptions = {}
): string {
  const {
    required = false,
    trim = true,
    pattern,
    errorMessage,
    mask = varName.toLowerCase().includes('key') || varName.toLowerCase().includes('secret'),
    minLength,
    maxLength
  } = options;

  let value = process.env[varName];

  // Check if required
  if (required && !value) {
    throw new EnvError(
      varName,
      'Environment variable is not set',
      undefined
    );
  }

  // Return empty string if not set and not required
  if (!value) {
    return '';
  }

  // Detect and warn about hidden characters
  const hiddenChars = detectHiddenCharacters(value);
  if (hiddenChars.length > 0) {
    const charList = hiddenChars.map(c => `'${c.char}' (${c.name})`).join(', ');
    console.warn(
      `⚠️  WARNING: Environment variable ${varName} contains hidden characters: ${charList}. ` +
      `This will be automatically trimmed.`
    );
  }

  // Trim if requested
  if (trim) {
    const originalLength = value.length;
    value = value.trim();

    if (value.length !== originalLength) {
      console.warn(
        `⚠️  WARNING: Trimmed whitespace from ${varName}. ` +
        `Original length: ${originalLength}, new length: ${value.length}`
      );
    }
  }

  // Length validation
  if (minLength && value.length < minLength) {
    throw new EnvError(
      varName,
      `Value is too short (${value.length} chars, minimum ${minLength})`,
      mask ? maskValue(value) : value
    );
  }

  if (maxLength && value.length > maxLength) {
    throw new EnvError(
      varName,
      `Value is too long (${value.length} chars, maximum ${maxLength})`,
      mask ? maskValue(value) : value
    );
  }

  // Pattern validation
  if (pattern && !pattern.test(value)) {
    const message = errorMessage || `Value does not match required pattern: ${pattern}`;
    throw new EnvError(
      varName,
      message,
      mask ? maskValue(value) : value
    );
  }

  return value;
}

/**
 * Get multiple environment variables at once
 *
 * @example
 * const env = getEnvs({
 *   OPENAI_API_KEY: { required: true },
 *   ZAPIER_WEBHOOK_URL: { pattern: /^https:\/\// }
 * });
 */
export function getEnvs(
  config: Record<string, EnvOptions>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [varName, options] of Object.entries(config)) {
    result[varName] = getEnv(varName, options);
  }

  return result;
}

/**
 * Detect hidden characters (newlines, tabs, etc.)
 */
function detectHiddenCharacters(value: string): Array<{ char: string; name: string; code: number }> {
  const hidden: Array<{ char: string; name: string; code: number }> = [];

  const hiddenCharMap: Record<number, string> = {
    9: 'TAB',
    10: 'LINE FEED (\\n)',
    11: 'VERTICAL TAB',
    12: 'FORM FEED',
    13: 'CARRIAGE RETURN (\\r)',
    160: 'NON-BREAKING SPACE',
    8232: 'LINE SEPARATOR',
    8233: 'PARAGRAPH SEPARATOR',
  };

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);

    // Check for leading/trailing whitespace
    if ((i === 0 || i === value.length - 1) && code === 32) {
      hidden.push({ char: ' ', name: 'SPACE', code: 32 });
    }

    // Check for hidden characters
    if (hiddenCharMap[code]) {
      hidden.push({
        char: value[i],
        name: hiddenCharMap[code],
        code
      });
    }
  }

  return hidden;
}

/**
 * Mask sensitive values for logging
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    return '***';
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Validate API key format
 *
 * @example
 * // AssemblyAI (32 hex characters)
 * const key = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
 *
 * // OpenAI (starts with sk-)
 * const key = validateApiKey('OPENAI_API_KEY', 'sk-prefix');
 *
 * // Supabase JWT
 * const key = validateApiKey('SUPABASE_SERVICE_ROLE_KEY', 'jwt');
 */
export function validateApiKey(
  varName: string,
  format: 'hex32' | 'hex40' | 'sk-prefix' | 'jwt'
): string {
  const patterns: Record<string, { pattern: RegExp; description: string }> = {
    hex32: {
      pattern: /^[a-f0-9]{32}$/,
      description: '32 hexadecimal characters'
    },
    hex40: {
      pattern: /^[a-f0-9]{40}$/,
      description: '40 hexadecimal characters (SHA-1)'
    },
    'sk-prefix': {
      pattern: /^sk-[a-zA-Z0-9_-]{32,}$/,
      description: 'OpenAI format (sk-...)'
    },
    jwt: {
      pattern: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      description: 'JWT format (header.payload.signature)'
    }
  };

  const { pattern, description } = patterns[format];

  return getEnv(varName, {
    required: true,
    pattern,
    errorMessage: `API key must be ${description}`
  });
}

/**
 * Pre-deployment validation - checks all required environment variables
 *
 * @example
 * const { valid, errors } = validateEnvironment({
 *   OPENAI_API_KEY: { required: true },
 *   SUPABASE_URL: { required: true, pattern: /^https:\/\// }
 * });
 *
 * if (!valid) {
 *   console.error('Validation failed:', errors);
 * }
 */
export function validateEnvironment(
  config: Record<string, EnvOptions>
): { valid: boolean; errors: EnvError[] } {
  const errors: EnvError[] = [];

  for (const [varName, options] of Object.entries(config)) {
    try {
      getEnv(varName, options);
    } catch (error) {
      if (error instanceof EnvError) {
        errors.push(error);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
