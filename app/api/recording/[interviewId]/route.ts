/**
 * Streams recording from S3 to authenticated admin.
 * Supports HTTP Range requests so the video can seek/scrub.
 * URL: /api/recording/[interviewId]
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { s3Client, RECORDINGS_BUCKET } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(
  req: NextRequest,
  { params }: { params: { interviewId: string } }
) {
  // Authenticate the admin
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up the interview and verify this recruiter owns it
  const { data: interview, error } = await supabase
    .from('interviews')
    .select('id, recording_s3_bucket, recording_s3_key, recruiter_id')
    .eq('id', params.interviewId)
    .single();

  if (error || !interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  if (interview.recruiter_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!interview.recording_s3_key) {
    return NextResponse.json({ error: 'Recording not available' }, { status: 404 });
  }

  // Use the stored bucket (could differ from current env if you ever migrate)
  const bucket = interview.recording_s3_bucket || RECORDINGS_BUCKET;
  const key = interview.recording_s3_key;

  // Forward Range header for video seeking
  const range = req.headers.get('range') || undefined;

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range
    });
    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: 'Empty recording' }, { status: 500 });
    }

    const headers: Record<string, string> = {
      'Content-Type': s3Response.ContentType || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600'
    };

    if (s3Response.ContentLength) {
      headers['Content-Length'] = String(s3Response.ContentLength);
    }
    if (s3Response.ContentRange) {
      headers['Content-Range'] = s3Response.ContentRange;
    }

    // S3 returns a 206 Partial Content for range requests; passthrough that status
    const status = s3Response.ContentRange ? 206 : 200;

    return new NextResponse(s3Response.Body as any, { status, headers });
  } catch (err: any) {
    console.error('[Recording stream] S3 error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch recording', detail: err.message },
      { status: 500 }
    );
  }
}
