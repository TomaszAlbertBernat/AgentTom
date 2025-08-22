'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { api } from '@/lib/api/client-wrapper';
import { parseZodSchema, getToolActionSchemas, type ToolActionSchema } from '@/lib/schema-parser';
import SchemaDrivenForm from './SchemaDrivenForm';
import { toolSchemas } from '@/config/tool-schemas';

type Props = {
  toolName: string;
  available?: boolean;
};

// Tools that should use schema-driven forms
const SCHEMA_DRIVEN_TOOLS = ['web', 'memory', 'image'];

export default function ToolExecuteForm({ toolName, available }: Props) {
  const { showError, showSuccess } = useToast();
  const [action, setAction] = useState('');
  const [params, setParams] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rateInfo, setRateInfo] = useState<{ remaining?: number; limit?: number; reset?: number } | null>(null);

  // Check if this tool should use schema-driven forms
  const useSchemaDriven = SCHEMA_DRIVEN_TOOLS.includes(toolName);

  // Parse schemas for schema-driven tools
  const toolActionSchemas = useMemo(() => {
    if (!useSchemaDriven) return {};

    const schemas = toolSchemas[toolName as keyof typeof toolSchemas];
    if (!schemas) return {};

    const result: Record<string, ToolActionSchema[]> = {};
    for (const [actionName, schema] of Object.entries(schemas)) {
      const fields = parseZodSchema(schema);
      result[actionName] = [{
        action: actionName,
        fields
      }];
    }
    return result;
  }, [toolName, useSchemaDriven]);

  async function onExecute(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    let parsed: any = {};
    try {
      parsed = params.trim() ? JSON.parse(params) : {};
    } catch (err) {
      showError(err, {
        description: 'Parameters must be valid JSON. Please check your syntax.',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await api.POST('/api/tools/execute', {
        body: { tool_name: toolName, action, parameters: parsed },
        showToastOnError: false, // Handle error display manually
      });

      // Handle rate limiting info if available in response
      // Note: This would need to be extracted from the response headers
      // For now, we'll let the API wrapper handle the error normalization

      if (error) {
        showError(error, {
          description: `Failed to execute ${toolName} tool`,
          action: {
            label: 'Retry',
            onClick: () => onExecute(e),
          },
        });
        return;
      }

      if (data) {
        setResult(data?.result ?? data);
        showSuccess(`${toolName} executed successfully!`, {
          description: 'Tool completed without errors',
        });
      }
    } catch (err) {
      showError(err, {
        description: 'Network error occurred during tool execution',
      });
    } finally {
      setLoading(false);
    }
  }

  // Render schema-driven forms for selected tools
  if (useSchemaDriven && toolActionSchemas) {
    return (
      <div className="space-y-4">
        {Object.entries(toolActionSchemas).map(([actionName, schemas]) => (
          <SchemaDrivenForm
            key={actionName}
            toolName={toolName}
            actionSchema={schemas[0]}
            onSuccess={(result) => setResult(result?.result ?? result)}
          />
        ))}
        {result != null && (
          <div className="border rounded p-4">
            <h4 className="font-semibold mb-2">Result</h4>
            <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-80 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Render traditional form for other tools
  return (
    <form onSubmit={onExecute} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Action</label>
        <input
          className="w-full border rounded p-2"
          placeholder="e.g. search, write, createIssue"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          disabled={!available}
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Parameters (JSON)</label>
        <textarea
          className="w-full border rounded p-2 font-mono text-sm min-h-40"
          value={params}
          onChange={(e) => setParams(e.target.value)}
          disabled={!available}
          placeholder="{}"
        />
      </div>
      <button
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={loading || !available}
        type="submit"
      >
        {available === false ? 'Unavailable' : loading ? 'Executing…' : 'Execute'}
      </button>
      {rateInfo && (
        <div className="text-xs opacity-60">
          Rate limit: {rateInfo.remaining ?? '-'} / {rateInfo.limit ?? '-'} left{rateInfo.reset ? `, resets ~${Math.max(0, Math.round((rateInfo.reset * 1000 - Date.now()) / 1000))}s` : ''}
        </div>
      )}
      {result != null && (
        <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-80 whitespace-pre-wrap mt-2">{JSON.stringify(result, null, 2)}</pre>
      )}
    </form>
  );
}


