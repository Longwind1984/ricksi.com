import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseJsonMessage(text) {
  const raw = text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Codex 最终消息不是合法 JSON（前 200 字符）：${raw.slice(0, 200)}`);
  }
}

export function runCodexStructured(prompt, schema, config, options = {}) {
  const spawn = options.spawn || spawnSync;
  const env = options.env || process.env;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rick-frontier-codex-'));
  const schemaFile = path.join(tempDir, 'schema.json');
  const outputFile = path.join(tempDir, 'output.json');
  fs.writeFileSync(schemaFile, JSON.stringify(schema));
  try {
    const result = spawn(
      config.bin,
      [
        'exec', '--ephemeral', '--sandbox', 'read-only', '--skip-git-repo-check',
        '--output-schema', schemaFile, '--output-last-message', outputFile,
        '--model', config.model, '-',
      ],
      {
        input: prompt,
        encoding: 'utf8',
        timeout: config.timeoutMs,
        killSignal: 'SIGKILL',
        maxBuffer: 16 * 1024 * 1024,
        cwd: os.homedir(),
        env,
      }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const message = (result.stderr || result.stdout || '').slice(0, 500);
      const error = new Error(`Codex 退出码 ${result.status}: ${message}`);
      error.rateLimited = /limit|rate|quota|usage/i.test(message);
      throw error;
    }
    if (!fs.existsSync(outputFile)) {
      throw new Error('Codex 未写出结构化最终消息');
    }
    return parseJsonMessage(fs.readFileSync(outputFile, 'utf8'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
