import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Tavus webhook handler.
 *
 * Based on Tavus official docs, events delivered to callback_url:
 * - system.replica_joined        (call started)
 * - system.shutdown              (call ended, with shutdown_reason)
 * - application.transcription_ready  (full transcript array)
 * - application.recording_ready      (recording URL)
 * - application.perception_analysis  (visual analysis, if enabled)
 *
 * Transcript format: array of { role: "system"|"user"|"assistant", content: string }
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error('[Tavus webhook] Failed to parse JSON body');
    return NextResponse.json({ ok: true });
  }

  // Log everything for debugging
  console.log('[Tavus webhook] Received event:', JSON.stringify(body, null, 2));

  const supabase = createServiceClient();

  const conversationId =
    body.conversation_id || body.properties?.conversation_id;
  if (!conversationId) {
    console.log('[Tavus webhook] No conversation_id in payload');
    return NextResponse.json({ ok: true });
  }

  const { data: interview, error: fetchErr } = await supabase
    .from('interviews')
    .select('id, status')
    .eq('tavus_conversation_id', conversationId)
    .single();

  if (fetchErr || !interview) {
    console.log(`[Tavus webhook] No interview found for conversation ${conversationId}`);
    return NextResponse.json({ ok: true });
  }

  const eventType = body.event_type || body.type || '';
  const messageType = body.message_type || '';
  console.log(`[Tavus webhook] Event: ${eventType}, Interview: ${interview.id}`);

  // ============================================
  // Handle transcription_ready (the main event we care about)
  // ============================================
  if (eventType === 'application.transcription_ready' || eventType.includes('transcription_ready')) {
    const transcript = body.properties?.transcript || body.transcript;

    if (Array.isArray(transcript)) {
      console.log(`[Tavus webhook] Transcript has ${transcript.length} turns`);

      // Clear any existing turns for this interview
      await supabase.from('transcript_turns').delete().eq('interview_id', interview.id);

      // Map Tavus roles to our schema
      // Tavus: "system" | "user" | "assistant"  →  Our: "ai" | "candidate"
      // Skip "system" turns (those are just the system prompt)
      const turns = transcript
        .filter((t: any) => t.role !== 'system')
        .map((t: any) => ({
          interview_id: interview.id,
          speaker: t.role === 'assistant' ? 'ai' : 'candidate',
          content: t.content || ''
        }))
        .filter((t: any) => t.content.trim().length > 0);

      if (turns.length > 0) {
        const { error: insertErr } = await supabase
          .from('transcript_turns')
          .insert(turns);
        if (insertErr) {
          console.error('[Tavus webhook] Failed to insert turns:', insertErr);
        } else {
          console.log(`[Tavus webhook] Inserted ${turns.length} transcript turns`);
        }
      }

      // Trigger report generation now that we have the transcript
      triggerReportGeneration(interview.id);
    }
  }

  // ============================================
  // Handle recording_ready (save URL for playback)
  // ============================================
  if (eventType === 'application.recording_ready' || eventType.includes('recording_ready')) {
    const recordingUrl =
      body.properties?.recording_url ||
      body.properties?.url ||
      body.recording_url;

    if (recordingUrl) {
      console.log(`[Tavus webhook] Recording ready: ${recordingUrl}`);
      await supabase
        .from('interviews')
        .update({ recording_url: recordingUrl })
        .eq('id', interview.id);
    }
  }

  // ============================================
  // Handle conversation end
  // ============================================
  if (eventType === 'system.shutdown' || eventType.includes('shutdown')) {
    console.log(`[Tavus webhook] Conversation ended. Reason: ${body.properties?.shutdown_reason}`);

    if (interview.status !== 'completed') {
      await supabase
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', interview.id);
    }
    // Note: Don't trigger report here - wait for transcription_ready
    // Tavus sends transcription_ready AFTER shutdown
  }

  return NextResponse.json({ ok: true });
}

function triggerReportGeneration(interviewId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  fetch(`${baseUrl}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interview_id: interviewId })
  }).catch(e => console.error('[Tavus webhook] Report trigger failed:', e));
}
