'use client';

import { useState, useEffect } from 'react';

interface InterviewRoomProps {
  interviewId: string;
  accessToken: string;
  candidateName: string;
  jobTitle: string;
  clientName?: string;
  durationMinutes: number;
  tavusConversationUrl?: string;
  status: string;
}

export default function InterviewRoom(props: InterviewRoomProps) {
  const [stage, setStage] = useState<'welcome' | 'consent' | 'check' | 'starting' | 'live' | 'ended'>(
    props.tavusConversationUrl ? 'live' : 'welcome'
  );
  const [conversationUrl, setConversationUrl] = useState(props.tavusConversationUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function startInterview() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: props.accessToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start interview');
      setConversationUrl(data.conversation_url);
      setStage('live');
    } catch (err: any) {
      setError(err.message);
      setStage('check');
    } finally {
      setLoading(false);
    }
  }

  async function endInterview() {
    setLoading(true);
    try {
      await fetch('/api/interview/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: props.accessToken })
      });
      setStage('ended');
    } catch (err) {
      // Even if API fails, show ended state
      setStage('ended');
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'welcome') {
    return (
      <Container>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {props.candidateName} 👋
        </h1>
        <p className="text-gray-600 mb-6">
          You're about to interview for the <strong>{props.jobTitle}</strong> role
          {props.clientName && ` at ${props.clientName}`}.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">What to expect</h3>
          <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
            <li>~{props.durationMinutes} minutes with an AI interviewer</li>
            <li>Conversation feels like a real video call</li>
            <li>Background, technical, and behavioral questions</li>
            <li>You'll have time to ask questions at the end</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Before you begin</h3>
          <ul className="text-sm text-yellow-900 space-y-1 list-disc list-inside">
            <li>Find a quiet space with good lighting</li>
            <li>Test that your camera and mic work</li>
            <li>Have ~{props.durationMinutes + 10} minutes uninterrupted</li>
            <li>Speak naturally — the AI is listening</li>
          </ul>
        </div>

        <button
          onClick={() => setStage('consent')}
          className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
        >
          Continue
        </button>
      </Container>
    );
  }

  if (stage === 'consent') {
    return (
      <Container>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Consent & Privacy</h1>
        <div className="prose prose-sm text-gray-700 mb-6">
          <p>By proceeding, you acknowledge that:</p>
          <ul>
            <li>This interview will be conducted by an AI agent</li>
            <li>Your video and audio will be recorded and transcribed</li>
            <li>The recording will be reviewed by human recruiters</li>
            <li>Data will be stored securely and used solely for hiring evaluation</li>
            <li>You can request a human-conducted interview as an alternative</li>
            <li>You can stop the interview at any time</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setStage('check')}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
          >
            I Consent — Continue
          </button>
          <button
            onClick={() => setStage('welcome')}
            className="px-6 py-2 border rounded-lg font-medium hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </Container>
    );
  }

  if (stage === 'check') {
    return (
      <Container>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">System Check</h1>
        <p className="text-gray-600 mb-6">
          Make sure your camera and microphone are working before starting.
        </p>
        <SystemCheck />
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg my-4 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={startInterview}
          disabled={loading}
          className="mt-6 px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Start Interview'}
        </button>
      </Container>
    );
  }

  if (stage === 'live' && conversationUrl) {
    return (
      <div
        className="bg-gray-900 flex flex-col fixed inset-0"
        style={{ height: '100vh', width: '100vw' }}
      >
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center flex-shrink-0">
          <div className="text-sm">
            Interview: <strong>{props.jobTitle}</strong>
          </div>
          <button
            onClick={endInterview}
            disabled={loading}
            className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            End Interview
          </button>
        </div>
        <div className="flex-1 min-h-0 relative">
          <iframe
            src={conversationUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
            className="absolute inset-0 w-full h-full border-0"
            title="AI Interview"
          />
        </div>
      </div>
    );
  }

  if (stage === 'ended') {
    return (
      <Container>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Complete ✓</h1>
        <p className="text-gray-600 mb-6">
          Thanks for completing your interview, {props.candidateName}! Your responses
          are being analyzed and the recruiter will follow up within 2 business days
          with next steps.
        </p>
        <p className="text-sm text-gray-500">You can safely close this window.</p>
      </Container>
    );
  }

  return null;
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-8 rounded-xl border max-w-2xl w-full">{children}</div>
    </div>
  );
}

function SystemCheck() {
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(s => {
        if (!active) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(s);
        setCameraOk(s.getVideoTracks().length > 0);
        setMicOk(s.getAudioTracks().length > 0);
      })
      .catch(() => {
        setCameraOk(false);
        setMicOk(false);
      });

    return () => {
      active = false;
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <CheckRow label="Camera" status={cameraOk} />
      <CheckRow label="Microphone" status={micOk} />
      {stream && (
        <video
          ref={el => {
            if (el && stream) el.srcObject = stream;
          }}
          autoPlay
          muted
          playsInline
          className="w-full max-w-sm rounded-lg bg-black"
        />
      )}
    </div>
  );
}

function CheckRow({ label, status }: { label: string; status: boolean | null }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-3 h-3 rounded-full ${
          status === null ? 'bg-gray-300' : status ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-gray-500">
        {status === null ? 'Checking...' : status ? 'OK' : 'Not detected'}
      </span>
    </div>
  );
}
