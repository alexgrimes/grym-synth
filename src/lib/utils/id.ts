export function generateId(): string {
  // Generate a timestamp-based ID with a random component
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}
