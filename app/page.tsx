import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">AI Interviewer</h1>
          <Link
            href="/login"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Recruiter Login →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Candidate Screening
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Conduct structured technical interviews 24/7 with a photorealistic AI
            interviewer. Get scored reports automatically.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t bg-white py-4">
        <div className="max-w-6xl mx-auto px-6 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} AI Interviewer
        </div>
      </footer>
    </div>
  );
}
