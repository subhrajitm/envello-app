import { Injectable, inject, signal } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';
import { MeetingsService, Meeting } from './meetings.service';
import { NotificationService } from './notification.service';

interface GCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

interface GEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
  status?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  organizer?: { email: string; displayName?: string };
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private gAuth    = inject(GoogleAuthService);
  private meetings = inject(MeetingsService);
  private notify   = inject(NotificationService);

  readonly syncing = signal(false);
  readonly lastSync = signal<string | null>(null);

  async sync(): Promise<{ imported: number; skipped: number }> {
    if (this.syncing()) return { imported: 0, skipped: 0 };
    this.syncing.set(true);
    try {
      const calendars = await this.fetchCalendars();
      let imported = 0;
      let skipped = 0;

      // Sync 3 months back + 6 months ahead
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 3);
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 6);

      for (const cal of calendars) {
        const events = await this.fetchEvents(cal.id, timeMin.toISOString(), timeMax.toISOString());
        for (const ev of events) {
          const exists = this.meetings.meetings().some(m => m.externalId === ev.id);
          if (exists) { skipped++; continue; }
          const meeting = this.gEventToMeeting(ev, cal);
          if (meeting) { this.meetings.addMeeting(meeting); imported++; }
        }
      }

      this.lastSync.set(new Date().toISOString());
      if (imported > 0) {
        this.notify.add({
          type: 'success',
          title: `Google Calendar synced`,
          message: `${imported} event${imported !== 1 ? 's' : ''} imported${skipped ? `, ${skipped} already up to date` : ''}`,
          icon: 'calendar_month',
        });
      }
      return { imported, skipped };
    } catch (e: any) {
      this.notify.add({ type: 'error', title: 'Calendar sync failed', message: e?.message ?? String(e), icon: 'error' });
      return { imported: 0, skipped: 0 };
    } finally {
      this.syncing.set(false);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async fetchCalendars(): Promise<GCalendarListEntry[]> {
    const res = await this.gAuth.get<{ items: GCalendarListEntry[] }>(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader'
    );
    return res.items ?? [];
  }

  private async fetchEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
    const params = new URLSearchParams({
      timeMin, timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '500',
    });
    const res = await this.gAuth.get<{ items: GEvent[] }>(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    );
    return res.items ?? [];
  }

  private gEventToMeeting(ev: GEvent, cal: GCalendarListEntry): Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> | null {
    if (!ev.summary) return null;

    const startStr = ev.start.dateTime ?? ev.start.date ?? '';
    const endStr   = ev.end.dateTime   ?? ev.end.date   ?? '';
    if (!startStr) return null;

    const start = new Date(startStr);
    const end   = endStr ? new Date(endStr) : null;
    const duration = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : 60;

    // Video link: hangoutLink → conferenceData entry → location URL
    const meetLink = ev.hangoutLink
      ?? ev.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri
      ?? (ev.location && /https?:\/\//i.test(ev.location) ? ev.location : undefined);

    const isVideo = !!meetLink || /zoom\.us|teams\.(microsoft|live)|meet\.google|webex/i.test(
      (ev.location ?? '') + ' ' + (ev.description ?? '')
    );

    const platform: Meeting['platform'] = ev.hangoutLink || /meet\.google/i.test(meetLink ?? '')
      ? 'meet'
      : /zoom\.us/i.test(meetLink ?? '') ? 'zoom'
      : /teams\.(microsoft|live)/i.test(meetLink ?? '') ? 'teams'
      : undefined;

    const attendees: Meeting['attendees'] = (ev.attendees ?? []).map((a, i) => ({
      id: `gatt-${i}`,
      name: a.displayName ?? a.email.split('@')[0],
      email: a.email,
      status: a.responseStatus === 'accepted' ? 'accepted'
            : a.responseStatus === 'declined' ? 'declined'
            : 'pending',
    }));

    return {
      title:       ev.summary,
      description: ev.description ?? undefined,
      date:        start.toISOString().split('T')[0],
      startTime:   start.toTimeString().substring(0, 5),
      endTime:     end ? end.toTimeString().substring(0, 5) : undefined,
      duration,
      location:    ev.location && !/https?:\/\//i.test(ev.location) ? ev.location : undefined,
      meetingLink: meetLink,
      meetingType: isVideo ? 'video' : (ev.location ? 'in-person' : 'video'),
      platform,
      attendees,
      status:      ev.status === 'cancelled' ? 'cancelled' : 'scheduled',
      color:       cal.backgroundColor ?? '#4285F4',
      externalId:  ev.id,
      externalSource: 'google',
      labels: [],
      reminders: [],
    };
  }
}
