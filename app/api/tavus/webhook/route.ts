import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Tavus webhook handler.
 *
 * Events delivered to callback_url:
 * - system.replica_joined
 * - system.shutdown
 * - application.transcription_ready  (full transcript array)
 * - application.recording_ready      (with storage_uri / bucket_name / s3_key)
 * - application.recording_copy_failed (delivery to bucket failed)
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error('[Tavus webhook] Failed to parse JSON body');
    return NextResponse.json({ ok: true });
  }

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
  console.log(`[Tavus webhook] Event: ${eventType}, Interview: ${interview.id}`);

  // ============================================
  // Transcript
  // ============================================
  if (eventType === 'application.transcription_ready' || eventType.includes('transcription_ready')) {
    const transcript = body.properties?.transcript || body.transcript;
    if (Array.isArray(transcript)) {
      console.log(`[Tavus webhook] Transcript has ${transcript.length} turns`);

      await supabase.from('transcript_turns').delete().eq('interview_id', interview.id);

      const turns = transcript
        .filter((t: any) => t.role !== 'system')
        .map((t: any) => ({
          interview_id: interview.id,
          speaker: t.role === 'assistant' ? 'ai' : 'candidate',
          content: t.content || ''
        }))
        .filter((t: any) => t.content.trim().length > 0);

      if (turns.length > 0) {
        const { error: insertErr } = await supabase.from('transcript_turns').insert(turns);
        if (insertErr) console.error('[Tavus webhook] Failed to insert turns:', insertErr);
        else console.log(`[Tavus webhook] Inserted ${turns.length} transcript turns`);
      }

      triggerReportGeneration(interview.id);
    }
  }

  // ============================================
  // Recording — save S3 location
  // ============================================
  if (eventType === 'application.recording_ready' || eventType.includes('recording_ready')) {
    const props = body.properties || {};
    const bucketName = props.bucket_name;
    const s3Key = props.s3_key;
    const duration = props.duration;
    const storageUri = props.storage_uri;

    console.log(`[Tavus webhook] Recording ready. bucket=${bucketName}, key=${s3Key}, duration=${duration}`);

    if (s3Key) {
      const update: any = {
        recording_s3_bucket: bucketName,
        recording_s3_key: s3Key,
        recording_duration_seconds: duration
      };
      // Store storage_uri for reference if present
      if (storageUri) {
        update.recording_url = storageUri; // legacy display field
      }

      const { error: updateErr } = await supabase
        .from('interviews')
        .update(update)
        .eq('id', interview.id);

      if (updateErr) console.error('[Tavus webhook] Failed to save recording info:', updateErr);
    }
  }

  // ============================================
  // Recording copy failed (S3 trust issue, etc.)
  // ============================================
  if (eventType === 'application.recording_copy_failed' || eventType.includes('recording_copy_failed')) {
    const errorCode = body.properties?.error_code;
    const errorMessage = body.properties?.error_message;
    console.error(`[Tavus webhook] Recording delivery FAILED: ${errorCode} - ${errorMessage}`);
    // Note: Tavus retains the recording for ~30 days for manual recovery
  }

  // ============================================
  // Conversation end
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
