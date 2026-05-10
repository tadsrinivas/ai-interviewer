import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { endTavusConversation } from '@/lib/tavus';

export async function POST(req: NextRequest) {
  const { access_token } = await req.json();
  if (!access_token) {
    return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: interview } = await supabase
    .from('interviews')
    .select('*')
    .eq('access_token', access_token)
    .single();

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  // End Tavus conversation
  if (interview.tavus_conversation_id) {
    try {
      await endTavusConversation(interview.tavus_conversation_id);
    } catch (e) {
      console.error('Failed to end Tavus conversation:', e);
    }
  }

  // Mark interview as completed
  await supabase
    .from('interviews')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', interview.id);

  // Trigger report generation asynchronously
  // (In production, use a queue. For MVP we fire-and-forget.)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  fetch(`${baseUrl}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interview_id: interview.id })
  }).catch(e => console.error('Report generation trigger failed:', e));

  return NextResponse.json({ success: true });
}
