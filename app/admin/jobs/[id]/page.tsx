import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import InviteCandidate from '@/components/InviteCandidate';

export default async function JobDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!job) notFound();

  const { data: interviews } = await supabase
    .from('interviews')
    .select('id, status, created_at, candidates(full_name, email)')
    .eq('job_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          {job.client_name && (
            <p className="text-gray-600 mt-1">{job.client_name}</p>
          )}
        </div>
        <Link
          href={`/admin/jobs/${job.id}/edit`}
          className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <InfoCard label="Duration" value={`${job.duration_minutes} min`} />
        <InfoCard label="Sections" value={job.sections?.length || 0} />
        <InfoCard
          label="Total Questions"
          value={
            job.sections?.reduce(
              (sum: number, s: any) => sum + (s.questions?.length || 0),
              0
            ) || 0
          }
        />
      </div>

      <section className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Invite Candidate</h2>
        <InviteCandidate jobId={job.id} jobTitle={job.title} />
      </section>

      <section className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-gray-900">
            Candidates ({interviews?.length || 0})
          </h2>
        </div>
        {interviews && interviews.length > 0 ? (
          <div className="divide-y">
            {interviews.map((interview: any) => (
              <Link
                key={interview.id}
                href={`/admin/interviews/${interview.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {interview.candidates?.full_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {interview.candidates?.email}
                  </div>
                </div>
                <StatusBadge status={interview.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No candidates invited yet.
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-xl border">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700'
  };
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.pending}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
