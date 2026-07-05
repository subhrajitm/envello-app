import { Injectable, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { Note, Task } from '@envello/domain';

export type ImportSource = 'notion' | 'obsidian' | 'markdown';
export type ImportTarget = 'notes' | 'tasks';

export interface ImportResult {
  source: ImportSource;
  target: ImportTarget;
  imported: number;
  skipped: number;
  errors: string[];
}

interface Frontmatter {
  title?: string;
  date?: string;
  created?: string;
  tags?: string[];
  status?: string;
  priority?: string;
  due?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ContentImportService {
  private readonly data = inject(DataService);

  async importFiles(
    files: File[],
    source: ImportSource,
    target: ImportTarget,
  ): Promise<ImportResult> {
    const result: ImportResult = { source, target, imported: 0, skipped: 0, errors: [] };

    for (const file of files) {
      try {
        if (file.name.endsWith('.csv') && target === 'tasks') {
          const text = await file.text();
          const count = await this.importCsvAsTasks(text, result);
          result.imported += count;
        } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          const text = await file.text();
          if (target === 'notes') {
            await this.importMdAsNote(text, file.name, source, result);
          } else {
            await this.importMdAsTask(text, file.name, source, result);
          }
        } else {
          result.skipped++;
        }
      } catch (e) {
        result.errors.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
        result.skipped++;
      }
    }

    return result;
  }

  // ─── Markdown → Note ────────────────────────────────────────────────────────

  private async importMdAsNote(
    text: string,
    filename: string,
    source: ImportSource,
    result: ImportResult,
  ): Promise<void> {
    const { frontmatter, body } = this.parseFrontmatter(text);
    const title = this.resolveTitle(frontmatter, body, filename);
    const date = this.resolveDate(frontmatter) ?? new Date().toISOString().slice(0, 10);
    const tags = this.resolveTags(frontmatter);

    let content = body;
    if (source === 'notion') {
      content = this.stripNotionProperties(content);
    }
    const html = this.markdownToHtml(content.trim());
    const preview = this.textPreview(html, 150);

    const note: Note = {
      id: crypto.randomUUID(),
      date,
      title,
      preview,
      content: html,
      tags,
      lastEdited: new Date().toISOString(),
    };

    await this.data.upsert('notes', note);
    result.imported++;
  }

  // ─── Markdown → Task ────────────────────────────────────────────────────────

  private async importMdAsTask(
    text: string,
    filename: string,
    source: ImportSource,
    result: ImportResult,
  ): Promise<void> {
    const { frontmatter, body } = this.parseFrontmatter(text);
    const title = this.resolveTitle(frontmatter, body, filename);
    if (!title) { result.skipped++; return; }

    const rawStatus = String(frontmatter.status ?? '').toLowerCase();
    const status: Task['status'] =
      rawStatus.includes('complet') ? 'COMPLETED'
      : rawStatus.includes('pending') ? 'PENDING'
      : 'ACTIVE';

    const rawPriority = String(frontmatter.priority ?? '').toLowerCase();
    const priority: Task['priority'] =
      rawPriority.includes('high') ? 'HIGH'
      : rawPriority.includes('low') ? 'LOW'
      : 'MEDIUM';

    const due = frontmatter.due ? String(frontmatter.due) : undefined;

    const task: Task = {
      id: crypto.randomUUID(),
      title,
      priority,
      hours: '0',
      status,
      ...(due && { due }),
      labels: this.resolveTags(frontmatter),
      createdAt: new Date().toISOString(),
    };

    await this.data.upsert('tasks', task);
    result.imported++;
  }

  // ─── Notion CSV → Tasks ─────────────────────────────────────────────────────

  private async importCsvAsTasks(csv: string, result: ImportResult): Promise<number> {
    const lines = csv.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return 0;

    const headers = this.parseCsvRow(lines[0]).map(h => h.toLowerCase().trim());
    const nameIdx     = headers.findIndex(h => h === 'name' || h === 'title' || h === 'task');
    const statusIdx   = headers.findIndex(h => h === 'status');
    const priorityIdx = headers.findIndex(h => h === 'priority');
    const dueIdx      = headers.findIndex(h => h.includes('due'));

    if (nameIdx === -1) { result.errors.push('CSV: no "Name" or "Title" column found'); return 0; }

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvRow(lines[i]);
      const title = cols[nameIdx]?.trim();
      if (!title) continue;

      const rawStatus = (cols[statusIdx] ?? '').toLowerCase();
      const status: Task['status'] =
        rawStatus.includes('complet') ? 'COMPLETED'
        : rawStatus.includes('pending') ? 'PENDING'
        : 'ACTIVE';

      const rawPriority = (cols[priorityIdx] ?? '').toLowerCase();
      const priority: Task['priority'] =
        rawPriority.includes('high') ? 'HIGH'
        : rawPriority.includes('low') ? 'LOW'
        : 'MEDIUM';

      const dueRaw = dueIdx >= 0 ? cols[dueIdx]?.trim() : undefined;
      const due = dueRaw ? this.normalizeDate(dueRaw) : undefined;

      const task: Task = {
        id: crypto.randomUUID(),
        title,
        priority,
        hours: '0',
        status,
        ...(due && { due }),
        createdAt: new Date().toISOString(),
      };

      await this.data.upsert('tasks', task);
      count++;
    }
    return count;
  }

  // ─── YAML frontmatter parsing ────────────────────────────────────────────────

  private parseFrontmatter(text: string): { frontmatter: Frontmatter; body: string } {
    const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!fmMatch) return { frontmatter: {}, body: text };

    const fm: Frontmatter = {};
    const yamlBlock = fmMatch[1];
    const body = fmMatch[2];

    for (const line of yamlBlock.split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
      if (!kv) continue;
      const [, key, val] = kv;
      const trimmed = val.trim();

      if (key === 'tags') {
        // tags can be inline `[a, b]` or multi-line list (handle next lines)
        if (trimmed.startsWith('[')) {
          fm.tags = trimmed.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
        } else if (!trimmed) {
          fm.tags = [];
        } else {
          fm.tags = [trimmed];
        }
      } else {
        fm[key] = trimmed;
      }
    }

    // Handle Obsidian list-style tags: lines like `  - tagname`
    const tagListMatches = yamlBlock.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
    if (tagListMatches) {
      fm.tags = tagListMatches[1]
        .split('\n')
        .map(l => l.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean);
    }

    return { frontmatter: fm, body };
  }

  // ─── Notion property block (below title in non-frontmatter Notion exports) ───

  private stripNotionProperties(body: string): string {
    // Notion Markdown exports put key: value pairs right after the H1 title line
    // Strip them until the first blank line followed by content
    return body.replace(/^((?:[A-Z][A-Za-z ]+: .+\n)+)\n?/, '');
  }

  // ─── Helper: resolve title ───────────────────────────────────────────────────

  private resolveTitle(fm: Frontmatter, body: string, filename: string): string {
    if (fm.title) return String(fm.title);
    const h1 = body.match(/^#\s+(.+)$/m);
    if (h1) return h1[1].trim();
    return filename.replace(/\.(md|markdown)$/, '').replace(/[-_]/g, ' ');
  }

  // ─── Helper: resolve date ────────────────────────────────────────────────────

  private resolveDate(fm: Frontmatter): string | undefined {
    const raw = fm.date ?? fm.created ?? fm['created time'];
    if (!raw) return undefined;
    return this.normalizeDate(String(raw));
  }

  private normalizeDate(raw: string): string | undefined {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().slice(0, 10);
  }

  // ─── Helper: resolve tags ────────────────────────────────────────────────────

  private resolveTags(fm: Frontmatter): string[] {
    if (Array.isArray(fm.tags)) return fm.tags.map(String);
    return [];
  }

  // ─── Minimal Markdown → HTML ─────────────────────────────────────────────────

  private markdownToHtml(md: string): string {
    const lines = md.split('\n');
    const out: string[] = [];
    let inList = false;

    for (const raw of lines) {
      const line = raw.trimEnd();

      if (!line) {
        if (inList) { out.push('</ul>'); inList = false; }
        continue;
      }

      // Headings
      const hMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (hMatch) {
        if (inList) { out.push('</ul>'); inList = false; }
        const level = hMatch[1].length;
        out.push(`<h${level}>${this.inlineHtml(hMatch[2])}</h${level}>`);
        continue;
      }

      // Unordered list
      const liMatch = line.match(/^[-*+]\s+(.*)/);
      if (liMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${this.inlineHtml(liMatch[1])}</li>`);
        continue;
      }

      // Checkbox list (task list)
      const checkMatch = line.match(/^[-*+]\s+\[(x| )\]\s+(.*)/i);
      if (checkMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${this.inlineHtml(checkMatch[2])}</li>`);
        continue;
      }

      // Ordered list
      const olMatch = line.match(/^\d+\.\s+(.*)/);
      if (olMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${this.inlineHtml(olMatch[1])}</li>`);
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(`<blockquote><p>${this.inlineHtml(line.slice(2))}</p></blockquote>`);
        continue;
      }

      // Horizontal rule
      if (/^---+$|^===+$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false; }
        continue;
      }

      // Code block (skip for now — pass through as pre)
      if (line.startsWith('```')) continue;

      // Paragraph
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${this.inlineHtml(line)}</p>`);
    }

    if (inList) out.push('</ul>');
    return out.join('');
  }

  private inlineHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\[\[([^\]]+)\]\]/g, '$1'); // Obsidian wikilinks → plain text
  }

  private textPreview(html: string, maxLen: number): string {
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
  }

  // ─── CSV row parser (handles quoted fields) ──────────────────────────────────

  private parseCsvRow(line: string): string[] {
    const result: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    result.push(field);
    return result;
  }
}
