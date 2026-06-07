const PALETTE = [
  '#6366f1', '#8b5cf6', '#f97316', '#14b8a6',
  '#3b82f6', '#84cc16', '#f43f5e', '#f59e0b',
];

export function avatarColor(name: string): string {
  const code = (name || '').charCodeAt(0) || 0;
  return PALETTE[code % PALETTE.length];
}
