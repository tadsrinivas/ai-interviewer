import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const REC_LABELS: Record<string, { label: string; color: string }> = {
  strong_yes: { label: 'Strong Yes', color: 'bg-green-600 text-white' },
  yes: { label: 'Yes', color: 'bg-green-100 text-green-800' },
  maybe: { label: 'Maybe', color: 'bg-yellow-100 text-yellow-800' },
  no: { label: 'No', color: 'bg-red-100 text-red-800' },
  strong_no: { label: 'Strong No', color: 'bg-red-600 text-white' }
};

export default async function InterviewDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: interview } = await supabase
    .from('interviews')
    .select(`
      *,
      candidates(*),
      jobs(title, client_name)
    `)
    .eq('id', params.id)
    .single();

  if (!interview) notFound();

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('interview_id', params.id)
    .maybeSingle();

  const { data: transcript } = await supabase
    .from('transcript_turns')
    .select('*')
    .eq('interview_id', params.id)
    .order('created_at', { ascending: true });

  const rec = report?.recommendation
    ? REC_LABELS[report.recommendation]
    : null;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/interviews"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← All interviews
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {interview.candidates.full_name}
            </h1>
            <p className="text-gray-600">
              {interview.jobs.title}
              {interview.jobs.client_name && ` · ${interview.jobs.client_name}`}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {interview.candidates.email}
            </p>
            {interview.recording_url && (
              <a
                href={interview.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                ▶ Watch Recording
              </a>
            )}
          </div>
          {rec && (
            <span className={`px-4 py-2 rounded-lg font-semibold ${rec.color}`}>
              {rec.label}
            </span>
          )}
        </div>
      </div>

      {report ? (
        <>
          {/* Score Overview */}
          <section className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-sm text-gray-500 mb-1">Overall Score</div>
                <div className="text-5xl font-bold text-gray-900">
                  {report.overall_score}
                  <span className="text-2xl text-gray-400">/10</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-2">Rubric Scores</div>
                <div className="space-y-2">
                  {Object.entries(report.rubric_scores || {}).map(
                    ([key, value]: [string, any]) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-40 text-sm">{key}</div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(value / 10) * 100}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm font-medium text-right">
                          {value}/10
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Summary */}
          <section className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Summary</h2>
            <p className="text-gray-700">{report.summary}</p>
          </section>

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <section className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-green-700 mb-3">Strengths</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {report.strengths?.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-orange-700 mb-3">Concerns</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {report.concerns?.map((c: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-orange-600">!</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : interview.status === 'completed' ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-sm text-yellow-800">
          Report is being generated. Refresh in a moment.
        </div>
      ) : (
        <div className="bg-gray-50 border p-4 rounded-lg mb-6 text-sm text-gray-600">
          Interview status:{' '}
          <strong>{interview.status.replace('_', ' ')}</strong>. Report will appear
          here when complete.
        </div>
      )}

      {/* Transcript */}
      {transcript && transcript.length > 0 && (
        <section className="bg-white rounded-xl border">
          <div className="p-6 border-b">
            <h2 className="font-semibold text-gray-900">Transcript</h2>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {transcript.map((turn: any) => (
              <div
                key={turn.id}
                className={`flex gap-3 ${
                  turn.speaker === 'ai' ? '' : 'flex-row-reverse'
                }`}
              >
                <div
                  className={`text-xs font-medium px-2 py-1 rounded h-fit ${
                    turn.speaker === 'ai'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {turn.speaker === 'ai' ? 'AI' : 'Candidate'}
                </div>
                <div className="flex-1 text-sm text-gray-700">
                  {turn.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
