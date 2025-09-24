import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const analysisType = formData.get('analysisType') as string || 'general';
    const userId = formData.get('userId') as string || 'zach';

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload JPG, PNG, or WebP images only.'
      }, { status: 400 });
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File too large. Please upload images under 20MB.'
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
        model: "gpt-4-vision-preview",
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
        max_tokens: 1000,
      });

      const analysis = response.choices[0].message.content;

      // Auto-generate tags based on the analysis
      const tags = autoGenerateTagsFromAnalysis(analysis || '', analysisType);

      // Auto-detect project category
      const projectCategory = autoDetectProjectFromImage(analysis || '', analysisType);

      return NextResponse.json({
        success: true,
        analysis,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          analysisType,
          userId,
          timestamp: new Date().toISOString()
        },
        autoTags: tags,
        suggestedProject: projectCategory,
        photoId: generatePhotoId()
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
    general: "Analyze this image and provide a detailed description. Include objects, people, text, colors, setting, and any notable details. If there's text in the image, transcribe it.",

    dnd: "Analyze this D&D related image. Identify character sheets, dice, miniatures, maps, rulebooks, or campaign materials. Extract any character names, stats, locations, or game mechanics you can see. Describe the campaign setting or scenario if visible.",

    document: "Analyze this document image. Extract and transcribe all visible text, identify the document type (receipt, form, letter, etc.), and note any important dates, names, numbers, or key information.",

    technical: "Analyze this technical image. Identify any code, diagrams, screenshots, user interfaces, error messages, or technical documentation. Transcribe any visible code or text and explain what system or technology is shown.",

    automotive: "Analyze this automotive image. Identify vehicle make/model, license plates, parts, damage, or maintenance issues. Note any visible text, numbers, or technical specifications.",

    recipe: "Analyze this recipe or food image. If it's a recipe, transcribe ingredients and instructions. If it's food, describe the dish, ingredients visible, and cooking method. Note any measurements or cooking times."
  };

  return prompts[analysisType as keyof typeof prompts] || prompts.general;
}

function autoGenerateTagsFromAnalysis(analysis: string, analysisType: string): string[] {
  const tags = new Set<string>();
  const lowerAnalysis = analysis.toLowerCase();

  // Add analysis type as base tag
  tags.add(analysisType);
  tags.add('photo-analysis');

  // Context-based tags
  if (lowerAnalysis.includes('character sheet') || lowerAnalysis.includes('dice') || lowerAnalysis.includes('miniature')) tags.add('dnd');
  if (lowerAnalysis.includes('code') || lowerAnalysis.includes('programming') || lowerAnalysis.includes('error')) tags.add('technical');
  if (lowerAnalysis.includes('recipe') || lowerAnalysis.includes('cooking') || lowerAnalysis.includes('ingredient')) tags.add('cooking');
  if (lowerAnalysis.includes('car') || lowerAnalysis.includes('vehicle') || lowerAnalysis.includes('license')) tags.add('automotive');
  if (lowerAnalysis.includes('document') || lowerAnalysis.includes('receipt') || lowerAnalysis.includes('form')) tags.add('document');
  if (lowerAnalysis.includes('handwritten') || lowerAnalysis.includes('handwriting')) tags.add('handwritten');
  if (lowerAnalysis.includes('screenshot') || lowerAnalysis.includes('screen')) tags.add('screenshot');

  // Priority tags
  if (lowerAnalysis.includes('urgent') || lowerAnalysis.includes('important') || lowerAnalysis.includes('deadline')) tags.add('urgent');
  if (lowerAnalysis.includes('error') || lowerAnalysis.includes('problem') || lowerAnalysis.includes('issue')) tags.add('troubleshooting');

  return Array.from(tags).slice(0, 8);
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