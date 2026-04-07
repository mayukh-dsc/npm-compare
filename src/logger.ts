const isTTY = process.stdout.isTTY ?? false;

function color(code: string, text: string): string {
  return isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
}

/** Bold emphasis for TTY (no-op when not a TTY). */
function bold(text: string): string {
  return color('1', text);
}

export const logger = {
  info: (msg: string) => console.log(`  ${msg}`),
  success: (msg: string) => console.log(`  ${color('32', '✔')} ${msg}`),
  warn: (msg: string) => console.warn(`  ${color('33', '⚠')} ${msg}`),
  /**
   * Warn styling with a bold highlighted segment (e.g. counts or key phrase).
   * Concatenates before + bold(highlight) + after as a single line.
   */
  warnHighlight: (before: string, highlight: string, after = ''): void => {
    console.warn(`  ${color('33', '⚠')} ${before}${bold(highlight)}${after}`);
  },
  error: (msg: string) => console.error(`  ${color('31', '✖')} ${msg}`),
  critical: (msg: string) =>
    console.error(`  ${color('31;1', '🚨 CRITICAL:')} ${msg}`),
  section: (title: string) => {
    const line = '─'.repeat(Math.max(0, 52 - title.length));
    console.log(`\n── ${color('1', title)} ${line}`);
  },
  newline: () => console.log(''),
};
