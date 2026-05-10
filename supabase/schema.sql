-- AI Interviewer Database Schema
-- Run this in Supabase SQL editor

-- Recruiters (admin users) - extends Supabase auth.users
create table public.recruiters (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  created_at timestamptz default now()
);

-- Jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references public.recruiters(id) on delete cascade,
  title text not null,
  client_name text,
  description text,
  status text default 'active' check (status in ('active', 'archived')),
  
  -- Interview configuration
  intro_message text,
  duration_minutes int default 30,
  
  -- Sections stored as JSONB for flexibility
  -- Format: [{ name, duration_min, questions: [...], allow_followups: bool, max_followups: int }]
  sections jsonb default '[]'::jsonb,
  
  -- Scoring rubric
  -- Format: [{ name, weight, description }]
  rubric jsonb default '[]'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Candidates
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references public.recruiters(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  resume_url text,
  resume_text text,
  created_at timestamptz default now()
);

-- Interviews (a candidate's session for a specific job)
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  recruiter_id uuid references public.recruiters(id) on delete cascade,
  
  -- Unique link token
  access_token text unique not null,
  
  -- Status
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'expired')),
  
  -- Tavus session info
  tavus_conversation_id text,
  tavus_conversation_url text,
  
  -- Timing
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  
  -- Snapshot of job config at time of interview (immutable for fairness)
  job_snapshot jsonb,
  
  created_at timestamptz default now()
);

-- Conversation transcript (turn by turn)
create table public.transcript_turns (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews(id) on delete cascade,
  speaker text check (speaker in ('ai', 'candidate')),
  content text not null,
  section_name text,
  question_index int,
  created_at timestamptz default now()
);

-- Final scored report
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews(id) on delete cascade unique,
  
  -- Scores
  overall_score numeric(4,2),
  rubric_scores jsonb, -- { "technical_depth": 8.5, "communication": 7.0, ... }
  
  -- Analysis
  strengths text[],
  concerns text[],
  summary text,
  recommendation text check (recommendation in ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
  
  -- Raw LLM output
  raw_analysis jsonb,
  
  generated_at timestamptz default now()
);

-- Indexes
create index idx_jobs_recruiter on public.jobs(recruiter_id);
create index idx_interviews_recruiter on public.interviews(recruiter_id);
create index idx_interviews_token on public.interviews(access_token);
create index idx_interviews_status on public.interviews(status);
create index idx_transcript_interview on public.transcript_turns(interview_id);

-- Row Level Security
alter table public.recruiters enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.interviews enable row level security;
alter table public.transcript_turns enable row level security;
alter table public.reports enable row level security;

-- Recruiters can only see their own data
create policy "Recruiters see own profile" on public.recruiters
  for all using (auth.uid() = id);

create policy "Recruiters manage own jobs" on public.jobs
  for all using (auth.uid() = recruiter_id);

create policy "Recruiters manage own candidates" on public.candidates
  for all using (auth.uid() = recruiter_id);

create policy "Recruiters manage own interviews" on public.interviews
  for all using (auth.uid() = recruiter_id);

create policy "Recruiters see own transcripts" on public.transcript_turns
  for all using (
    exists (
      select 1 from public.interviews
      where interviews.id = transcript_turns.interview_id
      and interviews.recruiter_id = auth.uid()
    )
  );

create policy "Recruiters see own reports" on public.reports
  for all using (
    exists (
      select 1 from public.interviews
      where interviews.id = reports.interview_id
      and interviews.recruiter_id = auth.uid()
    )
  );

-- Function to auto-create recruiter row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.recruiters (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
