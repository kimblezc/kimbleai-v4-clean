import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { messages, currentFile } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'Messages required' }, { status: 400 });
    }

    // Get user ID for cost tracking
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Build system prompt
    const systemPrompt = `You are an expert coding assistant powered by OpenAI GPT-4.1 mini. You help developers with:
- Writing and editing code
- Debugging and fixing issues
- Explaining code concepts
- Refactoring and optimization
- Adding comments and documentation
- Writing tests
- Code reviews

${
  currentFile
    ? `Current file context:
File: ${currentFile.path}
Language: ${currentFile.language}

File content:
\`\`\`${currentFile.language}
${currentFile.content}
\`\`\`
`
    : ''
}

When providing code:
- Always explain what you're doing
- Use the same style as the existing code
- Add helpful comments
- Consider edge cases and error handling

If generating or modifying code, wrap it in triple backticks with the language.`;

    // Call OpenAI GPT-4.1 mini
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Latest coding-optimized model
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const duration = Date.now() - startTime;
    const response = completion.choices[0].message.content || '';

    // Extract code if present
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : null;

    // Track API cost
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;

    // GPT-4.1 mini pricing: $0.40 per 1M input, $1.60 per 1M output
    const inputCost = (inputTokens / 1_000_000) * 0.40;
    const outputCost = (outputTokens / 1_000_000) * 1.60;
    const totalCost = inputCost + outputCost;

    await supabase.from('api_cost_tracking').insert({
      user_id: userData.id,
      endpoint: 'code_assistant',
      model: 'gpt-4.1-mini',
      tokens_used: inputTokens + outputTokens,
      cost_usd: totalCost,
      request_time_ms: duration,
      timestamp: new Date().toISOString(),
      metadata: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        has_code: !!code,
        file: currentFile?.path || null,
      },
    });

    return NextResponse.json({
      success: true,
      response,
      code,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_cost: totalCost.toFixed(6),
      },
    });
  } catch (error: any) {
    console.error('Error in AI assistant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
