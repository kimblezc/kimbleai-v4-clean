import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { zapierClient } from '@/lib/zapier-client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to generate embeddings for vector search
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

// Helper function to store photo analysis in knowledge base
async function storePhotoInKnowledgeBase(
  userId: string,
  photoId: string,
  fileName: string,
  analysis: string,
  tags: string[],
  projectCategory: string,
  analysisType: string,
  metadata: any
): Promise<string | null> {
  try {
    // Generate embedding from the analysis text
    const embedding = await generateEmbedding(analysis);

    if (!embedding) {
      console.warn('Failed to generate embedding for photo');
    }

    // Get user ID from database
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId)
      .single();

    const userUuid = userData?.id;

    if (!userUuid) {
      console.error('User not found in database');
      return null;
    }

    // Store in knowledge_base table with vector embedding
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        user_id: userUuid,
        source_type: 'file',
        source_id: photoId,
        category: 'photo-analysis',
        title: `Photo: ${fileName}`,
        content: analysis,
        embedding: embedding,
        importance: 0.7,
        tags: tags,
        metadata: {
          ...metadata,
          photo_id: photoId,
          analysis_type: analysisType,
          project_category: projectCategory,
          has_ocr: analysis.toLowerCase().includes('text') || analysis.toLowerCase().includes('transcribe'),
          indexed_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to store photo in knowledge base:', error);
      return null;
    }

    console.log(`Photo stored in knowledge base with ID: ${data.id}`);
    return data.id;

  } catch (error) {
    console.error('Error storing photo in knowledge base:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const analysisType = formData.get('analysisType') as string || 'general';
    const userId = formData.get('userId') as string || 'zach';

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // SECURITY: Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload JPG, PNG, or WebP images only.'
      }, { status: 400 });
    }

    // SECURITY: Validate file size (max 20MB) to prevent DoS
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File too large. Please upload images under 20MB.'
      }, { status: 400 });
    }

    // SECURITY: Validate filename to prevent path traversal
    const filename = file.name;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({
        error: 'Invalid filename. Filename contains unsafe characters.'
      }, { status: 400 });
    }

    // SECURITY: Validate analysisType to prevent injection
    const validAnalysisTypes = ['general', 'dnd', 'document', 'technical', 'automotive', 'recipe'];
    if (!validAnalysisTypes.includes(analysisType)) {
      return NextResponse.json({
        error: 'Invalid analysis type.'
      }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Prepare analysis prompt based on type
    let prompt = getAnalysisPrompt(analysisType);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Upgraded from gpt-4-vision-preview - faster, more accurate
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1500, // Increased for more detailed analysis
      });

      const analysis = response.choices[0].message.content;

      // Auto-generate tags based on the analysis
      const tags = autoGenerateTagsFromAnalysis(analysis || '', analysisType);

      // DISABLED: Auto-detect project category
      // User wants manual project assignment only
      // const projectCategory = autoDetectProjectFromImage(analysis || '', analysisType);
      const projectCategory = ''; // Always empty - no auto-assignment

      // Generate unique photo ID
      const photoId = generatePhotoId();

      // Prepare metadata
      const metadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        analysisType,
        userId,
        timestamp: new Date().toISOString()
      };

      // Store photo analysis in knowledge base with vector embeddings (async, don't block response)
      const knowledgeBaseId = await storePhotoInKnowledgeBase(
        userId,
        photoId,
        file.name,
        analysis || '',
        tags,
        projectCategory,
        analysisType,
        metadata
      );

      // ZAPIER INTEGRATION: Send photo uploaded webhook (async, non-blocking)
      const hasUrgentTag = zapierClient.detectUrgentTag(analysis || '', tags);

      zapierClient.sendPhotoUploaded(
        userId,
        photoId,
        analysis || '',
        tags,
        hasUrgentTag,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          analysisType,
          projectCategory,
          knowledgeBaseId,
          vectorSearchEnabled: knowledgeBaseId !== null
        }
      ).catch(error => {
        console.error('[Zapier] Failed to send photo uploaded webhook:', error);
      });

      // Send urgent notification if detected
      if (hasUrgentTag) {
        zapierClient.sendUrgentNotification(
          userId,
          'Urgent Photo Detected',
          `Photo contains urgent content: ${(analysis || '').substring(0, 200)}...`,
          'photo',
          {
            photoId,
            fileName: file.name,
            tags
          }
        ).catch(error => {
          console.error('[Zapier] Failed to send urgent notification:', error);
        });
      }

      return NextResponse.json({
        success: true,
        analysis,
        metadata,
        autoTags: tags,
        suggestedProject: projectCategory,
        photoId: photoId,
        knowledgeBaseId: knowledgeBaseId,
        vectorSearchEnabled: knowledgeBaseId !== null,
        rag: {
          stored: knowledgeBaseId !== null,
          searchable: knowledgeBaseId !== null,
          message: knowledgeBaseId
            ? 'Photo analysis stored in knowledge base and available for semantic search'
            : 'Photo analysis completed but storage failed'
        }
      });

    } catch (openaiError: any) {
      console.error('OpenAI Vision API error:', openaiError);
      return NextResponse.json({
        error: 'Failed to analyze photo',
        details: openaiError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Photo analysis error:', error);
    return NextResponse.json({
      error: 'Failed to process photo upload',
      details: error.message
    }, { status: 500 });
  }
}

function getAnalysisPrompt(analysisType: string): string {
  const prompts = {
    general: `Analyze this image comprehensively and provide a detailed description. Include:
- All objects, people, and their interactions
- Any text visible (transcribe exactly, preserving formatting)
- Colors, setting, atmosphere, and mood
- Notable details and context
- If there's any text, provide complete OCR transcription with line breaks preserved`,

    dnd: `Analyze this D&D/tabletop gaming image in detail:
- Character sheets: Extract ALL stats, abilities, character names, classes, levels, HP, AC, etc.
- Dice: Identify types (d20, d6, etc.) and any visible rolls
- Miniatures: Describe what they represent
- Maps: Describe terrain, locations, scale
- Rulebooks/materials: Identify edition, page numbers, relevant rules
- Campaign notes: Transcribe any visible text, names, locations, plot points
Make this searchable by extracting key game mechanics and story elements.`,

    document: `Perform detailed OCR and document analysis:
- Document type: (receipt, invoice, form, letter, contract, etc.)
- ALL visible text transcribed exactly, preserving structure
- Key information: dates, names, amounts, account numbers, reference IDs
- Signatures, stamps, or official marks
- Document quality and any damage/illegibility
- Organize extracted data into searchable fields
Format the output to be easily searchable and machine-readable.`,

    technical: `Analyze this technical image comprehensively:
- Code: Transcribe ALL visible code exactly, preserving indentation and syntax
- Programming language and framework identification
- Error messages: Complete text of any errors or warnings
- Screenshots: UI elements, application name, functionality shown
- Diagrams: Architecture components, data flow, relationships
- Technical documentation: Extract key concepts, APIs, specifications
- Stack traces, logs, or debug information
Make this information searchable for troubleshooting and reference.`,

    automotive: `Analyze this automotive image in detail:
- Vehicle identification: Make, model, year, color, body style
- License plates: Extract complete plate numbers and state/country
- VIN numbers if visible
- Parts: Identify specific components, part numbers, conditions
- Damage: Describe location, severity, type of damage
- Maintenance indicators: Mileage, service stickers, fluid levels
- Dashboard warnings or error codes
- Any visible text, labels, or technical specifications
Organize information for easy retrieval and reference.`,

    recipe: `Analyze this recipe or food image thoroughly:
- If recipe card/document: Transcribe complete ingredients list with exact measurements
- Transcribe all cooking instructions step-by-step
- Cooking times, temperatures, and techniques
- If food photo: Identify dish name, visible ingredients, cooking method
- Plating/presentation details
- Portion sizes or servings
- Any notes, tips, or modifications written
- Dietary information (vegetarian, allergens, etc.)
Make this easily searchable for cooking reference.`
  };

  return prompts[analysisType as keyof typeof prompts] || prompts.general;
}

function autoGenerateTagsFromAnalysis(analysis: string, analysisType: string): string[] {
  const tags = new Set<string>();
  const lowerAnalysis = analysis.toLowerCase();

  // Add analysis type as base tag
  tags.add(analysisType);
  tags.add('photo-analysis');

  // Context-based tags - Gaming/D&D
  if (lowerAnalysis.includes('character sheet') || lowerAnalysis.includes('character name')) tags.add('character-sheet');
  if (lowerAnalysis.includes('dice') || lowerAnalysis.includes('d20') || lowerAnalysis.includes('d6')) tags.add('dice');
  if (lowerAnalysis.includes('miniature') || lowerAnalysis.includes('mini')) tags.add('miniature');
  if (lowerAnalysis.includes('map') || lowerAnalysis.includes('terrain')) tags.add('map');
  if (lowerAnalysis.includes('dnd') || lowerAnalysis.includes('d&d') || lowerAnalysis.includes('dungeons')) tags.add('dnd');
  if (lowerAnalysis.includes('campaign') || lowerAnalysis.includes('adventure')) tags.add('campaign');

  // Technical tags
  if (lowerAnalysis.includes('code') || lowerAnalysis.includes('function') || lowerAnalysis.includes('import')) tags.add('code');
  if (lowerAnalysis.includes('error') || lowerAnalysis.includes('exception') || lowerAnalysis.includes('traceback')) tags.add('error');
  if (lowerAnalysis.includes('screenshot') || lowerAnalysis.includes('interface')) tags.add('screenshot');
  if (lowerAnalysis.includes('api') || lowerAnalysis.includes('endpoint')) tags.add('api');
  if (lowerAnalysis.includes('database') || lowerAnalysis.includes('sql')) tags.add('database');
  if (lowerAnalysis.includes('react') || lowerAnalysis.includes('component')) tags.add('react');
  if (lowerAnalysis.includes('typescript') || lowerAnalysis.includes('javascript')) tags.add('programming');

  // Document tags
  if (lowerAnalysis.includes('receipt')) tags.add('receipt');
  if (lowerAnalysis.includes('invoice')) tags.add('invoice');
  if (lowerAnalysis.includes('form') || lowerAnalysis.includes('application')) tags.add('form');
  if (lowerAnalysis.includes('contract') || lowerAnalysis.includes('agreement')) tags.add('contract');
  if (lowerAnalysis.includes('handwritten') || lowerAnalysis.includes('handwriting')) tags.add('handwritten');
  if (lowerAnalysis.includes('signature') || lowerAnalysis.includes('signed')) tags.add('signed');

  // Automotive tags
  if (lowerAnalysis.includes('car') || lowerAnalysis.includes('vehicle')) tags.add('vehicle');
  if (lowerAnalysis.includes('license plate') || lowerAnalysis.includes('plate number')) tags.add('license-plate');
  if (lowerAnalysis.includes('damage') || lowerAnalysis.includes('dent') || lowerAnalysis.includes('scratch')) tags.add('damage');
  if (lowerAnalysis.includes('maintenance') || lowerAnalysis.includes('service')) tags.add('maintenance');
  if (lowerAnalysis.includes('tesla') || lowerAnalysis.includes('model')) tags.add('tesla');

  // Food/Recipe tags
  if (lowerAnalysis.includes('recipe')) tags.add('recipe');
  if (lowerAnalysis.includes('ingredient')) tags.add('ingredients');
  if (lowerAnalysis.includes('cooking') || lowerAnalysis.includes('baking')) tags.add('cooking');
  if (lowerAnalysis.includes('food') || lowerAnalysis.includes('dish')) tags.add('food');

  // Priority/Status tags
  if (lowerAnalysis.includes('urgent') || lowerAnalysis.includes('asap') || lowerAnalysis.includes('immediate')) tags.add('urgent');
  if (lowerAnalysis.includes('important') || lowerAnalysis.includes('critical')) tags.add('important');
  if (lowerAnalysis.includes('deadline') || lowerAnalysis.includes('due date')) tags.add('deadline');
  if (lowerAnalysis.includes('problem') || lowerAnalysis.includes('issue')) tags.add('troubleshooting');

  // OCR indicator
  if (lowerAnalysis.length > 200 || lowerAnalysis.split('\n').length > 5) tags.add('has-text');

  // Smart filtering - return most relevant tags (max 12)
  return Array.from(tags).slice(0, 12);
}

function autoDetectProjectFromImage(analysis: string, analysisType: string): string {
  const lowerAnalysis = analysis.toLowerCase();

  // Project detection based on analysis content
  if (analysisType === 'dnd' || lowerAnalysis.includes('d&d') || lowerAnalysis.includes('campaign') || lowerAnalysis.includes('character')) {
    return 'gaming';
  }

  if (lowerAnalysis.includes('code') || lowerAnalysis.includes('api') || lowerAnalysis.includes('react') || lowerAnalysis.includes('development')) {
    return 'development';
  }

  if (lowerAnalysis.includes('tesla') || lowerAnalysis.includes('car') || lowerAnalysis.includes('vehicle') || analysisType === 'automotive') {
    return 'automotive';
  }

  if (lowerAnalysis.includes('recipe') || lowerAnalysis.includes('cooking') || lowerAnalysis.includes('food')) {
    return 'personal';
  }

  if (lowerAnalysis.includes('receipt') || lowerAnalysis.includes('invoice') || lowerAnalysis.includes('budget') || lowerAnalysis.includes('financial')) {
    return 'business';
  }

  return 'general';
}

function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: "KimbleAI Photo Analysis API",
    version: "1.0",
    supportedFormats: ["JPEG", "JPG", "PNG", "WebP"],
    maxFileSize: "20MB",
    analysisTypes: {
      general: "General image analysis and description",
      dnd: "D&D campaign materials, character sheets, dice, maps",
      document: "Text extraction and document analysis",
      technical: "Code, screenshots, technical diagrams",
      automotive: "Vehicle identification, parts, maintenance",
      recipe: "Recipe transcription and food analysis"
    },
    usage: {
      method: "POST",
      contentType: "multipart/form-data",
      fields: {
        photo: "Image file (required)",
        analysisType: "Analysis type (optional, default: general)",
        userId: "User ID (optional, default: zach)"
      }
    }
  });
}