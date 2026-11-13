export async function readStdin(): Promise<string> {
  if (isStdinTTY()) return "";
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString().trim();
}

export function isStdinTTY(): boolean {
  return process.stdin.isTTY ?? false;
}
