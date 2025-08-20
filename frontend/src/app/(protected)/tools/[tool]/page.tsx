import ToolExecuteForm from '@/components/ToolExecuteForm';

async function getTool(tool: string) {
  const res = await fetch('/api/tools', { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  const tools = Array.isArray(data?.tools) ? data.tools : Array.isArray(data) ? data : [];
  return tools.find((t: any) => (t.name || t.id) === tool) || null;
}

export default async function ToolPage(props: any) {
  const { tool } = (await props.params) as { tool: string };
  const record = await getTool(tool);
  if (!record) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Tool</h1>
        <p className="opacity-60">Tool not found.</p>
        <div className="mt-2">
          <a className="text-blue-600 underline" href="/tools">Back to tools</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">{record.name || tool}</h1>
        <p className="text-sm opacity-60">{record.description || '—'}</p>
      </div>
      <ToolExecuteForm toolName={record.name || tool} available={record.available !== false} />
    </div>
  );
}


