import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <Link href="/admin" className="text-lg font-bold text-gray-900">
            TalentGauge
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Dashboard
          </Link>
          <Link href="/admin/jobs" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Jobs
          </Link>
          <Link href="/admin/interviews" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Interviews
          </Link>
          <Link href="/admin/candidates" className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
            Candidates
          </Link>
        </nav>

        <div className="p-4 border-t">
          <div className="text-xs text-gray-500 mb-2">{user.email}</div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
