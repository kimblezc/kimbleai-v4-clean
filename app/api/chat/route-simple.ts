/**
 * SIMPLIFIED Chat API for testing
 * This version has minimal dependencies to help diagnose issues
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  console.log('Chat API called');
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body).substring(0, 200));
    
    // Check for required fields
    if (!body.messages || !body.userId) {
      console.error('Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { hasMessages: !!body.messages, hasUserId: !!body.userId }
      }, { status: 400 });
    }
    
    // Check if OpenAI key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        response: 'I cannot respond because the OpenAI API key is not configured. Please check Vercel environment variables.'
      });
    }
    
    // Try to initialize OpenAI
    let openai;
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('OpenAI initialized');
    } catch (error: any) {
      console.error('Failed to initialize OpenAI:', error);
      return NextResponse.json({ 
        error: 'Failed to initialize OpenAI',
        response: 'I cannot respond due to an OpenAI initialization error. Please check the API key.'
      });
    }
    
    // Extract the last message
    const lastMessage = body.messages[body.messages.length - 1];
    console.log('Last message:', lastMessage?.content?.substring(0, 100));
    
    // Try to get a response from OpenAI
    try {
      console.log('Calling OpenAI...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using cheaper model for testing
        messages: [
          { role: 'system', content: 'You are KimbleAI V4, a helpful assistant. Keep responses brief for testing.' },
          ...body.messages.slice(-5) // Only last 5 messages to avoid token issues
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      const response = completion.choices[0]?.message?.content || 'No response generated';
      console.log('OpenAI response received:', response.substring(0, 100));
      
      return NextResponse.json({
        response,
        conversationId: body.conversationId || 'test-conversation',
        debug: {
          modelUsed: 'gpt-3.5-turbo',
          messagesProcessed: body.messages.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json({ 
        error: 'OpenAI API error',
        response: `I encountered an error: ${openaiError.message || 'Unknown OpenAI error'}. This might be due to an invalid API key or quota issues.`,
        details: {
          error: openaiError.message,
          type: openaiError.type,
          code: openaiError.code
        }
      });
    }
    
  } catch (error: any) {
    console.error('Unexpected error in chat API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      response: 'I encountered an unexpected error. Please check the Vercel logs for details.',
      details: {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      }
    }, { status: 500 });
  }
}