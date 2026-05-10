import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function JobsListPage() {
  const supabase = createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <Link
          href="/admin/jobs/new"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          + New Job
        </Link>
      </div>

      <div className="bg-white rounded-xl border">
        {jobs && jobs.length > 0 ? (
          <div className="divide-y">
            {jobs.map(job => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">{job.title}</div>
                  {job.client_name && (
                    <div className="text-sm text-gray-500">{job.client_name}</div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {job.duration_minutes} min · {job.sections?.length || 0} sections
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No jobs created yet.</p>
            <Link
              href="/admin/jobs/new"
              className="text-brand-600 font-medium hover:text-brand-700"
            >
              Create your first job →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
