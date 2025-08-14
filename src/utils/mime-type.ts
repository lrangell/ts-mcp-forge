/**
 * MIME type detection utility for MCP resources
 */

export interface MimeTypeMapping {
  [extension: string]: string;
}

/**
 * Common MIME type mappings based on file extensions
 */
export const MIME_TYPE_MAPPINGS: MimeTypeMapping = {
  // Text files
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.log': 'text/plain',

  // Programming languages
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/typescript',
  '.jsx': 'text/javascript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.java': 'text/x-java-source',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.cc': 'text/x-c++',
  '.cxx': 'text/x-c++',
  '.h': 'text/x-c',
  '.hpp': 'text/x-c++',
  '.rs': 'text/x-rust',
  '.go': 'text/x-go',
  '.php': 'text/x-php',
  '.rb': 'text/x-ruby',
  '.sh': 'text/x-shellscript',
  '.bash': 'text/x-shellscript',
  '.zsh': 'text/x-shellscript',
  '.fish': 'text/x-shellscript',
  '.ps1': 'text/x-powershell',
  '.r': 'text/x-r',
  '.sql': 'text/x-sql',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.scala': 'text/x-scala',
  '.clj': 'text/x-clojure',
  '.hs': 'text/x-haskell',
  '.elm': 'text/x-elm',
  '.dart': 'text/x-dart',

  // Configuration files
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.toml': 'application/toml',
  '.ini': 'text/plain',
  '.conf': 'text/plain',
  '.config': 'text/plain',
  '.env': 'text/plain',

  // Web files
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.sass': 'text/x-sass',
  '.scss': 'text/x-scss',
  '.less': 'text/x-less',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.bz2': 'application/x-bzip2',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',

  // Audio/Video
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',

  // Fonts
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
};

/**
 * Extract file extension from a URI or file path
 */
export function extractFileExtension(uriOrPath: string): string | null {
  try {
    // Handle URI schemes by extracting the path portion
    let path = uriOrPath;

    // Remove URI scheme (e.g., file://, https://, etc.)
    const schemeMatch = uriOrPath.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/(.*)$/);
    if (schemeMatch) {
      path = schemeMatch[1];
    }

    // Remove query parameters and fragments
    path = path.split('?')[0].split('#')[0];

    // Extract the last dot and everything after it
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === path.length - 1) {
      return null;
    }

    // Return the extension including the dot
    return path.substring(lastDotIndex).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Detect MIME type from a URI or file path based on file extension
 */
export function detectMimeType(uriOrPath: string): string | undefined {
  const extension = extractFileExtension(uriOrPath);

  if (!extension) {
    return undefined;
  }

  return MIME_TYPE_MAPPINGS[extension];
}

/**
 * Get MIME type with fallback logic
 * 1. Use provided MIME type if available
 * 2. Try to detect from URI/path
 * 3. Fall back to default if specified
 */
export function resolveMimeType(
  uriOrPath: string,
  providedMimeType?: string,
  defaultMimeType?: string
): string | undefined {
  // Use provided MIME type if available
  if (providedMimeType) {
    return providedMimeType;
  }

  // Try to detect from URI/path
  const detectedMimeType = detectMimeType(uriOrPath);
  if (detectedMimeType) {
    return detectedMimeType;
  }

  // Fall back to default
  return defaultMimeType;
}

/**
 * Check if a MIME type is text-based
 */
export function isTextMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'application/x-yaml' ||
    mimeType === 'application/toml'
  );
}

/**
 * Check if a MIME type represents an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get a human-readable description of a MIME type
 */
export function getMimeTypeDescription(mimeType: string): string {
  const descriptions: Record<string, string> = {
    'text/plain': 'Plain Text',
    'text/markdown': 'Markdown',
    'text/html': 'HTML',
    'text/css': 'CSS',
    'text/javascript': 'JavaScript',
    'text/typescript': 'TypeScript',
    'application/json': 'JSON',
    'application/xml': 'XML',
    'application/pdf': 'PDF Document',
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image',
    'image/gif': 'GIF Image',
    'image/svg+xml': 'SVG Image',
    'audio/mpeg': 'MP3 Audio',
    'video/mp4': 'MP4 Video',
    'application/zip': 'ZIP Archive',
  };

  return descriptions[mimeType] || mimeType;
}
