/*
  Generate per-agent TODOs from the master file based on tag matching.
  Runs with Bun: `bun run scripts/splitMaster.ts`
*/

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type Task = {
  id: string;
  title: string;
  checked: boolean;
  tags: string[];
  raw: string;
  meta: string;
};

type AgentConfig = {
  name: string;
  tag_match: string;
  output: string;
};

const ROOT = process.cwd();
const MASTER = join(ROOT, 'todo', 'MASTER_TODO.md');
const CONFIG = join(ROOT, 'todo', 'agent_configs.yml');
const OUTDIR = join(ROOT, 'todo', 'generated');

const TASK_RE = /^- \[( |x)\] ?([^:]+): ?(.+?)\s*(#tags:\s*([^@\n]+))?(.*)$/;

async function parseMaster(): Promise<Task[]> {
  const text = await readFile(MASTER, 'utf8');
  const tasks: Task[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(TASK_RE);
    if (!m) continue;
    const checked = m[1] === 'x';
    const idPart = m[2].trim();
    const title = m[3].trim();
    const tagsRaw = m[5] || '';
    const rest = m[6] || '';
    const tags = tagsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    tasks.push({ id: idPart, title, checked, tags, raw: line, meta: rest });
  }
  return tasks;
}

async function loadConfig(): Promise<{ agents: AgentConfig[] }> {
  const text = await readFile(CONFIG, 'utf8');
  // Minimal YAML parser for the expected structure, including lines like "- name: backend"
  const agents: AgentConfig[] = [];
  let current: Partial<AgentConfig> | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('agents:')) continue;

    if (line.startsWith('- ')) {
      // Push any previously collected agent
      if (current && current.name && current.tag_match && current.output) {
        agents.push(current as AgentConfig);
      }
      current = {};
      // Support inline key on the same line (e.g., "- name: backend")
      const rest = line.slice(2).trim();
      if (rest && rest.includes(':')) {
        const idx = rest.indexOf(':');
        const key = rest.slice(0, idx).trim();
        let value = rest.slice(idx + 1).trim();
        value = value.replace(/^"|"$/g, '');
        (current as any)[key] = value;
      }
      continue;
    }

    if (current && line.includes(':')) {
      const idx = line.indexOf(':');
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      value = value.replace(/^"|"$/g, '');
      (current as any)[key] = value;
    }
  }
  if (current && current.name && current.tag_match && current.output) {
    agents.push(current as AgentConfig);
  }
  return { agents };
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function writeFileEnsuringDir(path: string, content: string) {
  await ensureDir(dirname(path));
  await writeFile(path, content, 'utf8');
}

async function main() {
  const { agents } = await loadConfig();
  const tasks = await parseMaster();

  const agentToTasks: Record<string, Task[]> = Object.fromEntries(
    agents.map((a) => [a.name, []])
  );
  const unassigned: Task[] = [];

  for (const t of tasks) {
    let matched = false;
    for (const a of agents) {
      if (t.tags.some((tg) => tg.includes(a.tag_match))) {
        agentToTasks[a.name].push(t);
        matched = true;
      }
    }
    if (!matched) unassigned.push(t);
  }

  await ensureDir(OUTDIR);

  // Write per-agent files (exclude completed tasks)
  await Promise.all(
    agents.map(async (a) => {
      const outp = join(ROOT, a.output);
      const lines = [`# TODO for ${a.name}`, ''];
      for (const t of agentToTasks[a.name]) {
        if (!t.checked) lines.push(t.raw);
      }
      await writeFileEnsuringDir(outp, lines.join('\n'));
      console.log('wrote', outp);
    })
  );

  // Unassigned
  if (unassigned.length) {
    const outp = join(OUTDIR, 'todo_unassigned.md');
    const lines = ['# Unassigned tasks', ''];
    for (const t of unassigned) lines.push(t.raw);
    await writeFileEnsuringDir(outp, lines.join('\n'));
    console.log('wrote', outp);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


