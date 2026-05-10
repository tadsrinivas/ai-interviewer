import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Tavus webhook handler.
 * Tavus sends events during/after a conversation:
 * - application.transcription_ready
 * - application.utterance (per turn)
 * - system.shutdown / conversation_ended
 *
 * NOTE: Verify exact event names against current Tavus docs.
 * Adapt parsing here as needed.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServiceClient();

  const conversationId =
    body.conversation_id || body.properties?.conversation_id;
  if (!conversationId) {
    return NextResponse.json({ ok: true });
  }

  const { data: interview } = await supabase
    .from('interviews')
    .select('id, status')
    .eq('tavus_conversation_id', conversationId)
    .single();

  if (!interview) {
    return NextResponse.json({ ok: true });
  }

  const eventType = body.event_type || body.type || '';

  // Handle utterance events (per-turn transcript)
  if (eventType.includes('utterance') || eventType.includes('transcription')) {
    const utterance = body.properties || body;
    const speaker = utterance.role === 'replica' || utterance.speaker === 'ai' ? 'ai' : 'candidate';
    const content = utterance.text || utterance.content || utterance.transcript;

    if (content) {
      await supabase.from('transcript_turns').insert({
        interview_id: interview.id,
        speaker,
        content
      });
    }
  }

  // Handle full transcript delivery
  if (eventType.includes('transcription_ready') || body.transcript) {
    const transcript = body.transcript || body.properties?.transcript;
    if (Array.isArray(transcript)) {
      // Clear existing turns and insert all (in case we got partial earlier)
      await supabase.from('transcript_turns').delete().eq('interview_id', interview.id);
      const turns = transcript.map((t: any) => ({
        interview_id: interview.id,
        speaker: t.role === 'replica' || t.speaker === 'ai' ? 'ai' : 'candidate',
        content: t.text || t.content || ''
      }));
      if (turns.length > 0) {
        await supabase.from('transcript_turns').insert(turns);
      }
    }
  }

  // Handle conversation end
  if (eventType.includes('shutdown') || eventType.includes('ended')) {
    if (interview.status !== 'completed') {
      await supabase
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', interview.id);

      // Trigger report generation
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_id: interview.id })
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
