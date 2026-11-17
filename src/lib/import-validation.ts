export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export type ImportFileMetadata = Pick<File, 'name' | 'size'>;

/** Validate a local import selection before reading any file contents. */
export function validateImportFiles(files: readonly ImportFileMetadata[]): string | null {
  let htmlCount = 0;
  let cssCount = 0;

  for (const file of files) {
    const name = file.name.toLowerCase();
    const isCss = name.endsWith('.css');
    const isHtml = name.endsWith('.html') || name.endsWith('.htm');

    if (!isCss && !isHtml) return `${file.name}: choose an .html, .htm, or .css file.`;
    if (file.size > MAX_IMPORT_BYTES) return `${file.name} exceeds the 2 MB per-file import limit.`;
    if (isCss) cssCount += 1;
    if (isHtml) htmlCount += 1;
  }

  if (cssCount > 1) return 'Select no more than one CSS file at a time.';
  if (htmlCount > 1) return 'Select no more than one HTML file at a time.';
  return null;
}
