import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import InterviewRoom from '@/components/InterviewRoom';

export default async function InterviewPage({
  params
}: {
  params: { token: string };
}) {
  // Use service client because candidate doesn't have auth
  const supabase = createServiceClient();

  const { data: interview } = await supabase
    .from('interviews')
    .select(`
      *,
      candidates(full_name, email, resume_text),
      jobs(title, client_name)
    `)
    .eq('access_token', params.token)
    .single();

  if (!interview) notFound();

  if (interview.status === 'expired' || (interview.expires_at && new Date(interview.expires_at) < new Date())) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl border max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600">
            This interview link has expired. Please contact the recruiter for a new
            invitation.
          </p>
        </div>
      </div>
    );
  }

  if (interview.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl border max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Interview Already Completed
          </h1>
          <p className="text-gray-600">
            Thanks for completing your interview! The recruiter will follow up
            with next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InterviewRoom
      interviewId={interview.id}
      accessToken={params.token}
      candidateName={interview.candidates.full_name}
      jobTitle={interview.jobs.title}
      clientName={interview.jobs.client_name}
      durationMinutes={interview.job_snapshot?.duration_minutes || 30}
      tavusConversationUrl={interview.tavus_conversation_url}
      status={interview.status}
    />
  );
}
