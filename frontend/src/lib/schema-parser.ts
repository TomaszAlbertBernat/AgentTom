import { z } from 'zod';

export interface FieldInfo {
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'number' | 'textarea' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  description?: string;
}

export interface ToolActionSchema {
  action: string;
  description?: string;
  fields: FieldInfo[];
}

/**
 * Parse a Zod schema into form field information
 */
export function parseZodSchema(schema: z.ZodType<any>): FieldInfo[] {
  if (!(schema instanceof z.ZodObject)) {
    return [];
  }

  const shape = schema.shape;
  const fields: FieldInfo[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fieldInfo = parseFieldSchema(key, fieldSchema as z.ZodType<any>);
    if (fieldInfo) {
      fields.push(fieldInfo);
    }
  }

  return fields;
}

/**
 * Parse individual field schema
 */
function parseFieldSchema(name: string, schema: z.ZodType<any>): FieldInfo | null {
  // Handle optional fields
  const isOptional = schema.isOptional();
  const baseSchema = isOptional ? (schema as z.ZodOptional<any>)._def.innerType : schema;

  // Handle default values
  const hasDefault = baseSchema instanceof z.ZodDefault;
  const coreSchema = hasDefault ? baseSchema._def.innerType : baseSchema;

  const required = !isOptional && !hasDefault;
  const label = toTitleCase(name.replace(/_/g, ' '));

  let type: FieldInfo['type'] = 'text';
  let placeholder: string | undefined;
  let min: number | undefined;
  let max: number | undefined;
  let options: FieldInfo['options'];

  if (coreSchema instanceof z.ZodString) {
    if (coreSchema._def.checks.some((check: any) => check.kind === 'email')) {
      type = 'email';
      placeholder = 'user@example.com';
    } else if (coreSchema._def.checks.some((check: any) => check.kind === 'url')) {
      type = 'url';
      placeholder = 'https://example.com';
    } else {
      const minLength = coreSchema._def.checks.find((check: any) => check.kind === 'min')?.value;
      if (minLength && minLength > 100) {
        type = 'textarea';
        placeholder = `Enter ${name}...`;
      } else {
        type = 'text';
        placeholder = `Enter ${name}`;
      }
    }
  } else if (coreSchema instanceof z.ZodNumber) {
    type = 'number';
    const minCheck = coreSchema._def.checks.find((check: any) => check.kind === 'min');
    const maxCheck = coreSchema._def.checks.find((check: any) => check.kind === 'max');
    min = minCheck?.value;
    max = maxCheck?.value;
    placeholder = min !== undefined ? `${min}` : 'Enter number';
  } else if (coreSchema instanceof z.ZodBoolean) {
    type = 'boolean';
  } else if (coreSchema instanceof z.ZodEnum) {
    type = 'select';
    options = coreSchema._def.values.map((value: string) => ({
      value,
      label: toTitleCase(value)
    }));
  } else if (coreSchema instanceof z.ZodLiteral) {
    // Skip literal fields as they're usually fixed values
    return null;
  }

  return {
    name,
    label,
    type,
    required,
    placeholder,
    min,
    max,
    options
  };
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Get tool action schemas from tool schemas
 */
export function getToolActionSchemas(toolSchemas: any): Record<string, ToolActionSchema[]> {
  const result: Record<string, ToolActionSchema[]> = {};

  for (const [toolName, actions] of Object.entries(toolSchemas)) {
    const actionSchemas: ToolActionSchema[] = [];

    for (const [actionName, schema] of Object.entries(actions as any)) {
      const fields = parseZodSchema(schema);
      actionSchemas.push({
        action: actionName,
        fields
      });
    }

    result[toolName] = actionSchemas;
  }

  return result;
}
