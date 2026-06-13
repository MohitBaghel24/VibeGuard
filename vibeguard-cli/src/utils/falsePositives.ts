export function stripFalsePositives(content: string, filePath: string): string {
  if (filePath.endsWith('.json') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    return content; // Don't strip structured config files aggressively
  }

  // A helper to replace a substring with spaces to preserve line lengths/indices
  const replaceWithSpaces = (str: string, match: string, index: number) => {
    // Preserve newlines if match spans multiple lines
    const spaces = match.replace(/[^\n]/g, ' ');
    return str.substring(0, index) + spaces + str.substring(index + match.length);
  };

  let cleaned = content;

  // 1. Strip Block Comments (/* ... */)
  const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
  let match;
  while ((match = blockCommentRegex.exec(cleaned)) !== null) {
    cleaned = replaceWithSpaces(cleaned, match[0], match.index);
  }

  // 2. Strip Line Comments (// ...)
  const lineCommentRegex = /\/\/.*/g;
  while ((match = lineCommentRegex.exec(cleaned)) !== null) {
    cleaned = replaceWithSpaces(cleaned, match[0], match.index);
  }

  // 3. Strip Python Line Comments (# ...)
  if (filePath.endsWith('.py')) {
    const pyCommentRegex = /#.*/g;
    while ((match = pyCommentRegex.exec(cleaned)) !== null) {
      cleaned = replaceWithSpaces(cleaned, match[0], match.index);
    }
  }

  return cleaned;
}
