import { Injectable, inject, signal } from '@angular/core';
import { MeetingsService, Meeting, MEETING_COLORS } from './meetings.service';

export interface CalendarConnection {
  id: string;
  provider: 'google' | 'outlook' | 'apple' | 'zoom' | 'teams' | 'custom';
  name: string;
  icsUrl: string;
  color: string;
  enabled: boolean;
  lastSync?: string;
  lastSyncCount?: number;
  error?: string;
}

const STORAGE_KEY = 'envello-calendar-connections';

export const PROVIDER_META: Record<CalendarConnection['provider'], {
  label: string;
  icon: string;
  color: string;
  helpText: string;
  placeholder: string;
}> = {
  google: {
    label: 'Google Calendar',
    icon: 'event',
    color: '#4285F4',
    helpText: 'Open Google Calendar → Settings ⚙ → select a calendar → "Integrate calendar" → copy the "Secret address in iCal format" URL.',
    placeholder: 'https://calendar.google.com/calendar/ical/…/basic.ics',
  },
  outlook: {
    label: 'Outlook / Teams',
    icon: 'calendar_today',
    color: '#0078D4',
    helpText: 'In Outlook Web → Calendar → ⚙ Settings → View all Outlook settings → Calendar → Shared calendars → "Publish a calendar" → copy the ICS link.',
    placeholder: 'https://outlook.live.com/owa/calendar/…/calendar.ics',
  },
  apple: {
    label: 'Apple Calendar',
    icon: 'today',
    color: '#555555',
    helpText: 'In iCloud.com → Calendar → share icon on a calendar → "Public Calendar" → copy the webcal:// URL and replace "webcal://" with "https://".',
    placeholder: 'https://p-caldav.icloud.com/published/…',
  },
  zoom: {
    label: 'Zoom',
    icon: 'video_call',
    color: '#2D8CFF',
    helpText: 'In Zoom → Settings → Calendar & Contacts → Connect to Calendar → export meetings as ICS, or use a calendar that syncs with Zoom.',
    placeholder: 'https://…',
  },
  teams: {
    label: 'Microsoft Teams',
    icon: 'groups',
    color: '#6264A7',
    helpText: 'Teams meetings appear in your Outlook/Office 365 calendar. Use the Outlook ICS export URL above to import Teams meetings.',
    placeholder: 'https://outlook.office365.com/owa/calendar/…/calendar.ics',
  },
  custom: {
    label: 'Other (ICS URL)',
    icon: 'link',
    color: '#10B981',
    helpText: 'Paste any publicly accessible iCal/ICS feed URL. Most calendar applications support publishing a calendar as an ICS URL.',
    placeholder: 'https://…/calendar.ics',
  },
};

@Injectable({ providedIn: 'root' })
export class CalendarSyncService {
  private meetingsService = inject(MeetingsService);

  connections = signal<CalendarConnection[]>(this.loadConnections());
  syncing = signal<Set<string>>(new Set());

  // ─── Connection management ───────────────────────────────────────

  addConnection(partial: Omit<CalendarConnection, 'id' | 'color'>): CalendarConnection {
    const conn: CalendarConnection = {
      ...partial,
      id: Date.now().toString(),
      color: PROVIDER_META[partial.provider].color,
    };
    this.connections.update(cs => [...cs, conn]);
    this.saveConnections();
    return conn;
  }

  removeConnection(id: string): void {
    this.connections.update(cs => cs.filter(c => c.id !== id));
    this.saveConnections();
  }

  toggleEnabled(id: string): void {
    this.connections.update(cs =>
      cs.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
    this.saveConnections();
  }

  // ─── Sync ────────────────────────────────────────────────────────

  async syncAll(): Promise<void> {
    await Promise.allSettled(
      this.connections().filter(c => c.enabled).map(c => this.syncConnection(c.id))
    );
  }

  async syncConnection(id: string): Promise<void> {
    const conn = this.connections().find(c => c.id === id);
    if (!conn) return;

    this.syncing.update(s => new Set([...s, id]));

    try {
      const events = await this.fetchAndParse(conn.icsUrl);
      let imported = 0;

      for (const ev of events) {
        const alreadyExists = ev.externalId &&
          this.meetingsService.meetings().some(m => m.externalId === ev.externalId);
        if (!alreadyExists) {
          this.meetingsService.addMeeting({ ...ev, color: conn.color, externalSource: conn.provider });
          imported++;
        }
      }

      this.connections.update(cs => cs.map(c => c.id === id
        ? { ...c, lastSync: new Date().toISOString(), lastSyncCount: imported, error: undefined }
        : c
      ));
    } catch (err: any) {
      this.connections.update(cs => cs.map(c => c.id === id
        ? { ...c, lastSync: new Date().toISOString(), error: String(err?.message ?? 'Sync failed') }
        : c
      ));
    } finally {
      this.syncing.update(s => { const ns = new Set(s); ns.delete(id); return ns; });
      this.saveConnections();
    }
  }

  isSyncing(id: string): boolean {
    return this.syncing().has(id);
  }

  // ─── ICS fetch ───────────────────────────────────────────────────

  /** On desktop uses tauri-plugin-http (bypasses CORS). On web uses browser fetch. */
  private async fetchICS(url: string): Promise<string> {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      // Tauri's native HTTP client makes a real network request, bypassing
      // the WebView's CORS enforcement — required for Google Calendar ICS URLs.
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const res = await tauriFetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.text();
    }
    // Web: standard fetch — only works if the URL allows cross-origin requests.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.text();
  }

  // ─── ICS fetch + parse ───────────────────────────────────────────

  private async fetchAndParse(url: string): Promise<Array<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>>> {
    let text: string;
    try {
      text = await this.fetchICS(url);
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError' || err?.message?.includes('CORS')) {
        throw new Error('Could not reach the calendar URL. On web, the calendar feed must be publicly accessible (no CORS restriction). On desktop, this should work — if it doesn\'t, check that the URL is correct.');
      }
      throw err;
    }

    if (!text.includes('BEGIN:VCALENDAR')) {
      throw new Error('The URL did not return a valid iCal feed.');
    }

    return this.parseICS(text);
  }

  private parseICS(icsText: string): Array<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>> {
    // Unfold continuation lines (RFC 5545 §3.1)
    const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);

    const meetings: Array<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>> = [];
    let inEvent = false;
    let ev: Record<string, string> = {};

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') { inEvent = true; ev = {}; continue; }
      if (line === 'END:VEVENT') {
        inEvent = false;
        const m = this.veventToMeeting(ev);
        if (m) meetings.push(m);
        continue;
      }
      if (!inEvent) continue;

      // Handle property parameters like DTSTART;TZID=America/New_York:20260510T090000
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const propName = line.substring(0, colonIdx).split(';')[0].toUpperCase();
      const propValue = line.substring(colonIdx + 1);
      ev[propName] = propValue;
    }

    return meetings;
  }

  private veventToMeeting(ev: Record<string, string>): Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> | null {
    const summary = ev['SUMMARY'];
    if (!summary) return null;

    const dtStart = ev['DTSTART'];
    if (!dtStart) return null;

    const startDate = this.parseICSDate(dtStart);
    if (!startDate) return null;

    const endDate = ev['DTEND'] ? this.parseICSDate(ev['DTEND']) : null;
    const duration = endDate
      ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
      : 60;

    const location = this.unescapeICS(ev['LOCATION'] ?? '');
    const description = this.unescapeICS(ev['DESCRIPTION'] ?? '');
    const combined = location + ' ' + description;

    const isVideo = /zoom\.us|teams\.(microsoft|live)|meet\.google|webex|gotomeet|whereby|bluejeans/i.test(combined);
    const meetingLink = this.extractUrl(combined) ?? (isVideo ? location : undefined);
    const platform = this.detectPlatform(combined);

    const status = ev['STATUS'] === 'CANCELLED' ? 'cancelled' : 'scheduled';

    // Parse attendees
    const attendees: Meeting['attendees'] = [];
    if (ev['ATTENDEE']) {
      const parts = ev['ATTENDEE'].split(',');
      parts.forEach((p, i) => {
        const emailMatch = p.match(/mailto:(.+)/i);
        if (emailMatch) {
          attendees.push({
            id: `ext-${i}`,
            name: emailMatch[1].split('@')[0],
            email: emailMatch[1],
            status: 'pending',
          });
        }
      });
    }

    return {
      title: this.unescapeICS(summary),
      description,
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().substring(0, 5),
      endTime: endDate ? endDate.toTimeString().substring(0, 5) : undefined,
      duration,
      location: location || undefined,
      meetingLink,
      meetingType: isVideo ? 'video' : (location ? 'in-person' : 'video'),
      platform,
      attendees,
      status,
      color: MEETING_COLORS[0],
      externalId: ev['UID'] ?? undefined,
      labels: [],
      reminders: [],
    };
  }

  private parseICSDate(dtStr: string): Date | null {
    try {
      // Remove timezone suffix — treat as local
      const clean = dtStr.replace(/Z$/, '').replace(/[^0-9T]/g, c => c === 'T' ? 'T' : '');
      if (clean.length === 8) {
        // All-day: YYYYMMDD
        return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`);
      }
      // YYYYMMDDTHHMMSS
      const d = clean.substring(0, 8);
      const t = clean.substring(9);
      return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}`);
    } catch { return null; }
  }

  private unescapeICS(s: string): string {
    return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
  }

  private extractUrl(text: string): string | undefined {
    const match = text.match(/https?:\/\/[^\s\\<>"]+/);
    return match?.[0];
  }

  private detectPlatform(text: string): Meeting['platform'] | undefined {
    if (/zoom\.us/i.test(text)) return 'zoom';
    if (/teams\.(microsoft|live)|teams\.microsoft/i.test(text)) return 'teams';
    if (/meet\.google/i.test(text)) return 'meet';
    if (/discord/i.test(text)) return 'discord';
    return undefined;
  }

  // ─── Persistence ─────────────────────────────────────────────────

  private loadConnections(): CalendarConnection[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveConnections(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.connections()));
    } catch {}
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  formatLastSync(conn: CalendarConnection): string {
    if (!conn.lastSync) return 'Never synced';
    const diff = Date.now() - new Date(conn.lastSync).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
