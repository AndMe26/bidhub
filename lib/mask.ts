export function maskName(name: string): string {
  const [first = "", second] = name.trim().split(/\s+/);
  if (second) return `${first} ${second.charAt(0).toUpperCase()}.`;
  return `${first.slice(0, 2)}***`;
}
