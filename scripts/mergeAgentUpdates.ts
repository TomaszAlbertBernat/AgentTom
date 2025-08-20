/*
  Merge agent-marked task completion back into MASTER_TODO.md
  Runs with Bun: `bun run scripts/mergeAgentUpdates.ts`
*/

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const MASTER = join(ROOT, 'todo', 'MASTER_TODO.md');
const OUTDIR = join(ROOT, 'todo', 'generated');

const TASK_RE = /^- \[( |x)\] ?([^:]+): ?(.+)$/;

async function readAgentFile(path: string) {
  const text = await readFile(path, 'utf8');
  const out: Record<string, { checked: boolean; raw: string }> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(TASK_RE);
    if (!m) continue;
    const checked = m[1] === 'x';
    const tid = m[2].trim();
    out[tid] = { checked, raw: line };
  }
  return out;
}

async function main() {
  const masterLines = (await readFile(MASTER, 'utf8')).split(/\r?\n/);
  const agentStates: Record<string, { checked: boolean; raw: string }> = {};

  try {
    const files = await readdir(OUTDIR);
    for (const f of files) {
      if (!f.startsWith('todo_') || !f.endsWith('.md')) continue;
      Object.assign(agentStates, await readAgentFile(join(OUTDIR, f)));
    }
  } catch {}

  const newMaster: string[] = [];
  for (const line of masterLines) {
    const m = line.match(TASK_RE);
    if (!m) {
      newMaster.push(line);
      continue;
    }
    const tid = m[2].trim();
    if (agentStates[tid]) {
      const checked = agentStates[tid].checked ? 'x' : ' ';
      newMaster.push(`- [${checked}] ${tid}: ${m[3]}`);
    } else {
      newMaster.push(line);
    }
  }

  await writeFile(MASTER, newMaster.join('\n'), 'utf8');
  console.log('Master TODO updated from generated files');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


