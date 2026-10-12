/* global process */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest & Asset Integrity', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('contains valid PWA root metadata', () => {
    expect(manifestContent.name).toBe('Zyrbit');
    expect(manifestContent.short_name).toBe('Zyrbit');
    expect(manifestContent.start_url).toBe('/');
    expect(manifestContent.display).toBe('standalone');
  });

  it('ensures all icon paths in icons are root-relative and never prefixed with public/', () => {
    expect(Array.isArray(manifestContent.icons)).toBe(true);
    expect(manifestContent.icons.length).toBeGreaterThan(0);

    for (const icon of manifestContent.icons) {
      expect(icon.src.startsWith('/')).toBe(true);
      expect(icon.src.startsWith('public/')).toBe(false);
      expect(icon.src.startsWith('/public/')).toBe(false);

      // Verify the file actually exists inside public/
      const diskPath = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(diskPath), `Icon file ${icon.src} does not exist at ${diskPath}`).toBe(true);
    }
  });

  it('ensures shortcut and widget icons have valid root-relative paths and exist on disk', () => {
    if (manifestContent.shortcuts) {
      for (const shortcut of manifestContent.shortcuts) {
        for (const icon of shortcut.icons || []) {
          expect(icon.src.startsWith('/')).toBe(true);
          const diskPath = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
          expect(fs.existsSync(diskPath)).toBe(true);
        }
      }
    }

    if (manifestContent.widgets) {
      for (const widget of manifestContent.widgets) {
        for (const icon of widget.icons || []) {
          expect(icon.src.startsWith('/')).toBe(true);
          const diskPath = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
          expect(fs.existsSync(diskPath)).toBe(true);
        }
      }
    }
  });

  it('preserves essential maskable and any purposes for PWA compliance', () => {
    const purposes = manifestContent.icons.map(i => i.purpose).filter(Boolean);
    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
  });
});
