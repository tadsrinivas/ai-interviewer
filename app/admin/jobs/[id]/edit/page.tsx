import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import JobBuilder from '@/components/JobBuilder';

export default async function EditJobPage({
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

  return (
    <JobBuilder
      initialData={{
        id: job.id,
        title: job.title,
        client_name: job.client_name || '',
        description: job.description || '',
        intro_message: job.intro_message || '',
        duration_minutes: job.duration_minutes,
        sections: job.sections,
        rubric: job.rubric
      }}
    />
  );
}
