import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function RecordingPlayerPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: interview } = await supabase
    .from('interviews')
    .select('id, recording_s3_key, recording_duration_seconds, candidates(full_name), jobs(title)')
    .eq('id', params.id)
    .single();

  if (!interview) notFound();
  if (!interview.recording_s3_key) {
    return (
      <div className="p-8 max-w-3xl">
        <Link href={`/admin/interviews/${params.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to interview
        </Link>
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mt-4">
          <p className="text-yellow-900">Recording is not yet available for this interview.</p>
          <p className="text-sm text-yellow-700 mt-2">
            Recordings typically arrive within a few minutes after the call ends. If it&apos;s been more than 15 minutes, check the Vercel logs for the <code>recording_ready</code> webhook event.
          </p>
        </div>
      </div>
    );
  }

  const candidate = interview.candidates as any;
  const job = interview.jobs as any;

  return (
    <div className="p-8 max-w-4xl">
      <Link href={`/admin/interviews/${params.id}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to interview
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">
        Interview Recording
      </h1>
      <p className="text-gray-600 mb-6">
        {candidate?.full_name} · {job?.title}
        {interview.recording_duration_seconds && ` · ${Math.floor(interview.recording_duration_seconds / 60)} min`}
      </p>

      <div className="bg-black rounded-xl overflow-hidden">
        <video
          controls
          src={`/api/recording/${params.id}`}
          className="w-full max-h-[70vh]"
          preload="metadata"
        >
          Your browser doesn&apos;t support video playback.
        </video>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Streamed from S3. Only authenticated recruiters who own this interview can view it.
      </p>
    </div>
  );
}
