import Link from 'next/link';
import { Suspense } from 'react';
import HealthStatus from './health-status';
import ToolExecutions from './tool-executions';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="border rounded p-4 opacity-60">Loading health status...</div>}>
          <HealthStatus />
        </Suspense>

        <Suspense fallback={<div className="border rounded p-4 opacity-60">Loading tool executions...</div>}>
          <ToolExecutions />
        </Suspense>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">Quick links</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><Link href="/chat" className="text-blue-600 hover:underline">Chat</Link></li>
            <li><Link href="/tools" className="text-blue-600 hover:underline">Tools</Link></li>
            <li><Link href="/files" className="text-blue-600 hover:underline">Files</Link></li>
            <li><Link href="/search" className="text-blue-600 hover:underline">Search</Link></li>
            <li><Link href="/conversations" className="text-blue-600 hover:underline">Conversations</Link></li>
            <li><Link href="/docs" className="text-blue-600 hover:underline">API Documentation</Link></li>
          </ul>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-medium mb-2">System Information</h2>
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">Environment:</span> Local-First Mode</div>
            <div><span className="opacity-60">API Base:</span> http://localhost:3000</div>
            <div><span className="opacity-60">Status:</span> <span className="text-green-600">Operational</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}


