export function mergeAiActivity(claude = {}, codex = {}) {
  const days = {};
  const keys = new Set([
    ...Object.keys(claude.days || {}),
    ...Object.keys(codex.days || {}),
  ]);
  for (const day of keys) {
    const claudeMessages = Number(claude.days?.[day]?.msgs) || 0;
    const codexMessages = Number(codex.days?.[day]?.msgs) || 0;
    days[day] = {
      total: claudeMessages + codexMessages,
      claude: claudeMessages,
      codex: codexMessages,
    };
  }
  return {
    days,
    files: (Number(claude.files) || 0) + (Number(codex.files) || 0),
    claudeFiles: Number(claude.files) || 0,
    codexFiles: Number(codex.files) || 0,
  };
}
