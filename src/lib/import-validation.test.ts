import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_BYTES, validateImportFiles } from './import-validation';

const file = (name: string, size = 12) => ({ name, size });

describe('validateImportFiles', () => {
  it('accepts one HTML document and one stylesheet', () => {
    expect(validateImportFiles([file('index.html'), file('styles.css')])).toBeNull();
  });
  it('rejects duplicate CSS files instead of silently overwriting one', () => {
    expect(validateImportFiles([file('base.css'), file('theme.css')])).toBe('Select no more than one CSS file at a time.');
  });
  it('rejects duplicate HTML files instead of silently overwriting one', () => {
    expect(validateImportFiles([file('index.html'), file('preview.htm')])).toBe('Select no more than one HTML file at a time.');
  });
  it('rejects unsupported file types', () => {
    expect(validateImportFiles([file('notes.txt')])).toBe('notes.txt: choose an .html, .htm, or .css file.');
  });
  it('rejects files larger than 2 MB', () => {
    expect(validateImportFiles([file('styles.css', MAX_IMPORT_BYTES + 1)])).toBe('styles.css exceeds the 2 MB per-file import limit.');
  });
  it('allows files exactly at the 2 MB limit', () => {
    expect(validateImportFiles([file('styles.css', MAX_IMPORT_BYTES)])).toBeNull();
  });
});
