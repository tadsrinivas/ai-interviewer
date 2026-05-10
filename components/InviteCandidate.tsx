'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';

export default function InviteCandidate({
  jobId,
  jobTitle
}: {
  jobId: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          candidate_name: name,
          candidate_email: email,
          resume_text: resumeText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');

      setInviteLink(data.interview_url);
      setName('');
      setEmail('');
      setResumeText('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Candidate name"
            required
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Candidate email"
            required
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <textarea
          value={resumeText}
          onChange={e => setResumeText(e.target.value)}
          placeholder="Paste resume text (optional - helps AI personalize questions)"
          rows={4}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creating invite...' : 'Generate Interview Link'}
        </button>
      </form>

      {inviteLink && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900 mb-2">
            ✓ Invite created! Share this link with the candidate:
          </p>
          <div className="flex gap-2">
            <input
              value={inviteLink}
              readOnly
              className="flex-1 px-2 py-1 text-xs bg-white border rounded font-mono"
            />
            <button
              onClick={copyLink}
              className="px-3 py-1 bg-white border rounded text-xs flex items-center gap-1 hover:bg-gray-50"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
