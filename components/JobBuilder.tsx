'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Section, RubricItem, Question } from '@/lib/types';
import { nanoid } from 'nanoid';
import { Trash2, Plus, Sparkles } from 'lucide-react';

interface JobBuilderProps {
  initialData?: {
    id?: string;
    title: string;
    client_name: string;
    description: string;
    intro_message: string;
    duration_minutes: number;
    sections: Section[];
    rubric: RubricItem[];
  };
}

const DEFAULT_SECTIONS: Section[] = [
  {
    name: 'Background',
    duration_min: 5,
    description: "Understand the candidate's experience and current role",
    questions: [
      { id: nanoid(), text: 'Walk me through your current role and responsibilities.', required: true },
      { id: nanoid(), text: "What's a system or feature you're particularly proud of building?", required: true }
    ],
    allow_followups: true,
    max_followups: 2
  },
  {
    name: 'Technical Knowledge',
    duration_min: 15,
    description: 'Assess depth of technical skills',
    questions: [
      { id: nanoid(), text: 'When would you add a database index, and when would you avoid one?', required: true },
      { id: nanoid(), text: 'Walk me through how you would design a rate limiter for an API.', required: true }
    ],
    allow_followups: true,
    max_followups: 3
  },
  {
    name: 'Behavioral',
    duration_min: 5,
    description: 'Communication and collaboration signals',
    questions: [
      { id: nanoid(), text: 'Tell me about a time you disagreed with a teammate technically. How did you resolve it?', required: true }
    ],
    allow_followups: true,
    max_followups: 2
  },
  {
    name: 'Candidate Questions',
    duration_min: 3,
    description: 'Let candidate ask questions',
    questions: [
      { id: nanoid(), text: 'What questions do you have for me about the role?', required: false }
    ],
    allow_followups: false,
    max_followups: 0
  }
];

const DEFAULT_RUBRIC: RubricItem[] = [
  { name: 'Technical Depth', weight: 40, description: 'Depth of knowledge in core technical areas' },
  { name: 'Problem Solving', weight: 25, description: 'Approach to breaking down and solving problems' },
  { name: 'Communication', weight: 20, description: 'Clarity, structure, and ability to explain' },
  { name: 'Experience Relevance', weight: 15, description: 'Match between past work and role requirements' }
];

export default function JobBuilder({ initialData }: JobBuilderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState(initialData?.title || '');
  const [clientName, setClientName] = useState(initialData?.client_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [introMessage, setIntroMessage] = useState(
    initialData?.intro_message ||
      "Welcome! I'll be conducting a structured screening today. We'll cover your background, some technical questions, and you'll have time for questions at the end. Ready to begin?"
  );
  const [duration, setDuration] = useState(initialData?.duration_minutes || 30);
  const [sections, setSections] = useState<Section[]>(
    initialData?.sections?.length ? initialData.sections : DEFAULT_SECTIONS
  );
  const [rubric, setRubric] = useState<RubricItem[]>(
    initialData?.rubric?.length ? initialData.rubric : DEFAULT_RUBRIC
  );

  async function handleSuggestQuestions() {
    if (!title.trim() || !description.trim()) {
      setError('Please enter a job title and description first');
      return;
    }
    if (sections.some(s => s.questions.some(q => q.text.trim().length > 0))) {
      const confirmed = window.confirm(
        'This will REPLACE your current sections and rubric with AI-generated ones. Continue?'
      );
      if (!confirmed) return;
    }
    setSuggesting(true);
    setError('');
    try {
      const res = await fetch('/api/jobs/suggest-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: title,
          job_description: description,
          duration_minutes: duration
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI suggestion failed');

      // Inject nanoid into each question
      const sectionsWithIds = data.suggested.sections.map((s: any) => ({
        ...s,
        questions: s.questions.map((q: any) => ({ ...q, id: nanoid() }))
      }));
      setSections(sectionsWithIds);
      setRubric(data.suggested.rubric);
      if (data.suggested.intro_message) {
        setIntroMessage(data.suggested.intro_message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSuggesting(false);
    }
  }

  function updateSection(index: number, updates: Partial<Section>) {
    setSections(s => s.map((sec, i) => (i === index ? { ...sec, ...updates } : sec)));
  }
  function addSection() {
    setSections(s => [
      ...s,
      { name: 'New Section', duration_min: 5, questions: [{ id: nanoid(), text: '', required: true }], allow_followups: true, max_followups: 2 }
    ]);
  }
  function removeSection(index: number) {
    setSections(s => s.filter((_, i) => i !== index));
  }
  function addQuestion(sectionIndex: number) {
    setSections(s => s.map((sec, i) => i === sectionIndex ? { ...sec, questions: [...sec.questions, { id: nanoid(), text: '', required: true }] } : sec));
  }
  function updateQuestion(sectionIndex: number, qIndex: number, updates: Partial<Question>) {
    setSections(s => s.map((sec, i) => i === sectionIndex ? { ...sec, questions: sec.questions.map((q, qi) => qi === qIndex ? { ...q, ...updates } : q) } : sec));
  }
  function removeQuestion(sectionIndex: number, qIndex: number) {
    setSections(s => s.map((sec, i) => i === sectionIndex ? { ...sec, questions: sec.questions.filter((_, qi) => qi !== qIndex) } : sec));
  }
  function updateRubricItem(index: number, updates: Partial<RubricItem>) {
    setRubric(r => r.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }
  function addRubricItem() {
    setRubric(r => [...r, { name: '', weight: 0, description: '' }]);
  }
  function removeRubricItem(index: number) {
    setRubric(r => r.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    if (!title.trim()) {
      setError('Job title is required');
      setSaving(false);
      return;
    }
    const totalWeight = rubric.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight !== 100) {
      setError(`Rubric weights must sum to 100 (currently ${totalWeight})`);
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in');
      setSaving(false);
      return;
    }
    const payload = {
      recruiter_id: user.id,
      title,
      client_name: clientName || null,
      description: description || null,
      intro_message: introMessage,
      duration_minutes: duration,
      sections,
      rubric,
      updated_at: new Date().toISOString()
    };
    if (initialData?.id) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', initialData.id);
      if (error) { setError(error.message); setSaving(false); return; }
      router.push(`/admin/jobs/${initialData.id}`);
    } else {
      const { data, error } = await supabase.from('jobs').insert(payload).select().single();
      if (error) { setError(error.message); setSaving(false); return; }
      router.push(`/admin/jobs/${data.id}`);
    }
    router.refresh();
  }

  const totalWeight = rubric.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {initialData?.id ? 'Edit Job' : 'New Job'}
      </h1>

      {/* Basic Info */}
      <section className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="space-y-4">
          <Field label="Job Title *">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name">
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp" className="input" />
            </Field>
            <Field label="Total Duration (min)">
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 30)} min={10} max={90} className="input" />
            </Field>
          </div>
          <Field label="Job Description">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              className="input"
              placeholder="Paste the full job description here. The more detail, the better AI question suggestions will be."
            />
          </Field>

          {/* AI Suggest Button */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-purple-600" />
                  AI-Suggested Interview Structure
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Let Claude analyze the job description and generate tailored sections, questions, and a scoring rubric.
                </p>
              </div>
              <button
                onClick={handleSuggestQuestions}
                disabled={suggesting || !title.trim() || !description.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
              >
                {suggesting ? 'Generating...' : <><Sparkles size={14} /> Suggest Questions</>}
              </button>
            </div>
            {(!title.trim() || !description.trim()) && (
              <p className="text-xs text-gray-500 mt-2">
                Add a job title and description above to enable this feature.
              </p>
            )}
          </div>

          <Field label="Interview Intro Message">
            <textarea value={introMessage} onChange={e => setIntroMessage(e.target.value)} rows={3} className="input" />
          </Field>
        </div>
      </section>

      {/* Sections */}
      <section className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Interview Sections</h2>
          <button onClick={addSection} className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
            <Plus size={16} /> Add Section
          </button>
        </div>
        <div className="space-y-4">
          {sections.map((section, si) => (
            <div key={si} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <input value={section.name} onChange={e => updateSection(si, { name: e.target.value })} placeholder="Section name" className="input col-span-2 font-medium" />
                  <div className="flex items-center gap-2">
                    <input type="number" value={section.duration_min} onChange={e => updateSection(si, { duration_min: parseInt(e.target.value) || 0 })} className="input w-20" min={1} />
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                </div>
                <button onClick={() => removeSection(si)} className="text-gray-400 hover:text-red-600 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
              <input value={section.description || ''} onChange={e => updateSection(si, { description: e.target.value })} placeholder="What this section assesses (optional)" className="input mb-3 text-sm" />
              <div className="space-y-2 mb-3">
                {section.questions.map((q, qi) => (
                  <div key={q.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-6">{qi + 1}.</span>
                    <input value={q.text} onChange={e => updateQuestion(si, qi, { text: e.target.value })} placeholder="Enter question..." className="input flex-1 text-sm" />
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input type="checkbox" checked={q.required} onChange={e => updateQuestion(si, qi, { required: e.target.checked })} />
                      Required
                    </label>
                    <button onClick={() => removeQuestion(si, qi)} className="text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addQuestion(si)} className="text-xs text-brand-600 hover:text-brand-700 ml-8">
                  + Add question
                </button>
              </div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={section.allow_followups} onChange={e => updateSection(si, { allow_followups: e.target.checked })} />
                  Allow AI follow-ups
                </label>
                {section.allow_followups && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Max per question:</span>
                    <input type="number" value={section.max_followups} onChange={e => updateSection(si, { max_followups: parseInt(e.target.value) || 0 })} className="input w-16" min={0} max={5} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rubric */}
      <section className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Scoring Rubric</h2>
            <p className="text-sm text-gray-500">
              Weights must total 100 — currently{' '}
              <span className={totalWeight === 100 ? 'text-green-600' : 'text-red-600'}>{totalWeight}</span>
            </p>
          </div>
          <button onClick={addRubricItem} className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
            <Plus size={16} /> Add Criterion
          </button>
        </div>
        <div className="space-y-3">
          {rubric.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input value={item.name} onChange={e => updateRubricItem(i, { name: e.target.value })} placeholder="Criterion name" className="input col-span-3 font-medium" />
              <div className="col-span-2 flex items-center gap-1">
                <input type="number" value={item.weight} onChange={e => updateRubricItem(i, { weight: parseInt(e.target.value) || 0 })} className="input" min={0} max={100} />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <input value={item.description} onChange={e => updateRubricItem(i, { description: e.target.value })} placeholder="What this measures..." className="input col-span-6 text-sm" />
              <button onClick={() => removeRubricItem(i)} className="text-gray-400 hover:text-red-600 p-2">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving...' : initialData?.id ? 'Save Changes' : 'Create Job'}
        </button>
        <button onClick={() => router.back()} className="px-6 py-2 border rounded-lg font-medium hover:bg-gray-50">
          Cancel
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
