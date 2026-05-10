import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function InterviewsListPage() {
  const supabase = createClient();
  const { data: interviews } = await supabase
    .from('interviews')
    .select(`
      id, status, created_at, completed_at,
      candidates(full_name, email),
      jobs(title, client_name),
      reports(overall_score, recommendation)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Interviews</h1>

      <div className="bg-white rounded-xl border">
        {interviews && interviews.length > 0 ? (
          <table className="w-full">
            <thead className="border-b text-left text-sm text-gray-500">
              <tr>
                <th className="p-4 font-medium">Candidate</th>
                <th className="p-4 font-medium">Job</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {interviews.map((i: any) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <Link
                      href={`/admin/interviews/${i.id}`}
                      className="font-medium text-gray-900 hover:text-brand-600"
                    >
                      {i.candidates?.full_name}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {i.candidates?.email}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div>{i.jobs?.title}</div>
                    {i.jobs?.client_name && (
                      <div className="text-xs text-gray-500">
                        {i.jobs.client_name}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="p-4 text-sm">
                    {i.reports?.[0]?.overall_score ? (
                      <span className="font-semibold">
                        {i.reports[0].overall_score}/10
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(i.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No interviews yet.
          </div>
        )}
      </div>
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
