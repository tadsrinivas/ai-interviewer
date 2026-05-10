import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { buildReportPrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const { interview_id } = await req.json();
  if (!interview_id) {
    return NextResponse.json({ error: 'Missing interview_id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: interview } = await supabase
    .from('interviews')
    .select(`
      *,
      candidates(full_name)
    `)
    .eq('id', interview_id)
    .single();

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  // Check if report already exists
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('interview_id', interview_id)
    .maybeSingle();

  if (existingReport) {
    return NextResponse.json({ ok: true, message: 'Report already generated' });
  }

  // Fetch transcript
  const { data: transcript } = await supabase
    .from('transcript_turns')
    .select('speaker, content')
    .eq('interview_id', interview_id)
    .order('created_at', { ascending: true });

  if (!transcript || transcript.length === 0) {
    return NextResponse.json(
      { error: 'No transcript available yet' },
      { status: 400 }
    );
  }

  const prompt = buildReportPrompt(
    interview.job_snapshot,
    interview.candidates.full_name,
    transcript
  );

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const textBlock = response.content.find(c => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON (strip markdown fences if present)
    const cleanText = textBlock.text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleanText);

    // Save report
    await supabase.from('reports').insert({
      interview_id,
      overall_score: analysis.overall_score,
      rubric_scores: analysis.rubric_scores,
      strengths: analysis.strengths,
      concerns: analysis.concerns,
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      raw_analysis: analysis
    });

    return NextResponse.json({ ok: true, analysis });
  } catch (err: any) {
    console.error('Report generation failed:', err);
    return NextResponse.json(
      { error: `Report generation failed: ${err.message}` },
      { status: 500 }
    );
  }
}
