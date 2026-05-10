import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { job_id, candidate_name, candidate_email, resume_text } = body;

  if (!job_id || !candidate_name || !candidate_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify job belongs to recruiter
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', job_id)
    .eq('recruiter_id', user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Create or find candidate
  let { data: candidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('email', candidate_email)
    .eq('recruiter_id', user.id)
    .maybeSingle();

  if (!candidate) {
    const { data: newCand, error: candErr } = await supabase
      .from('candidates')
      .insert({
        recruiter_id: user.id,
        full_name: candidate_name,
        email: candidate_email,
        resume_text: resume_text || null
      })
      .select()
      .single();
    if (candErr) {
      return NextResponse.json({ error: candErr.message }, { status: 500 });
    }
    candidate = newCand;
  } else if (resume_text && !candidate.resume_text) {
    await supabase
      .from('candidates')
      .update({ resume_text })
      .eq('id', candidate.id);
    candidate.resume_text = resume_text;
  }

  // Create interview with snapshot of job config
  const accessToken = nanoid(24);
  const { data: interview, error: intErr } = await supabase
    .from('interviews')
    .insert({
      job_id,
      candidate_id: candidate.id,
      recruiter_id: user.id,
      access_token: accessToken,
      status: 'pending',
      job_snapshot: {
        title: job.title,
        client_name: job.client_name,
        description: job.description,
        intro_message: job.intro_message,
        duration_minutes: job.duration_minutes,
        sections: job.sections,
        rubric: job.rubric
      }
    })
    .select()
    .single();

  if (intErr) {
    return NextResponse.json({ error: intErr.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const interviewUrl = `${baseUrl}/interview/${accessToken}`;

  // Send email if Resend is configured
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: candidate_email,
        subject: `Interview invitation: ${job.title}`,
        html: `
          <p>Hi ${candidate_name},</p>
          <p>You've been invited to an AI-conducted screening interview for the <strong>${job.title}</strong> role${job.client_name ? ` at <strong>${job.client_name}</strong>` : ''}.</p>
          <p>The interview will take approximately ${job.duration_minutes} minutes. You can complete it anytime in the next 7 days.</p>
          <p><a href="${interviewUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;">Start Interview</a></p>
          <p>Or copy this link: ${interviewUrl}</p>
          <p>Tips for success:<br/>
          • Use a quiet space with good lighting<br/>
          • Test your camera and microphone beforehand<br/>
          • Allow ~${job.duration_minutes + 10} minutes of uninterrupted time</p>
          <p>Good luck!</p>
        `
      });
    } catch (e) {
      console.error('Email send failed:', e);
      // Don't fail the request just because email failed
    }
  }

  return NextResponse.json({
    interview_id: interview.id,
    interview_url: interviewUrl,
    access_token: accessToken
  });
}
