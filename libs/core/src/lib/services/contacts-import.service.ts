import { Injectable, inject } from '@angular/core';
import { TauriService } from './tauri.service';
import { Person } from '@envello/domain';

export interface ImportedContact {
  name: string;
  email?: string;
  company?: string;
  role?: string;
  phone?: string;
}

export interface ImportPreview {
  contacts: ImportedContact[];
  source: 'vcf' | 'csv';
  fileName: string;
  duplicates: number; // names already in people list
}

@Injectable({ providedIn: 'root' })
export class ContactsImportService {
  private tauri = inject(TauriService);

  /**
   * Open a native file picker (Tauri) or <input type="file"> (web)
   * and parse the selected .vcf or .csv file.
   */
  async pickAndParse(): Promise<ImportPreview | null> {
    if (this.tauri.isTauri()) {
      return this.pickTauri();
    }
    return this.pickWeb();
  }

  /** Convert ImportedContacts to Person objects ready for the store. */
  toPersons(contacts: ImportedContact[], existingNames: Set<string>): Person[] {
    const now = new Date().toISOString();
    return contacts
      .filter(c => c.name.trim() && !existingNames.has(c.name.toLowerCase()))
      .map(c => ({
        id: `person-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: c.name.trim(),
        email: c.email || undefined,
        phone: c.phone || undefined,
        company: c.company || undefined,
        role: c.role || undefined,
        tags: ['imported'],
        createdAt: now,
      }));
  }

  // ─── Tauri path ────────────────────────────────────────────────────────────

  private async pickTauri(): Promise<ImportPreview | null> {
    const result = await this.tauri.openFile({
      multiple: false,
      filters: [
        { name: 'Contacts', extensions: ['vcf', 'csv'] },
        { name: 'vCard', extensions: ['vcf'] },
        { name: 'CSV', extensions: ['csv'] },
      ],
    });

    const filePath = Array.isArray(result) ? result[0] : result;
    if (!filePath) return null;

    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const text = await readTextFile(filePath);
    const fileName = filePath.split('/').pop() ?? filePath;
    const ext = fileName.split('.').pop()?.toLowerCase();

    return {
      contacts: ext === 'vcf' ? this.parseVcf(text) : this.parseCsv(text),
      source: ext === 'vcf' ? 'vcf' : 'csv',
      fileName,
      duplicates: 0,
    };
  }

  // ─── Web path (hidden <input type="file">) ─────────────────────────────────

  private pickWeb(): Promise<ImportPreview | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.vcf,.csv';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const text = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase();
        resolve({
          contacts: ext === 'vcf' ? this.parseVcf(text) : this.parseCsv(text),
          source: ext === 'vcf' ? 'vcf' : 'csv',
          fileName: file.name,
          duplicates: 0,
        });
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // ─── vCard parser ──────────────────────────────────────────────────────────
  // Handles vCard 2.1, 3.0, 4.0 exported from Google, Apple, Outlook.

  private parseVcf(text: string): ImportedContact[] {
    const contacts: ImportedContact[] = [];
    // Split into individual vCards
    const cards = text.split(/BEGIN:VCARD/i).filter(s => s.trim());

    for (const card of cards) {
      const lines = this.unfoldVcf(card);
      const get = (prefix: RegExp) => {
        const line = lines.find(l => prefix.test(l));
        if (!line) return '';
        return line.replace(/^[^:]*:/, '').trim();
      };

      // FN (formatted name) — most reliable
      let name = get(/^FN[;:]/i);

      // Fallback: N field (Last;First;Middle;...)
      if (!name) {
        const n = get(/^N[;:]/i);
        if (n) {
          const parts = n.split(';').map(s => s.trim()).filter(Boolean);
          // N is: Last;First;Middle;Prefix;Suffix
          name = parts.length >= 2 ? `${parts[1]} ${parts[0]}`.trim() : parts[0];
        }
      }

      if (!name) continue;

      // Email — prefer PREF, then first found
      const emailLines = lines.filter(l => /^EMAIL/i.test(l));
      const prefEmail = emailLines.find(l => /PREF/i.test(l)) ?? emailLines[0];
      const email = prefEmail ? prefEmail.replace(/^[^:]*:/, '').trim() : undefined;

      // ORG
      const orgRaw = get(/^ORG[;:]/i);
      const company = orgRaw.split(';')[0].trim() || undefined;

      // TITLE
      const role = get(/^TITLE[;:]/i) || undefined;

      // TEL (for display in preview only)
      const telLine = lines.find(l => /^TEL/i.test(l));
      const phone = telLine ? telLine.replace(/^[^:]*:/, '').trim() : undefined;

      contacts.push({ name, email: email || undefined, company, role, phone });
    }

    return contacts.filter(c => c.name);
  }

  /** Unfold vCard line continuations (CRLF + whitespace = continuation). */
  private unfoldVcf(text: string): string[] {
    return text
      .replace(/\r\n[ \t]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n[ \t]/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  }

  // ─── CSV parser ────────────────────────────────────────────────────────────
  // Handles Google Contacts CSV, Outlook CSV, and generic Name/Email/Company/Title.

  private parseCsv(text: string): ImportedContact[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = this.splitCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));

    // Column index resolvers — handle different app export formats
    const col = (candidates: string[]) =>
      candidates.map(c => headers.indexOf(c)).find(i => i >= 0) ?? -1;

    const nameIdx    = col(['name', 'full name', 'display name', 'contact name']);
    const firstIdx   = col(['first name', 'given name', 'firstname']);
    const lastIdx    = col(['last name', 'family name', 'surname', 'lastname']);
    const emailIdx   = col(['e-mail address', 'email address', 'email 1 - value', 'email', 'e-mail 1 - value', 'primary email']);
    const companyIdx = col(['company', 'organization 1 - name', 'organization', 'org', 'employer']);
    const titleIdx   = col(['job title', 'title', 'position', 'role', 'organization 1 - title']);
    const phoneIdx   = col(['phone', 'mobile phone', 'home phone', 'phone 1 - value', 'primary phone']);

    const contacts: ImportedContact[] = [];

    for (const line of lines.slice(1)) {
      const cells = this.splitCsvLine(line).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cells.every(c => !c)) continue;

      const cell = (i: number) => (i >= 0 ? cells[i] ?? '' : '');

      let name = cell(nameIdx);
      if (!name && firstIdx >= 0) {
        name = `${cell(firstIdx)} ${cell(lastIdx)}`.trim();
      }
      if (!name) continue;

      contacts.push({
        name,
        email: cell(emailIdx) || undefined,
        company: cell(companyIdx) || undefined,
        role: cell(titleIdx) || undefined,
        phone: cell(phoneIdx) || undefined,
      });
    }

    return contacts;
  }

  /** Minimal CSV line splitter that handles quoted fields containing commas. */
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
}
