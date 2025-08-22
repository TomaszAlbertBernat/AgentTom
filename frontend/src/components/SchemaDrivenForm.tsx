'use client';

import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { api } from '@/lib/api/client-wrapper';
import type { FieldInfo, ToolActionSchema } from '@/lib/schema-parser';

interface SchemaDrivenFormProps {
  toolName: string;
  actionSchema: ToolActionSchema;
  onSuccess?: (result: any) => void;
}

export default function SchemaDrivenForm({ toolName, actionSchema, onSuccess }: SchemaDrivenFormProps) {
  const { showError, showSuccess } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const { data, error } = await api.POST('/api/tools/execute', {
        body: {
          tool_name: toolName,
          action: actionSchema.action,
          parameters: formData
        },
        showToastOnError: false,
      });

      if (error) {
        showError(error, {
          description: `Failed to execute ${toolName} tool`,
        });
        return;
      }

      if (data) {
        setResult(data?.result ?? data);
        showSuccess(`${toolName} executed successfully!`, {
          description: 'Tool completed without errors',
        });
        onSuccess?.(data);
      }
    } catch (err) {
      showError(err, {
        description: 'Network error occurred during tool execution',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderField = (field: FieldInfo) => {
    const value = formData[field.name] ?? '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full border rounded p-2 font-mono text-sm min-h-40"
          />
        );

      case 'select':
        return (
          <select
            id={field.name}
            name={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
            className="w-full border rounded p-2"
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            id={field.name}
            name={field.name}
            type="number"
            min={field.min}
            max={field.max}
            value={value}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full border rounded p-2"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              id={field.name}
              name={field.name}
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              required={field.required}
              className="rounded"
            />
            <span>{field.label}</span>
          </label>
        );

      default:
        return (
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full border rounded p-2"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded p-4 bg-gray-50">
        <h3 className="font-semibold mb-2">{actionSchema.action}</h3>
        {actionSchema.description && (
          <p className="text-sm text-gray-600 mb-4">{actionSchema.description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {actionSchema.fields.map(field => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {field.description && (
                <p className="text-xs text-gray-500 mt-1">{field.description}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Executing…' : `Execute ${actionSchema.action}`}
          </button>
        </form>
      </div>

      {result && (
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
