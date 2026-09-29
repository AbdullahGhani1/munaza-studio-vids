#!/usr/bin/env node
// Stand-in for the `claude` CLI used by tests: speaks the same stream-json shape, touches a file, exits.
import { writeFileSync } from 'node:fs';
if (process.argv.includes('--version')) { console.log('0.0.0-fake'); process.exit(0); }
let prompt = ''; process.stdin.on('data', (d) => (prompt += d)); process.stdin.on('end', async () => {
  const say = (o) => console.log(JSON.stringify(o));
  say({ type: 'system', subtype: 'init' });
  say({ type: 'assistant', message: { content: [{ type: 'text', text: 'Reading the brief.\nThen building.' }, { type: 'tool_use', name: 'Write', input: { file_path: 'src/fake.txt' } }] } });
  writeFileSync('src-fake-output.txt', `args=${process.argv.slice(2).join(' ')}\nprompt-chars=${prompt.length}\nhas-claude-md=${/CLAUDE\.md/.test(prompt)}\nkey=sk-abcdefghijklmnop\n`);
  if (process.env.FAKE_CLAUDE_HANG) setInterval(() => {}, 1000); // stay alive until killed
  if (process.env.FAKE_CLAUDE_HANG) return;
  say({ type: 'result', is_error: false, result: 'All done', total_cost_usd: 0.0123 });
});
