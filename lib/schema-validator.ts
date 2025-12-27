// lib/schema-validator.ts
// Database Schema Validation Utility
// Prevents schema mismatches by validating operations before execution

import { validate as uuidValidate, version as uuidVersion } from 'uuid';

/**
 * Database table schemas - definitive source of truth
 * Based on DATABASE_SCHEMA.md
 */
export const SCHEMAS = {
  uploaded_files: {
    columns: ['id', 'user_id', 'filename', 'file_type', 'file_size', 'metadata', 'created_at'],
    required: ['id', 'user_id', 'filename'],
    uuidColumns: ['id', 'user_id'],
    jsonbColumns: ['metadata'],
    metadata_fields: ['originalName', 'uploadedAt', 'category', 'projectId', 'status', 'processingResult', 'processedAt', 'errorMessage', 'batchUpload']
  },
  users: {
    columns: ['id', 'name', 'email', 'usage_stats', 'preferences', 'created_at', 'updated_at'],
    required: ['id', 'name', 'email'],
    uuidColumns: ['id'],
    jsonbColumns: ['usage_stats', 'preferences']
  },
  conversations: {
    columns: ['id', 'user_id', 'title', 'project_id', 'created_at', 'updated_at', 'is_pinned'],
    required: ['id', 'user_id'],
    uuidColumns: ['id', 'user_id', 'project_id'],
    optionalColumns: ['project_id']  // May not exist in all schemas
  },
  messages: {
    columns: ['id', 'conversation_id', 'user_id', 'role', 'content', 'embedding', 'metadata', 'created_at', 'edited_at'],
    required: ['id', 'conversation_id', 'user_id', 'role', 'content'],
    uuidColumns: ['id', 'conversation_id', 'user_id'],
    jsonbColumns: ['metadata'],
    optionalColumns: ['embedding', 'edited_at']  // May not exist
  },
  projects: {
    columns: ['id', 'user_id', 'owner_id', 'name', 'description', 'status', 'priority', 'deadline', 'tags', 'metadata', 'created_at', 'updated_at'],
    required: ['id', 'user_id', 'name'],
    uuidColumns: ['id', 'user_id', 'owner_id'],
    jsonbColumns: ['metadata'],
    arrayColumns: ['tags']
  },
  knowledge_base: {
    columns: ['id', 'user_id', 'source_type', 'source_id', 'category', 'title', 'content', 'embedding', 'importance', 'tags', 'metadata', 'created_at', 'updated_at'],
    required: ['id', 'user_id', 'source_type', 'source_id', 'title'],
    uuidColumns: ['id', 'user_id'],
    jsonbColumns: ['metadata'],
    arrayColumns: ['tags'],
    optionalColumns: ['embedding']
  },
  audio_transcriptions: {
    columns: ['id', 'user_id', 'project_id', 'file_id', 'filename', 'file_size', 'storage_url', 'duration', 'status', 'text', 'words', 'utterances', 'chapters', 'metadata', 'created_at', 'updated_at'],
    required: ['id', 'user_id', 'filename'],
    uuidColumns: ['id', 'user_id'],
    jsonbColumns: ['words', 'utterances', 'chapters', 'metadata'],
    optionalColumns: ['progress', 'language', 'confidence_score']
  },
  tags: {
    columns: ['id', 'user_id', 'name', 'display_name', 'category', 'color', 'description', 'usage_count', 'created_at'],
    required: ['id', 'user_id', 'name', 'display_name'],
    uuidColumns: ['id', 'user_id']
  },
  sessions: {
    columns: ['id', 'user_id', 'session_id', 'device_name', 'project_path', 'title', 'summary', 'files_modified', 'git_commits', 'todos', 'key_decisions', 'next_steps', 'git_branch', 'git_commit_hash', 'tags', 'working_directory', 'started_at', 'ended_at'],
    required: ['id', 'user_id'],
    uuidColumns: ['id', 'session_id'],  // Note: user_id is TEXT in sessions table
    jsonbColumns: ['todos', 'key_decisions', 'next_steps'],
    arrayColumns: ['tags']
  }
} as const;

export type TableName = keyof typeof SCHEMAS;

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: any): boolean {
  if (typeof value !== 'string') return false;
  return uuidValidate(value) && uuidVersion(value) === 4;
}

/**
 * Validate INSERT operation
 */
export function validateInsert(
  tableName: TableName,
  data: Record<string, any>
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const schema = SCHEMAS[tableName];
  if (!schema) {
    result.valid = false;
    result.errors.push(`Unknown table: ${tableName}`);
    return result;
  }

  // Check for unknown columns
  const dataKeys = Object.keys(data);
  for (const key of dataKeys) {
    if (!schema.columns.includes(key)) {
      result.warnings.push(
        `Column '${key}' not in schema for ${tableName}. ` +
        `Consider storing in metadata JSONB field instead.`
      );
    }
  }

  // Check required columns
  for (const required of schema.required) {
    if (!(required in data)) {
      result.valid = false;
      result.errors.push(`Missing required column: ${required}`);
    }
  }

  // Validate UUID columns
  if (schema.uuidColumns) {
    for (const col of schema.uuidColumns) {
      if (col in data) {
        if (!isValidUUID(data[col])) {
          result.valid = false;
          result.errors.push(
            `Column '${col}' must be valid UUID v4. ` +
            `Got: ${data[col]}. Use crypto.randomUUID() to generate.`
          );
        }
      }
    }
  }

  // Validate JSONB columns
  if (schema.jsonbColumns) {
    for (const col of schema.jsonbColumns) {
      if (col in data) {
        if (typeof data[col] !== 'object' || data[col] === null) {
          result.valid = false;
          result.errors.push(`Column '${col}' must be an object (JSONB)`);
        }
      }
    }
  }

  // Validate array columns
  if (schema.arrayColumns) {
    for (const col of schema.arrayColumns) {
      if (col in data) {
        if (!Array.isArray(data[col])) {
          result.valid = false;
          result.errors.push(`Column '${col}' must be an array`);
        }
      }
    }
  }

  // Check for metadata fields that should be in metadata JSONB
  if (tableName === 'uploaded_files') {
    const forbiddenDirectFields = ['project_id', 'status', 'category', 'processing_result', 'processed_at', 'error_message'];
    for (const field of forbiddenDirectFields) {
      if (field in data) {
        result.valid = false;
        result.errors.push(
          `Column '${field}' doesn't exist. ` +
          `Store in metadata JSONB instead: metadata: { ${toCamelCase(field)}: value }`
        );
      }
    }
  }

  return result;
}

/**
 * Validate UPDATE operation
 */
export function validateUpdate(
  tableName: TableName,
  data: Record<string, any>
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const schema = SCHEMAS[tableName];
  if (!schema) {
    result.valid = false;
    result.errors.push(`Unknown table: ${tableName}`);
    return result;
  }

  // Check for unknown columns
  const dataKeys = Object.keys(data);
  for (const key of dataKeys) {
    if (!schema.columns.includes(key)) {
      result.warnings.push(
        `Column '${key}' not in schema for ${tableName}. ` +
        `This UPDATE may fail.`
      );
    }
  }

  // Validate UUID columns (if being updated)
  if (schema.uuidColumns) {
    for (const col of schema.uuidColumns) {
      if (col in data) {
        if (!isValidUUID(data[col])) {
          result.valid = false;
          result.errors.push(`Column '${col}' must be valid UUID v4`);
        }
      }
    }
  }

  // Validate JSONB columns
  if (schema.jsonbColumns) {
    for (const col of schema.jsonbColumns) {
      if (col in data) {
        if (typeof data[col] !== 'object' || data[col] === null) {
          result.valid = false;
          result.errors.push(`Column '${col}' must be an object (JSONB)`);
        }
      }
    }
  }

  return result;
}

/**
 * Validate SELECT operation
 */
export function validateSelect(
  tableName: TableName,
  columns: string[] | '*'
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const schema = SCHEMAS[tableName];
  if (!schema) {
    result.valid = false;
    result.errors.push(`Unknown table: ${tableName}`);
    return result;
  }

  if (columns === '*') {
    return result;  // Selecting all columns is always safe
  }

  // Check each column exists
  for (const col of columns) {
    if (!schema.columns.includes(col)) {
      if (schema.optionalColumns?.includes(col)) {
        result.warnings.push(
          `Column '${col}' is optional in ${tableName}. ` +
          `May not exist in all schema versions.`
        );
      } else {
        result.errors.push(
          `Column '${col}' doesn't exist in ${tableName}. ` +
          `Available columns: ${schema.columns.join(', ')}`
        );
        result.valid = false;
      }
    }
  }

  return result;
}

/**
 * Helper: Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Wrapper function for safe INSERT
 */
export async function safeInsert<T>(
  supabase: any,
  tableName: TableName,
  data: Record<string, any>
): Promise<{ data: T | null; error: any; validation: ValidationResult }> {
  const validation = validateInsert(tableName, data);

  if (!validation.valid) {
    console.error(`[SCHEMA] INSERT validation failed for ${tableName}:`, validation.errors);
    return {
      data: null,
      error: {
        message: `Schema validation failed: ${validation.errors.join(', ')}`,
        code: 'SCHEMA_VALIDATION_ERROR',
        details: validation
      },
      validation
    };
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn(`[SCHEMA] INSERT warnings for ${tableName}:`, validation.warnings);
  }

  // Proceed with insert
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();

    return { data: result, error, validation };
  } catch (error) {
    return { data: null, error, validation };
  }
}

/**
 * Wrapper function for safe UPDATE
 */
export async function safeUpdate<T>(
  supabase: any,
  tableName: TableName,
  data: Record<string, any>,
  matchCriteria: Record<string, any>
): Promise<{ data: T | null; error: any; validation: ValidationResult }> {
  const validation = validateUpdate(tableName, data);

  if (!validation.valid) {
    console.error(`[SCHEMA] UPDATE validation failed for ${tableName}:`, validation.errors);
    return {
      data: null,
      error: {
        message: `Schema validation failed: ${validation.errors.join(', ')}`,
        code: 'SCHEMA_VALIDATION_ERROR',
        details: validation
      },
      validation
    };
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn(`[SCHEMA] UPDATE warnings for ${tableName}:`, validation.warnings);
  }

  // Proceed with update
  try {
    let query = supabase.from(tableName).update(data);

    // Apply match criteria
    for (const [key, value] of Object.entries(matchCriteria)) {
      query = query.eq(key, value);
    }

    const { data: result, error } = await query.select().single();

    return { data: result, error, validation };
  } catch (error) {
    return { data: null, error, validation };
  }
}

/**
 * Generate proper UUID for database IDs
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Lookup user UUID by name
 */
export async function getUserId(
  supabase: any,
  userName: string
): Promise<string | null> {
  const name = userName === 'rebecca' ? 'Rebecca' : 'Zach';

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('name', name)
    .single();

  if (error || !data) {
    console.error(`[SCHEMA] Failed to lookup user '${name}':`, error);
    return null;
  }

  return data.id;
}

/**
 * Validate and prepare uploaded_files data
 */
export function prepareUploadedFileData(params: {
  filename: string;
  fileType: string;
  fileSize: number;
  userId: string;
  category?: string;
  projectId?: string;
  status?: string;
}): Record<string, any> {
  return {
    id: generateId(),
    user_id: params.userId,  // Must already be UUID
    filename: params.filename,
    file_type: params.fileType,
    file_size: params.fileSize,
    metadata: {
      originalName: params.filename,
      uploadedAt: new Date().toISOString(),
      category: params.category || 'unknown',
      projectId: params.projectId || 'general',
      status: params.status || 'processing'
    }
  };
}

/**
 * Update metadata field safely
 */
export async function updateMetadata(
  supabase: any,
  tableName: TableName,
  id: string,
  metadataUpdates: Record<string, any>
): Promise<{ success: boolean; error?: any }> {
  // Fetch current metadata
  const { data: current, error: fetchError } = await supabase
    .from(tableName)
    .select('metadata')
    .eq('id', id)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError };
  }

  // Merge metadata
  const newMetadata = {
    ...(current.metadata || {}),
    ...metadataUpdates
  };

  // Update
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ metadata: newMetadata })
    .eq('id', id);

  if (updateError) {
    return { success: false, error: updateError };
  }

  return { success: true };
}
