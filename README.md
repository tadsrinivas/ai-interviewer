# AI Interviewer

An AI-powered candidate screening platform for staffing companies. Conducts structured technical interviews via a photorealistic AI avatar, generates scored reports automatically.

**Stack:** Next.js 14 + Supabase + Claude (Anthropic) + Tavus CVI + Resend

---

## What it does

1. Recruiter signs in and creates a Job with custom questions, sections, and scoring rubric
2. Recruiter invites candidates — gets a unique interview link
3. Candidate clicks link, does system check, joins AI video interview
4. AI conducts structured interview using your script + adaptive follow-ups
5. After interview, Claude analyzes transcript and generates scored report
6. Recruiter reviews report with rubric scores, strengths, concerns, and recommendation

---

## Setup — Step by Step

### 1. Sign up for required services

You need accounts at:
- **[Anthropic](https://console.anthropic.com)** — for Claude API
- **[Tavus](https://platform.tavus.io)** — for the AI avatar
- **[Supabase](https://supabase.com)** — for database + auth
- **[Resend](https://resend.com)** — for sending interview emails (optional but recommended)
- **[Vercel](https://vercel.com)** — for hosting

### 2. Set up Supabase

1. Create a new Supabase project
2. Go to SQL Editor → New Query
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to Settings → API and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 3. Set up Tavus

1. Log into Tavus platform
2. Either use a stock replica or create your own (record a 2-min video → upload)
3. Note your **Replica ID** (starts with `r...`)
4. Create a Persona (optional but recommended) — defines the interviewer's personality
5. Get your **API key** from Settings → API Keys
6. **IMPORTANT — Webhooks:** After deploying, add your webhook URL in Tavus settings:
   `https://yourdomain.com/api/tavus/webhook`

### 4. Set up Anthropic

1. Go to console.anthropic.com → API Keys
2. Create a key, copy it (starts with `sk-ant-`)

### 5. Set up Resend (optional)

1. Sign up at resend.com
2. Verify a sending domain (or use their test domain initially)
3. Copy your API key

### 6. Local development

```bash
# Install dependencies
npm install

# Copy env template
cp .env.local.example .env.local

# Edit .env.local with your actual keys

# Run dev server
npm run dev
```

Visit http://localhost:3000

### 7. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# (Settings → Environment Variables)
# Copy each var from your .env.local
```

After deployment:
- Update `NEXT_PUBLIC_APP_URL` in Vercel env to your real domain
- Add the webhook URL in your Tavus dashboard
- Update Supabase Auth → URL Configuration to allow your Vercel domain

---

## How to Use

### As a recruiter:

1. Go to `/login` and sign up
2. Click "+ New Job"
3. Configure:
   - Job title, client, duration
   - Sections (Background, Technical, Behavioral, etc.)
   - Questions (mark required vs optional)
   - Allow AI follow-ups (with limits)
   - Scoring rubric (must total 100%)
4. Save the job
5. On the job page, invite a candidate (paste their resume for personalized questions)
6. Copy the interview link or rely on the automated email
7. Once they complete the interview, view the report on `/admin/interviews/[id]`

### As a candidate:

1. Receive email or get link from recruiter
2. Open link → see welcome screen
3. Review consent + privacy
4. Run system check (camera/mic)
5. Click "Start Interview" → AI avatar appears in iframe
6. Have natural conversation
7. Click "End Interview" when done

---

## Architecture

```
candidate ──► /interview/[token] ──► InterviewRoom (iframe to Tavus)
                    │
                    ▼
            /api/interview/start
                    │
                    ▼
            createTavusConversation() ──► Tavus API
                    │                     (returns conversation_url)
                    ▼
            Update interviews table

Tavus webhook ──► /api/tavus/webhook ──► Save transcript turns
                                          │
                                          ▼
                                   When ended, trigger:
                                   /api/reports/generate
                                          │
                                          ▼
                                   Claude analyzes transcript
                                          │
                                          ▼
                                   Save report to DB
```

---

## Important Notes & Caveats

### Tavus API
The Tavus API can change. The integration in `lib/tavus.ts` uses the `/v2/conversations` endpoint as documented at the time of build. **If you hit errors, check current docs at https://docs.tavus.io/api-reference/conversations/create-conversation** and adjust the request body shape.

### Webhook event names
The webhook handler in `app/api/tavus/webhook/route.ts` makes reasonable guesses about Tavus's event names. You may need to add `console.log(body)` and adjust based on actual webhooks you receive.

### Costs at <100 interviews/month (rough)
- Tavus: ~$0.50–1/min × 30 min × 100 = **$1,500–3,000** (dominant cost)
- Claude API: ~$50/month
- Supabase + Vercel + Resend: ~$0–25/month (free tiers work for this volume)

### What's NOT in this MVP
- Live coding editor (use CoderPad/HackerRank embed in v2)
- ATS integrations (Bullhorn, Greenhouse, etc.)
- Multi-tenant (multiple staffing companies)
- Advanced proctoring (tab switching, secondary device detection)
- Resume PDF parsing (currently paste as text)
- Multi-language interviews
- Calendar/scheduling

### Compliance you must add before going live
- **Bias audit** (annual, required by NYC AEDT Law if screening NYC candidates)
- **Notice & consent** (currently in the UI — review with legal counsel)
- **Data retention policy** (auto-delete recordings after X days)
- **Human alternative option** (must offer if requested)
- **GDPR** considerations if EU candidates
- **EEOC** guidance on AI hiring discrimination

Strongly recommend a 30-min consult with an employment lawyer before going live.

---

## Customization Ideas

- **Resume PDF upload** → use a service like Affinda or pdf-parse to extract text automatically
- **Coding assessment** → integrate CoderPad iframe in a dedicated section
- **Branding** → edit `tailwind.config.js` colors, add your logo to layouts
- **Custom questions library** → add a `question_bank` table and template picker
- **Slack/email notifications** → notify recruiters when reports are ready
- **Bulk invite** → CSV upload of candidates

---

## Troubleshooting

**"Tavus API error 401"** → Wrong API key, check `TAVUS_API_KEY`

**"Tavus replica not found"** → Wrong `TAVUS_REPLICA_ID`, get it from Tavus dashboard

**Webhook not firing** → Check Tavus dashboard webhook config, ensure URL is publicly accessible (not localhost)

**Report says "No transcript available"** → Webhook isn't receiving utterance events. Check Tavus event names and adapt the webhook handler.

**Candidate sees "Interview Already Completed"** → Status was set to completed; reset in DB if testing.

**Auth redirects loop** → Make sure your Supabase Auth URL Configuration includes your Vercel domain.

---

## License & Disclaimer

This is a starter codebase. Test thoroughly before production use. AI hiring decisions have significant legal and ethical implications — always have human review of decisions, especially rejections.
