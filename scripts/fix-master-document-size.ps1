# MASTER DOCUMENT ROTATION SYSTEM
Write-Host "=================================================" -ForegroundColor Red
Write-Host "FIXING MASTER DOCUMENT SIZE ISSUE" -ForegroundColor Red
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Write-Host "PROBLEM: Master Document is too large to read" -ForegroundColor Yellow
Write-Host "SOLUTION: Implement rotating document system" -ForegroundColor Green
Write-Host ""

Write-Host "NEW DOCUMENT STRUCTURE:" -ForegroundColor Cyan
Write-Host "├── KimbleAI Master Index (Main pointer document)" -ForegroundColor White
Write-Host "├── KimbleAI Active Log (Current month)" -ForegroundColor Green
Write-Host "├── KimbleAI Archive 2025-09 (September)" -ForegroundColor Gray
Write-Host "├── KimbleAI Archive 2025-08 (August)" -ForegroundColor Gray
Write-Host "└── KimbleAI Summary (Key decisions/facts only)" -ForegroundColor Yellow
Write-Host ""

Write-Host "STEP 1: CREATE NEW DOCUMENT STRUCTURE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "In Google Drive, create these documents:" -ForegroundColor White
Write-Host "1. 'KimbleAI Master Index' - Contains links to all documents" -ForegroundColor White
Write-Host "2. 'KimbleAI Active Log 2025-09' - For current logging" -ForegroundColor White
Write-Host "3. 'KimbleAI Summary' - Critical info only" -ForegroundColor White
Write-Host ""

Write-Host "STEP 2: UPDATE ZAPIER TO USE NEW STRUCTURE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "In your existing Zapier logging Zap:" -ForegroundColor White
Write-Host "1. Change Google Docs action to append to 'KimbleAI Active Log 2025-09'" -ForegroundColor White
Write-Host "2. Add a Filter: If message contains 'CRITICAL' or 'SUMMARY'" -ForegroundColor White
Write-Host "3. Add Path: Also append to 'KimbleAI Summary' for critical items" -ForegroundColor White
Write-Host ""

Write-Host "STEP 3: CREATE MONTHLY ROTATION ZAP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Create new Zap:" -ForegroundColor White
Write-Host "Trigger: Schedule - 1st of each month at midnight" -ForegroundColor White
Write-Host "Action 1: Google Drive - Rename 'KimbleAI Active Log' to 'KimbleAI Archive YYYY-MM'" -ForegroundColor White
Write-Host "Action 2: Google Drive - Create new 'KimbleAI Active Log YYYY-MM'" -ForegroundColor White
Write-Host "Action 3: Google Docs - Update Master Index with new month link" -ForegroundColor White
Write-Host ""

Write-Host "STEP 4: CREATE SUMMARY EXTRACTOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create enhanced logging with document rotation
@'
// UPDATE FOR lib/conversation-logger.ts
// Add document rotation logic

export class ConversationLogger {
  private static readonly WEBHOOKS = {
    ACTIVE_LOG: 'https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/',
    SUMMARY: 'https://hooks.zapier.com/hooks/catch/2674926/summary/',  // Create new webhook
    ARCHIVE: 'https://hooks.zapier.com/hooks/catch/2674926/archive/'
  };
  
  static async logExchange(
    userMessage: string, 
    assistantResponse: string, 
    context: LogContext = {}
  ): Promise<void> {
    const isCritical = this.assessCriticality(userMessage, assistantResponse);
    const needsArchive = this.checkArchiveNeeded();
    
    // Standard logging to active document
    const logPayload = {
      event: isCritical ? 'CRITICAL_EXCHANGE' : 'CONVERSATION_EXCHANGE',
      timestamp: new Date().toISOString(),
      document: `KimbleAI Active Log ${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      messages: {
        user: userMessage,
        assistant: assistantResponse
      },
      metadata: {
        critical: isCritical,
        wordCount: (userMessage + assistantResponse).split(' ').length,
        session: this.sessionId
      }
    };
    
    // Send to active log
    await this.sendToWebhook(this.WEBHOOKS.ACTIVE_LOG, logPayload);
    
    // If critical, also send to summary
    if (isCritical) {
      const summaryPayload = {
        event: 'CRITICAL_SUMMARY',
        timestamp: new Date().toISOString(),
        type: this.determineCriticalType(userMessage, assistantResponse),
        summary: this.extractSummary(userMessage, assistantResponse),
        fullContext: {
          user: userMessage.substring(0, 200),
          response: assistantResponse.substring(0, 200)
        }
      };
      await this.sendToWebhook(this.WEBHOOKS.SUMMARY, summaryPayload);
    }
    
    // Check if we need rotation
    if (needsArchive) {
      await this.triggerArchiveRotation();
    }
  }
  
  private static assessCriticality(user: string, assistant: string): boolean {
    const criticalIndicators = [
      'CRITICAL', 'IMPORTANT', 'DECISION', 'REMEMBER THIS',
      'appointment', 'meeting', 'deadline', 'password',
      'save to drive', '@Rebecca', '@Zach',
      'don\'t forget', 'must remember', 'key point'
    ];
    
    const combined = (user + ' ' + assistant).toLowerCase();
    return criticalIndicators.some(indicator => 
      combined.includes(indicator.toLowerCase())
    );
  }
  
  private static extractSummary(user: string, assistant: string): string {
    // Extract key points for summary document
    const points = [];
    
    // Extract dates
    const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)\b/g;
    const dates = (user + ' ' + assistant).match(dateRegex);
    if (dates) points.push(`Dates: ${dates.join(', ')}`);
    
    // Extract decisions
    if (assistant.includes('will') || assistant.includes('going to')) {
      points.push('Decision made');
    }
    
    // Extract names/mentions
    const mentions = (user + ' ' + assistant).match(/@\w+/g);
    if (mentions) points.push(`Mentions: ${mentions.join(', ')}`);
    
    return points.join(' | ') || 'General exchange';
  }
  
  private static checkArchiveNeeded(): boolean {
    // Archive if current month changed
    const currentMonth = new Date().getMonth();
    const lastLogMonth = parseInt(localStorage.getItem('lastLogMonth') || '-1');
    
    if (currentMonth !== lastLogMonth) {
      localStorage.setItem('lastLogMonth', currentMonth.toString());
      return true;
    }
    return false;
  }
  
  private static async triggerArchiveRotation(): Promise<void> {
    const archivePayload = {
      event: 'TRIGGER_ARCHIVE_ROTATION',
      timestamp: new Date().toISOString(),
      currentMonth: new Date().toISOString().substring(0, 7),
      action: 'rotate_documents'
    };
    
    await this.sendToWebhook(this.WEBHOOKS.ARCHIVE, archivePayload);
  }
}
'@ | Out-File -Path "lib\conversation-logger-enhanced.ts" -Encoding UTF8

Write-Host "✅ Enhanced logger created with rotation support" -ForegroundColor Green
Write-Host ""

Write-Host "STEP 5: CREATE MASTER INDEX TEMPLATE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create master index template
@"
# KIMBLEAI MASTER INDEX
Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## ACTIVE DOCUMENTS
- **Current Log**: [KimbleAI Active Log $(Get-Date -Format "yyyy-MM")](link)
- **Summary**: [KimbleAI Summary](link) - Critical decisions and facts only
- **Quick Reference**: [KimbleAI Quick Facts](link) - User preferences, key data

## ARCHIVES BY MONTH
- [2025-09 September](link) - Current month
- [2025-08 August](link) 
- [2025-07 July](link)

## KEY INFORMATION

### Users
- Zach (zach)
- Rebecca (rebecca)

### System Status
- Deployment: https://kimbleai-v4-clean.vercel.app
- Database: Supabase (gbmefnaqsxtoseufjixp)
- Automation: Zapier Pro (750 tasks/month)

### Quick Facts
- Dog: Rennie
- Location: Seattle
- Project: KimbleAI V4
- Cost: $25/month

## DOCUMENT SIZE MANAGEMENT
- Active log rotates monthly
- Archives kept for historical reference  
- Summary contains only critical information
- Each document limited to ~100 pages

## CONTINUITY INSTRUCTIONS
When starting new session:
1. Check this index
2. Read current month's active log
3. Review summary for critical context
4. Continue from last exchange
"@ | Out-File -Path "MASTER_INDEX_TEMPLATE.md" -Encoding UTF8

Write-Host "✅ Master index template created" -ForegroundColor Green
Write-Host ""

Write-Host "IMMEDIATE ACTIONS:" -ForegroundColor Red
Write-Host "1. Create new Google Docs structure" -ForegroundColor Yellow
Write-Host "2. Update Zapier to use 'KimbleAI Active Log 2025-09'" -ForegroundColor Yellow
Write-Host "3. Copy critical info from old Master Doc to Summary" -ForegroundColor Yellow
Write-Host "4. Update this session to reference new documents" -ForegroundColor Yellow
