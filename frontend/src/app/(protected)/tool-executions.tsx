'use client';

import { useToolExecutionsQuery } from '@/lib/hooks/useToolExecutions';

export default function ToolExecutions() {
  const { data, isLoading, isError, refetch } = useToolExecutionsQuery();

  if (isLoading) return <div className="opacity-60">Loading tool executions...</div>;
  if (isError) return (
    <div className="text-sm text-red-600 flex items-center gap-2">
      Failed to load tool executions
      <button className="underline text-xs" onClick={() => refetch()}>Retry</button>
    </div>
  );

  const executions = data || [];
  if (executions.length === 0) return <div className="opacity-60">No tool executions yet.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Tool Executions</h2>
      <ul className="space-y-2">
        {executions.slice(0, 10).map((execution) => (
          <li key={execution.uuid} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{execution.tool_name}</div>
                <div className="text-sm opacity-60">
                  {new Date(execution.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm px-2 py-1 rounded ${
                  execution.status === 'success' ? 'bg-green-100 text-green-800' :
                  execution.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {execution.status}
                </div>
              </div>
            </div>
            {execution.result && (
              <div className="mt-2 text-sm">
                <div className="font-medium">Result:</div>
                <pre className="text-xs bg-black/5 p-2 rounded mt-1 overflow-auto max-h-32">
                  {typeof execution.result === 'string'
                    ? execution.result
                    : JSON.stringify(execution.result, null, 2)}
                </pre>
              </div>
            )}
            {execution.error && (
              <div className="mt-2 text-sm text-red-600">
                <div className="font-medium">Error:</div>
                <div className="text-xs">{execution.error}</div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
