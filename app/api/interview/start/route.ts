import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createTavusConversation } from '@/lib/tavus';
import { buildInterviewSystemPrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const { access_token } = await req.json();

  if (!access_token) {
    return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch interview with full context
  const { data: interview, error: fetchErr } = await supabase
    .from('interviews')
    .select(`
      *,
      candidates(full_name, email, resume_text)
    `)
    .eq('access_token', access_token)
    .single();

  if (fetchErr || !interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  // Check expiry
  if (interview.expires_at && new Date(interview.expires_at) < new Date()) {
    await supabase
      .from('interviews')
      .update({ status: 'expired' })
      .eq('id', interview.id);
    return NextResponse.json({ error: 'Interview expired' }, { status: 410 });
  }

  // If conversation already exists, return it
  if (interview.tavus_conversation_url && interview.status === 'in_progress') {
    return NextResponse.json({
      conversation_url: interview.tavus_conversation_url,
      conversation_id: interview.tavus_conversation_id
    });
  }

  // Build the system prompt from job snapshot
  const job = interview.job_snapshot;
  const candidateName = interview.candidates.full_name;
  const resumeText = interview.candidates.resume_text;

  const systemPrompt = buildInterviewSystemPrompt(job, candidateName, resumeText);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const conversation = await createTavusConversation({
      systemPrompt,
      conversationName: `Interview: ${candidateName} - ${job.title}`,
      candidateName,
      callbackUrl: `${baseUrl}/api/tavus/webhook`,
      maxDurationSeconds: (job.duration_minutes + 5) * 60
    });

    // Update interview record
    await supabase
      .from('interviews')
      .update({
        status: 'in_progress',
        tavus_conversation_id: conversation.conversation_id,
        tavus_conversation_url: conversation.conversation_url,
        started_at: new Date().toISOString()
      })
      .eq('id', interview.id);

    return NextResponse.json({
      conversation_url: conversation.conversation_url,
      conversation_id: conversation.conversation_id
    });
  } catch (err: any) {
    console.error('Tavus error:', err);
    return NextResponse.json(
      { error: `Failed to start AI interviewer: ${err.message}` },
      { status: 500 }
    );
  }
}
