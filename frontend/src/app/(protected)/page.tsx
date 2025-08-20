import Link from 'next/link';
import { cookies } from 'next/headers';

async function getHealth() {
  const res = await fetch('/api/web/health/details', { cache: 'no-store' });
  try {
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

async function getMe() {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  try {
    const data = await res.json();
    return res.ok ? data : null;
  } catch {
    return null;
  }
}

async function getRecentToolExecutions() {
  const res = await fetch('/api/tools/executions', { cache: 'no-store' });
  try {
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.executions || [];
    return list.slice(0, 10);
  } catch {
    return [] as any[];
  }
}

export default async function DashboardPage() {
  const [health, executions, me] = await Promise.all([getHealth(), getRecentToolExecutions(), getMe()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Session</h2>
          {me ? (
            <div className="text-sm">
              <div><span className="opacity-60">User:</span> {me.name || me.email || me.id}</div>
              <div className="opacity-60 text-xs mt-1">Authenticated</div>
            </div>
          ) : (
            <div className="opacity-60 text-sm">No session</div>
          )}
        </div>
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Service health</h2>
          <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-64">
            {JSON.stringify(health.data, null, 2)}
          </pre>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Recent tool executions</h2>
          <ul className="space-y-1 text-sm">
            {executions.length === 0 && <li className="opacity-60">No recent executions</li>}
            {executions.map((e: any) => (
              <li key={e.id || e.uuid} className="flex items-center justify-between">
                <span className="truncate max-w-[60%]" title={e.tool || e.action}>{e.tool || e.action}</span>
                <span className="opacity-60 text-xs">{e.status || e.state || 'ok'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Quick links</h2>
          <ul className="list-disc ml-5">
            <li><Link href="/chat">Chat</Link></li>
            <li><Link href="/tools">Tools</Link></li>
            <li><Link href="/files">Files</Link></li>
            <li><Link href="/search">Search</Link></li>
            <li><Link href="/docs">Swagger UI</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}


