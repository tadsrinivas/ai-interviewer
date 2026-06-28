# TalentGauge Update Guide (v0.2.0)

This update adds three major features to your existing app:

1. **Renamed AI Interviewer → TalentGauge**
2. **S3 Recording Integration** — Tavus writes recordings to your S3 bucket, app streams them to admins
3. **AI-Suggested Questions** — Paste a JD, click a button, Claude generates the entire interview structure

## What's in This Update

```
package.json                                          # Added AWS SDK + Daily.js
.env.local.example                                    # Added S3 env vars
supabase/migrations/002_recording_s3.sql              # NEW — add S3 fields to interviews
scripts/AWS_SETUP.md                                  # NEW — AWS IAM setup guide

lib/tavus.ts                                          # Pass recording_storage to Tavus
lib/s3.ts                                             # NEW — S3 client

app/api/tavus/webhook/route.ts                        # Captures S3 location from recording_ready
app/api/recording/[interviewId]/route.ts              # NEW — Streams recording from S3
app/api/jobs/suggest-questions/route.ts               # NEW — AI question generator

app/admin/interviews/[id]/page.tsx                    # Adds "Watch Recording" button
app/admin/interviews/[id]/recording/page.tsx          # NEW — Recording playback page

app/layout.tsx                                        # Renamed to TalentGauge
app/page.tsx                                          # Renamed to TalentGauge
app/admin/layout.tsx                                  # Renamed to TalentGauge

components/JobBuilder.tsx                             # Adds "Suggest Questions" button
```

## Apply in This Order

### Step 1: AWS Setup
1. Open `scripts/AWS_SETUP.md` and follow steps 1-5
2. Gather all 6 AWS env var values

### Step 2: Update Vercel Environment Variables
Add these to Vercel Settings → Environment Variables:
```
RECORDING_S3_BUCKET=your-bucket-name
RECORDING_S3_REGION=us-east-1
RECORDING_S3_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/TavusRecordingWriter
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### Step 3: Run Database Migration
Open Supabase → SQL Editor → New Query → paste contents of `supabase/migrations/002_recording_s3.sql` → Run

### Step 4: Replace Code Files
Copy each file from this update to the matching path in your repo.

### Step 5: Install New Dependencies
```bash
npm install
```
(This will install @aws-sdk packages added to package.json)

### Step 6: Commit & Push
```bash
git add .
git commit -m "v0.2: TalentGauge rebrand + S3 recordings + AI question suggestions"
git push
```

Vercel will auto-deploy.

### Step 7: Test the Three Features

**Test 1: Rebrand**
- Visit your site — header should say TalentGauge everywhere

**Test 2: AI Question Suggestions**
- Go to Jobs → New Job
- Fill in: Title = "Senior Python Developer", Description = (paste a real JD)
- Click the purple "Suggest Questions" button
- Watch sections/rubric populate automatically

**Test 3: Recording**
- Generate fresh interview invite (must be created AFTER the env var changes are deployed)
- Complete the interview as the candidate
- Wait 2-5 minutes after ending
- Refresh admin interview page
- "Watch Recording" button should appear
- Click it → plays the video streamed from S3

## Troubleshooting

### Suggestion button does nothing
- Check Anthropic credits aren't exhausted (Plans & Billing on console.anthropic.com)
- Check browser console for errors
- Verify ANTHROPIC_API_KEY is set in Vercel

### Recording never arrives
- Check Vercel logs filter `Tavus webhook` — look for `recording_copy_failed`
- Most common error code: `DESTINATION_AUTH_FAILED` → IAM role trust policy issue
- Verify max session duration on IAM role is 43200 (12 hours)
- Verify ExternalId is exactly `tavus` (lowercase)

### Recording playback fails (403/500)
- Check AWS_ACCESS_KEY_ID/SECRET in Vercel
- Check the IAM user (talentgauge-app-reader) has GetObject permission on the bucket
- Check Vercel logs for the streaming endpoint errors

### Suggestions are low quality
- Provide a longer, more detailed job description
- Higher detail in JD → better questions
- You can always manually edit after suggestion

## Important Notes

**The "Suggest Questions" button REPLACES existing sections and rubric.** If you've already customized a job, the AI will ask for confirmation before overwriting. To preserve manual edits, just don't click the button.

**S3 cost is minimal**: At ~100 interviews/month × 30 min recordings (~150MB each) = ~15GB/month = roughly $0.35/month in storage. Streaming costs are paid per GB transferred, but as long as you're not constantly re-watching, this stays under a dollar.

**Old interviews won't have recordings.** Only conversations created AFTER the S3 env vars are deployed will have recordings. Past interviews are stuck without them.
