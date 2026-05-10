import { createClient } from '@/lib/supabase/server';

export default async function CandidatesPage() {
  const supabase = createClient();
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*, interviews(id, status)')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Candidates</h1>

      <div className="bg-white rounded-xl border">
        {candidates && candidates.length > 0 ? (
          <table className="w-full">
            <thead className="border-b text-left text-sm text-gray-500">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Interviews</th>
                <th className="p-4 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {candidates.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{c.full_name}</td>
                  <td className="p-4 text-sm text-gray-600">{c.email}</td>
                  <td className="p-4 text-sm">{c.interviews?.length || 0}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No candidates yet.
          </div>
        )}
      </div>
    </div>
  );
}
