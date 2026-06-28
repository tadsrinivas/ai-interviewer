import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';

/**
 * Given a job title + description, ask Claude to generate a complete
 * interview structure: sections, questions, and a scoring rubric.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { job_title, job_description, duration_minutes } = await req.json();

  if (!job_title || !job_description) {
    return NextResponse.json(
      { error: 'job_title and job_description are required' },
      { status: 400 }
    );
  }

  const targetDuration = duration_minutes || 30;

  const prompt = `You are an expert technical recruiter designing a structured screening interview.

JOB TITLE: ${job_title}
TARGET INTERVIEW DURATION: ${targetDuration} minutes

JOB DESCRIPTION:
${job_description}

Design a complete interview structure tailored to this role. Use 3-5 sections that fit within the target duration.

Guidelines:
- Sections should flow naturally: Background → Technical → Behavioral → Candidate Q&A
- Each section should have 2-5 questions
- Mark questions as required (must ask) or optional (ask if time permits)
- Questions should be open-ended, not yes/no
- For technical roles, include questions that probe depth (system design, trade-offs, real experience)
- Behavioral questions should target traits the JD emphasizes
- Scoring rubric weights MUST sum to 100
- Rubric should reflect what the JD actually values

Output ONLY valid JSON in this exact format (no markdown, no commentary):
{
  "sections": [
    {
      "name": "<section name>",
      "duration_min": <minutes>,
      "description": "<what this assesses>",
      "questions": [
        { "text": "<question>", "required": true | false }
      ],
      "allow_followups": true,
      "max_followups": 2
    }
  ],
  "rubric": [
    {
      "name": "<criterion name>",
      "weight": <integer percentage>,
      "description": "<what this measures>"
    }
  ],
  "intro_message": "<short greeting that mentions the role>"
}

The intro_message should be 1-2 sentences max — a warm professional opener tailored to this specific role.`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const textBlock = response.content.find(c => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const cleanText = textBlock.text.replace(/```json|```/g, '').trim();
    const suggested = JSON.parse(cleanText);

    // Validate rubric weights
    if (Array.isArray(suggested.rubric)) {
      const total = suggested.rubric.reduce(
        (sum: number, r: any) => sum + (r.weight || 0),
        0
      );
      if (total !== 100) {
        // Normalize weights to sum to 100
        const scale = 100 / total;
        suggested.rubric = suggested.rubric.map((r: any) => ({
          ...r,
          weight: Math.round(r.weight * scale)
        }));
        // Fix rounding drift on last item
        const newTotal = suggested.rubric.reduce(
          (sum: number, r: any) => sum + r.weight,
          0
        );
        if (newTotal !== 100 && suggested.rubric.length > 0) {
          suggested.rubric[suggested.rubric.length - 1].weight += 100 - newTotal;
        }
      }
    }

    return NextResponse.json({ ok: true, suggested });
  } catch (err: any) {
    console.error('[Suggest questions] Failed:', err);
    return NextResponse.json(
      { error: `AI suggestion failed: ${err.message}` },
      { status: 500 }
    );
  }
}
