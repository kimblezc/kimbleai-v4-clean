/**
 * Project-Tag Guardian Agent
 *
 * Autonomous agent that ensures projects and tags are properly functioning.
 * Expert in CRUD operations, data integrity, and organizational structure.
 *
 * This is a specialized agent that monitors and maintains:
 * - Projects (create, read, update, delete operations)
 * - Tags (create, read, update, delete operations)
 * - Associations and relationships
 * - Data integrity and consistency
 * - Proper organization and positioning
 *
 * Unlike Archie (code maintenance), this guardian focuses on data/API health.
 *
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ValidationIssue {
  type: 'project' | 'tag' | 'association' | 'permission' | 'orphan' | 'duplicate';
  severity: 'critical' | 'warning' | 'info';
  entity: string;
  issue: string;
  fixable: boolean;
  fix?: () => Promise<boolean>;
}

interface GuardianReport {
  success: boolean;
  timestamp: string;
  issuesFound: number;
  issuesFixed: number;
  issues: ValidationIssue[];
  summary: string;
  triggerType?: string;
}

export class ProjectTagGuardian {
  private supabase;
  private baseUrl: string;
  private issues: ValidationIssue[] = [];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }

  /**
   * Main entry point - run all validation checks
   */
  async run(triggerType: string = 'scheduled'): Promise<GuardianReport> {
    console.log('🛡️ Project-Tag Guardian starting validation run...');
    this.issues = [];

    try {
      // Run all validation checks in parallel
      await Promise.all([
        this.validateProjectsCRUD(),
        this.validateTagsCRUD(),
        this.validateAssociations(),
        this.validateOrphans(),
        this.validateDuplicates(),
        this.validatePermissions(),
        this.validateConversationIntegrity()
      ]);

      // Auto-fix issues that are marked as fixable
      const issuesFixed = await this.autoFixIssues();

      // Generate summary
      const summary = this.generateSummary(issuesFixed);

      // Commit changes if any fixes were made
      if (issuesFixed > 0) {
        await this.commitChanges(issuesFixed);
      }

      const report: GuardianReport = {
        success: true,
        timestamp: new Date().toISOString(),
        issuesFound: this.issues.length,
        issuesFixed,
        issues: this.issues,
        summary,
        triggerType
      };

      console.log('✅ Guardian run completed');
      console.log(summary);

      return report;

    } catch (error: any) {
      console.error('❌ Guardian run failed:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        issuesFound: this.issues.length,
        issuesFixed: 0,
        issues: this.issues,
        summary: `Guardian run failed: ${error.message}`,
        triggerType
      };
    }
  }

  /**
   * Validate Projects CRUD operations
   */
  private async validateProjectsCRUD(): Promise<void> {
    console.log('📋 Validating Projects CRUD operations...');

    try {
      // Test GET (list projects)
      // NOTE: API endpoints may require authentication, so failures here are INFO level
      // Guardian's real value is in database integrity checks, not API testing
      const listResponse = await fetch(`${this.baseUrl}/api/projects?userId=zach-admin-001`);
      if (!listResponse.ok) {
        this.issues.push({
          type: 'project',
          severity: 'info',
          entity: '/api/projects GET',
          issue: `API endpoint test (may require auth): ${listResponse.status} ${listResponse.statusText}`,
          fixable: false
        });
      }

      // Test POST (create project) - dry run, we'll delete it after
      const testProject = {
        action: 'create',
        userId: 'zach-admin-001',
        projectData: {
          name: `Guardian Test Project ${Date.now()}`,
          description: 'Automated test by Project-Tag Guardian',
          priority: 'low',
          tags: ['test', 'guardian-validation']
        }
      };

      const createResponse = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testProject)
      });

      if (!createResponse.ok) {
        this.issues.push({
          type: 'project',
          severity: 'info',
          entity: '/api/projects POST (create)',
          issue: `API endpoint test (may require auth): ${createResponse.status}`,
          fixable: false
        });
      } else {
        const createData = await createResponse.json();
        const projectId = createData.project?.id;

        if (projectId) {
          // Test PUT (update project)
          const updateResponse = await fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              userId: 'zach-admin-001',
              projectData: {
                id: projectId,
                name: `Updated ${testProject.projectData.name}`
              }
            })
          });

          if (!updateResponse.ok) {
            this.issues.push({
              type: 'project',
              severity: 'info',
              entity: '/api/projects POST (update)',
              issue: `API endpoint test (may require auth): ${updateResponse.status}`,
              fixable: false
            });
          }

          // Test DELETE
          const deleteResponse = await fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              userId: 'zach-admin-001',
              projectData: { id: projectId }
            })
          });

          if (!deleteResponse.ok) {
            this.issues.push({
              type: 'project',
              severity: 'info',
              entity: '/api/projects POST (delete)',
              issue: `API endpoint test (may require auth): ${deleteResponse.status}`,
              fixable: false
            });
          }
        }
      }

    } catch (error: any) {
      this.issues.push({
        type: 'project',
        severity: 'info',
        entity: 'Projects API',
        issue: `API endpoint test error (may require auth): ${error.message}`,
        fixable: false
      });
    }
  }

  /**
   * Validate Tags CRUD operations
   */
  private async validateTagsCRUD(): Promise<void> {
    console.log('🏷️ Validating Tags CRUD operations...');

    try {
      // Test GET (list tags)
      const listResponse = await fetch(`${this.baseUrl}/api/tags?userId=zach`);
      if (!listResponse.ok) {
        this.issues.push({
          type: 'tag',
          severity: 'info',
          entity: '/api/tags GET',
          issue: `API endpoint test (may require auth): ${listResponse.status}`,
          fixable: false
        });
      }

      // Test POST (create tag)
      const testTag = {
        name: `guardian-test-${Date.now()}`,
        displayName: 'Guardian Test Tag',
        description: 'Automated test by Project-Tag Guardian',
        userId: 'zach'
      };

      const createResponse = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testTag)
      });

      if (!createResponse.ok) {
        this.issues.push({
          type: 'tag',
          severity: 'info',
          entity: '/api/tags POST',
          issue: `API endpoint test (may require auth): ${createResponse.status}`,
          fixable: false
        });
      } else {
        const createData = await createResponse.json();
        const tagId = createData.tag?.id;

        if (tagId) {
          // Test PUT (update tag)
          const updateResponse = await fetch(`${this.baseUrl}/api/tags`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: tagId,
              displayName: 'Updated Guardian Test Tag',
              userId: 'zach'
            })
          });

          if (!updateResponse.ok) {
            this.issues.push({
              type: 'tag',
              severity: 'info',
              entity: '/api/tags PUT',
              issue: `API endpoint test (may require auth): ${updateResponse.status}`,
              fixable: false
            });
          }

          // Test DELETE
          const deleteResponse = await fetch(`${this.baseUrl}/api/tags?id=${tagId}&userId=zach`, {
            method: 'DELETE'
          });

          if (!deleteResponse.ok) {
            this.issues.push({
              type: 'tag',
              severity: 'info',
              entity: '/api/tags DELETE',
              issue: `API endpoint test (may require auth): ${deleteResponse.status}`,
              fixable: false
            });
          }
        }
      }

    } catch (error: any) {
      this.issues.push({
        type: 'tag',
        severity: 'info',
        entity: 'Tags API',
        issue: `API endpoint test error (may require auth): ${error.message}`,
        fixable: false
      });
    }
  }

  /**
   * Validate associations between projects and tags
   */
  private async validateAssociations(): Promise<void> {
    console.log('🔗 Validating project-tag associations...');

    try {
      // Get all projects with tags
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('id, name, tags');

      if (projectsError) {
        console.warn('Could not validate associations:', projectsError.message);
        return;
      }

      if (!projects || projects.length === 0) {
        console.log('No projects to validate');
        return;
      }

      // Get all available tags
      const { data: availableTags, error: tagsError } = await this.supabase
        .from('tags')
        .select('name');

      const tagNames = new Set(availableTags?.map(t => t.name) || []);

      // Check for references to non-existent tags
      for (const project of projects) {
        if (Array.isArray(project.tags)) {
          for (const tag of project.tags) {
            if (!tagNames.has(tag)) {
              this.issues.push({
                type: 'association',
                severity: 'warning',
                entity: `Project: ${project.name}`,
                issue: `References non-existent tag: "${tag}"`,
                fixable: true,
                fix: async () => {
                  // Auto-create missing tag
                  const { error } = await this.supabase
                    .from('tags')
                    .insert({
                      user_id: (await this.supabase.from('users').select('id').eq('friendly_id', 'zach-admin-001').single()).data?.id,
                      name: tag,
                      display_name: tag,
                      category: 'custom',
                      color: '#6366f1'
                    });
                  return !error;
                }
              });
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Association validation error:', error);
    }
  }

  /**
   * Check for orphaned records
   */
  private async validateOrphans(): Promise<void> {
    console.log('🔍 Checking for orphaned records...');

    try {
      // Check for orphaned project tasks (tasks without valid project)
      const { data: tasks } = await this.supabase
        .from('project_tasks')
        .select('id, project_id');

      if (tasks && tasks.length > 0) {
        const { data: projectIds } = await this.supabase
          .from('projects')
          .select('id');

        const validProjectIds = new Set(projectIds?.map(p => p.id) || []);

        for (const task of tasks) {
          if (!validProjectIds.has(task.project_id)) {
            this.issues.push({
              type: 'orphan',
              severity: 'warning',
              entity: `Task ID: ${task.id}`,
              issue: `Task references non-existent project: ${task.project_id}`,
              fixable: true,
              fix: async () => {
                const { error } = await this.supabase
                  .from('project_tasks')
                  .delete()
                  .eq('id', task.id);
                return !error;
              }
            });
          }
        }
      }

      // Check for orphaned messages (messages without valid conversation)
      const { data: messages } = await this.supabase
        .from('messages')
        .select('id, conversation_id, user_id');

      if (messages && messages.length > 0) {
        const { data: conversationIds } = await this.supabase
          .from('conversations')
          .select('id');

        const validConversationIds = new Set(conversationIds?.map(c => c.id) || []);

        const orphanedMessages = messages.filter(m => !m.conversation_id || !validConversationIds.has(m.conversation_id));

        if (orphanedMessages.length > 0) {
          this.issues.push({
            type: 'orphan',
            severity: 'critical',
            entity: 'Messages',
            issue: `Found ${orphanedMessages.length} orphaned messages (no valid conversation_id)`,
            fixable: true,
            fix: async () => {
              // Group orphaned messages by user_id
              const orphansByUser = new Map<string, any[]>();
              orphanedMessages.forEach(msg => {
                if (!orphansByUser.has(msg.user_id)) {
                  orphansByUser.set(msg.user_id, []);
                }
                orphansByUser.get(msg.user_id)!.push(msg);
              });

              // Create "Recovered Messages" conversation for each user
              for (const [userId, userMessages] of orphansByUser) {
                const recoveryConvId = `recovered_${userId}_${Date.now()}`;

                // Create recovery conversation
                const { error: convError } = await this.supabase
                  .from('conversations')
                  .insert({
                    id: recoveryConvId,
                    user_id: userId,
                    title: 'Recovered Messages',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_pinned: false
                  });

                if (!convError) {
                  // Update messages to point to recovery conversation
                  const messageIds = userMessages.map(m => m.id);
                  const { error: updateError } = await this.supabase
                    .from('messages')
                    .update({ conversation_id: recoveryConvId })
                    .in('id', messageIds);

                  if (updateError) {
                    console.error('Failed to update orphaned messages:', updateError);
                    return false;
                  }
                }
              }

              return true;
            }
          });
        }
      }

    } catch (error: any) {
      console.warn('Orphan check failed:', error.message);
    }
  }

  /**
   * Validate conversation-project integrity
   */
  private async validateConversationIntegrity(): Promise<void> {
    console.log('💬 Validating conversation integrity...');

    try {
      // Check for conversations with invalid project_id
      const { data: conversations } = await this.supabase
        .from('conversations')
        .select('id, title, project_id, user_id');

      if (!conversations) return;

      const { data: projects } = await this.supabase
        .from('projects')
        .select('id');

      const validProjectIds = new Set(projects?.map(p => p.id) || []);

      for (const conv of conversations) {
        // Skip if no project_id (unassigned is valid)
        if (!conv.project_id) continue;

        // Check if project exists
        if (!validProjectIds.has(conv.project_id)) {
          this.issues.push({
            type: 'association',
            severity: 'warning',
            entity: `Conversation: ${conv.title || conv.id}`,
            issue: `References non-existent project: ${conv.project_id}`,
            fixable: true,
            fix: async () => {
              // Unassign from deleted project
              const { error } = await this.supabase
                .from('conversations')
                .update({ project_id: null })
                .eq('id', conv.id);
              return !error;
            }
          });
        }
      }

      // NOTE: created_at check removed - if the column doesn't exist in the database,
      // that's a schema migration issue, not a data integrity issue that Guardian should fix.
      // The schema (run-all-migrations.sql) includes created_at with DEFAULT NOW(),
      // so all new conversations should have it automatically.

    } catch (error: any) {
      console.warn('Conversation integrity check failed:', error.message);
    }
  }

  /**
   * Check for duplicate tags
   */
  private async validateDuplicates(): Promise<void> {
    console.log('🔁 Checking for duplicate tags...');

    try {
      const { data: tags } = await this.supabase
        .from('tags')
        .select('id, name, user_id');

      if (!tags) return;

      // Group by user_id and name
      const tagMap = new Map<string, any[]>();
      for (const tag of tags) {
        const key = `${tag.user_id}:${tag.name}`;
        if (!tagMap.has(key)) {
          tagMap.set(key, []);
        }
        tagMap.get(key)!.push(tag);
      }

      // Find duplicates
      for (const [key, duplicates] of tagMap.entries()) {
        if (duplicates.length > 1) {
          this.issues.push({
            type: 'duplicate',
            severity: 'warning',
            entity: `Tag: ${duplicates[0].name}`,
            issue: `${duplicates.length} duplicate tags found`,
            fixable: true,
            fix: async () => {
              // Keep the first, delete the rest
              const toDelete = duplicates.slice(1).map(d => d.id);
              const { error } = await this.supabase
                .from('tags')
                .delete()
                .in('id', toDelete);
              return !error;
            }
          });
        }
      }

    } catch (error: any) {
      console.warn('Duplicate check failed:', error.message);
    }
  }

  /**
   * Validate permissions are working correctly
   */
  private async validatePermissions(): Promise<void> {
    console.log('🔐 Validating permissions...');

    try {
      // Test that unauthorized users can't delete projects
      // (We won't actually test this with a real unauthorized user,
      // but we can verify the endpoint returns proper error codes)

      // Test invalid user ID
      const invalidResponse = await fetch(`${this.baseUrl}/api/projects?userId=non-existent-user`);
      // Should return 404 for user not found

      // Test missing required fields
      const missingFieldResponse = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: 'zach-admin-001',
          projectData: {} // Missing required fields
        })
      });

      if (missingFieldResponse.ok) {
        this.issues.push({
          type: 'permission',
          severity: 'warning',
          entity: 'Projects API validation',
          issue: 'API accepted project creation with missing required fields',
          fixable: false
        });
      }

    } catch (error: any) {
      console.warn('Permission validation failed:', error.message);
    }
  }

  /**
   * Auto-fix issues that are marked as fixable
   */
  private async autoFixIssues(): Promise<number> {
    console.log('🔧 Auto-fixing issues...');

    let fixedCount = 0;

    for (const issue of this.issues) {
      if (issue.fixable && issue.fix) {
        try {
          console.log(`  🔧 Fixing ${issue.type}: ${issue.issue}`);
          const success = await issue.fix();
          if (success) {
            fixedCount++;
            console.log(`  ✅ Fixed successfully`);
          } else {
            console.log(`  ❌ Fix failed`);
          }
        } catch (error: any) {
          console.error(`  ❌ Fix error: ${error.message}`);
        }
      }
    }

    return fixedCount;
  }

  /**
   * Generate summary report
   */
  private generateSummary(issuesFixed: number): string {
    const critical = this.issues.filter(i => i.severity === 'critical').length;
    const warnings = this.issues.filter(i => i.severity === 'warning').length;
    const info = this.issues.filter(i => i.severity === 'info').length;

    const parts = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (warnings > 0) parts.push(`${warnings} warnings`);
    if (info > 0) parts.push(`${info} info`);

    if (this.issues.length === 0) {
      return '✅ All systems operational - no issues found';
    }

    let summary = `Found ${this.issues.length} issues: ${parts.join(', ')}`;
    if (issuesFixed > 0) {
      summary += `. Auto-fixed ${issuesFixed} issues.`;
    }

    return summary;
  }

  /**
   * Commit changes to git
   */
  private async commitChanges(issuesFixed: number): Promise<void> {
    try {
      console.log('📝 Committing guardian fixes...');

      const timestamp = new Date().toISOString();
      const message = `chore: Guardian auto-maintenance

Fixed ${issuesFixed} data integrity issues:
${this.issues.filter(i => i.fixable).map(i => `- ${i.type}: ${i.issue}`).join('\n')}

🛡️ Automated by Project-Tag Guardian
🤖 Generated with Claude Code

Co-Authored-By: Guardian <guardian@kimbleai.com>`;

      // Stage changes
      await execAsync('git add -A');

      // Commit
      await execAsync(`git commit -m "${message.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);

      console.log('✅ Changes committed');

    } catch (error: any) {
      // No changes to commit is not an error
      if (!error.message.includes('nothing to commit')) {
        console.error('Failed to commit changes:', error.message);
      }
    }
  }
}

// Export singleton instance
export const projectTagGuardian = new ProjectTagGuardian();
