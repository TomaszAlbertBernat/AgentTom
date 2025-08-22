/*
  Import existing TODO files (TODO.md, TODO_FRONTEND.md) into todo/MASTER_TODO.md
  Usage: bun run scripts/importTodos.ts

  Heuristics:
  - Extract checkbox tasks from TODO_FRONTEND.md; tag as frontend and add category tag when available
  - Extract numbered items from TODO.md Top 5 next actions; tag as backend
  - Generate sequential IDs per prefix (FE, BE) based on existing IDs in MASTER_TODO.md
  - Avoid duplicates by comparing normalized task text
*/

import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

type MasterTask = {
  id: string;
  text: string;
  checked: boolean;
  tags: string[];
  raw: string;
};

const ROOT = process.cwd();
const MASTER_FILE = join(ROOT, 'todo', 'MASTER_TODO.md');
const TODO_BACKEND = join(ROOT, 'TODO.md');
const TODO_FRONTEND = join(ROOT, 'TODO_FRONTEND.md');

const MASTER_TASK_RE = /^- \[( |x)\]\s*([^:]+):\s*(.+?)(?:\s{2,}#tags:\s*([^@\n]+))?(?:\s{2,}.*)?$/;

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseMaster(masterText: string) {
  const lines = masterText.split(/\r?\n/);
  const tasks: MasterTask[] = [];
  const existingIds = new Set<string>();
  const normalizedTexts = new Set<string>();
  const prefixMax: Record<string, number> = {};

  for (const line of lines) {
    const m = line.match(MASTER_TASK_RE);
    if (!m) continue;
    const checked = m[1] === 'x';
    const id = m[2].trim();
    const text = m[3].trim();
    const tags = (m[4] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    tasks.push({ id, text, checked, tags, raw: line });
    existingIds.add(id);
    normalizedTexts.add(normalizeText(text));
    const prefMatch = id.match(/^([A-Za-z]+)-(\d+)/);
    if (prefMatch) {
      const pref = prefMatch[1];
      const num = parseInt(prefMatch[2], 10);
      prefixMax[pref] = Math.max(prefixMax[pref] || 0, num);
    }
  }

  return { lines, tasks, existingIds, normalizedTexts, prefixMax };
}

function normalizeText(s: string) {
  return s.replace(/\s+/g, ' ').replace(/[.,;:!\-]+$/g, '').toLowerCase().trim();
}

function nextId(prefixMax: Record<string, number>, prefix: string) {
  const next = (prefixMax[prefix] || 0) + 1;
  prefixMax[prefix] = next;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

type ImportedTask = {
  id: string;
  text: string;
  checked: boolean;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
};

async function importFrontend(prefixMax: Record<string, number>, normalizedTexts: Set<string>): Promise<ImportedTask[]> {
  if (!(await fileExists(TODO_FRONTEND))) return [];
  const text = await readFile(TODO_FRONTEND, 'utf8');
  const lines = text.split(/\r?\n/);
  const out: ImportedTask[] = [];
  let currentCategory: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Update category lines like "- Chat" (not a checkbox)
    if (/^[-*]\s+[^\[]/.test(line) && !/^[-*]\s+\[( |x)\]/.test(line)) {
      currentCategory = line.replace(/^[-*]\s+/, '').toLowerCase();
      continue;
    }
    // Checkbox tasks
    const m = line.match(/^[-*]\s+\[( |x)\]\s+(.+)$/);
    if (!m) continue;
    const checked = m[1] === 'x';
    const taskText = m[2].trim();
    const norm = normalizeText(taskText);
    if (normalizedTexts.has(norm)) continue; // skip duplicates
    const id = nextId(prefixMax, 'FE');
    const tags = ['frontend'];
    if (currentCategory) tags.push(currentCategory.replace(/\s+/g, '-'));
    out.push({ id, text: taskText, checked, tags, priority: 'medium' });
    normalizedTexts.add(norm);
  }
  return out;
}

async function importBackend(prefixMax: Record<string, number>, normalizedTexts: Set<string>): Promise<ImportedTask[]> {
  if (!(await fileExists(TODO_BACKEND))) return [];
  const text = await readFile(TODO_BACKEND, 'utf8');
  const lines = text.split(/\r?\n/);

  const out: ImportedTask[] = [];
  let inTop5 = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('### ')) {
      inTop5 = line.toLowerCase().includes('top 5 next actions');
      continue;
    }
    if (!inTop5) continue;
    // Match numbered items: 1) [DONE] Do something
    const m = line.match(/^(\d+)\)\s*(\[(.*?)\])?\s*(.+)$/);
    if (!m) continue;
    const marker = (m[3] || '').toLowerCase();
    const checked = marker.includes('done');
    const taskText = m[4].trim().replace(/^[-–]\s*/, '');
    const norm = normalizeText(taskText);
    if (normalizedTexts.has(norm)) continue;
    const id = nextId(prefixMax, 'BE');
    const tags = ['backend'];
    // naive keyword tagging
    if (/docs?|documentation/i.test(taskText)) tags.push('docs');
    if (/ci|github actions/i.test(taskText)) tags.push('ci');
    if (/auth|jwt|login|register/i.test(taskText)) tags.push('auth');
    if (/gemini|google|openai/i.test(taskText)) tags.push('llm');
    const priority: 'low' | 'medium' | 'high' = checked ? 'medium' : 'high';
    out.push({ id, text: taskText, checked, tags, priority });
    normalizedTexts.add(norm);
  }
  return out;
}

function toMasterLine(t: ImportedTask) {
  const checked = t.checked ? 'x' : ' ';
  const tags = t.tags.length ? `  #tags: ${t.tags.join(',')}` : '';
  return `- [${checked}] ${t.id}: ${t.text}${tags}  @priority:${t.priority}`;
}

async function main() {
  const masterText = await readFile(MASTER_FILE, 'utf8');
  const { lines, normalizedTexts, prefixMax } = parseMaster(masterText);

  const imported: ImportedTask[] = [];
  imported.push(...(await importFrontend(prefixMax, normalizedTexts)));
  imported.push(...(await importBackend(prefixMax, normalizedTexts)));

  if (!imported.length) {
    console.log('No new tasks to import.');
    return;
  }

  const newLines = [...lines];
  if (newLines.length && newLines[newLines.length - 1].trim() !== '') newLines.push('');
  for (const t of imported) newLines.push(toMasterLine(t));

  await writeFile(MASTER_FILE, newLines.join('\n'), 'utf8');
  console.log(`Imported ${imported.length} tasks into MASTER_TODO.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



