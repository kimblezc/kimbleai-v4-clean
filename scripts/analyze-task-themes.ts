import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function analyzeThemes() {
  const { data: allTasks, error } = await supabase
    .from('agent_tasks')
    .select('status, task_type, description, title, priority')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('Error fetching tasks:', error)
    return
  }

  if (!allTasks || allTasks.length === 0) {
    console.log('No tasks found')
    return
  }

  const completed = allTasks.filter(t => t.status === 'completed')
  const pending = allTasks.filter(t => t.status === 'pending')
  const suggestions = allTasks.filter(t => t.status === 'suggestion')
  const inProgress = allTasks.filter(t => t.status === 'in_progress')

  console.log(`\n📊 TASK SUMMARY`)
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Completed: ${completed.length}`)
  console.log(`⏳ Pending: ${pending.length}`)
  console.log(`💡 Suggestions: ${suggestions.length}`)
  console.log(`🔄 In Progress: ${inProgress.length}`)
  console.log(`📈 Total: ${allTasks.length}`)

  function analyzeTaskSet(tasks: any[], title: string) {
    console.log(`\n\n${title}`)
    console.log(`${'='.repeat(60)}`)

    // Group by task type
    const byType = tasks.reduce((acc, task) => {
      const type = task.task_type || 'Unknown'
      if (!acc[type]) acc[type] = []
      acc[type].push(task)
      return acc
    }, {} as Record<string, any[]>)

    console.log(`\n📋 By Type:`)
    Object.entries(byType)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([type, items]) => {
        console.log(`  ${type}: ${items.length}`)
      })

    // Group by priority
    const byPriority = tasks.reduce((acc, task) => {
      const priority = task.priority || 'Unknown'
      if (!acc[priority]) acc[priority] = []
      acc[priority].push(task)
      return acc
    }, {} as Record<string, any[]>)

    console.log(`\n⭐ By Priority:`)
    Object.entries(byPriority)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([priority, items]) => {
        console.log(`  ${priority}: ${items.length}`)
      })

    // Extract themes from descriptions
    console.log(`\n🎯 Common Themes:`)
    const themes = extractThemes(tasks)
    themes.forEach(({ theme, count }) => {
      console.log(`  ${theme}: ${count}`)
    })

    // Sample tasks
    console.log(`\n📝 Sample Tasks (first 10):`)
    tasks.slice(0, 10).forEach((task, i) => {
      const desc = task.description?.substring(0, 80) || 'No description'
      console.log(`  ${i + 1}. [${task.task_type}] ${desc}${task.description?.length > 80 ? '...' : ''}`)
    })
  }

  analyzeTaskSet(completed, '✅ COMPLETED TASKS ANALYSIS')
  analyzeTaskSet(pending, '⏳ PENDING TASKS ANALYSIS')
  analyzeTaskSet(suggestions, '💡 SUGGESTIONS ANALYSIS')
}

function extractThemes(tasks: any[]): { theme: string; count: number }[] {
  const keywords = [
    { pattern: /email|gmail|inbox/i, theme: 'Email Management' },
    { pattern: /calendar|meeting|schedule/i, theme: 'Calendar/Scheduling' },
    { pattern: /task|todo|reminder/i, theme: 'Task Management' },
    { pattern: /contact|person|people/i, theme: 'Contact Management' },
    { pattern: /note|document|file/i, theme: 'Notes/Documents' },
    { pattern: /analyze|analysis|insight/i, theme: 'Analysis/Insights' },
    { pattern: /notification|alert|remind/i, theme: 'Notifications' },
    { pattern: /search|find|lookup/i, theme: 'Search/Discovery' },
    { pattern: /create|add|new/i, theme: 'Creation' },
    { pattern: /update|edit|modify/i, theme: 'Updates' },
    { pattern: /delete|remove|archive/i, theme: 'Cleanup' },
    { pattern: /sync|integration|connect/i, theme: 'Integration' },
    { pattern: /report|summary|digest/i, theme: 'Reporting' },
    { pattern: /optimize|improve|enhance/i, theme: 'Optimization' },
    { pattern: /bug|fix|error/i, theme: 'Bug Fixes' },
    { pattern: /test|testing|qa/i, theme: 'Testing' },
    { pattern: /security|privacy|auth/i, theme: 'Security' },
    { pattern: /performance|speed|fast/i, theme: 'Performance' },
    { pattern: /ui|ux|interface/i, theme: 'UI/UX' },
    { pattern: /api|endpoint|route/i, theme: 'API' },
  ]

  const themeCounts = new Map<string, number>()

  tasks.forEach(task => {
    const text = `${task.description} ${task.task_type}`.toLowerCase()
    keywords.forEach(({ pattern, theme }) => {
      if (pattern.test(text)) {
        themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1)
      }
    })
  })

  return Array.from(themeCounts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

analyzeThemes().then(() => process.exit(0))
