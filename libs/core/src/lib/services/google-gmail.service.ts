import { Injectable, inject, signal } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';
import { AiService } from './ai.service';
import { NotificationService } from './notification.service';
import { StoreService, TransactionStore } from './store.service';
import { MeetingsService, Meeting } from './meetings.service';
import { Person } from '@envello/domain';

export interface GmailSuggestion {
  id: string;
  kind: 'subscription' | 'task' | 'meeting' | 'contact';
  confidence: 'high' | 'medium';
  source: { subject: string; from: string; date: string };
  data: Record<string, any>; // typed per kind
  accepted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GoogleGmailService {
  private gAuth    = inject(GoogleAuthService);
  private ai       = inject(AiService);
  private notify   = inject(NotificationService);
  private store    = inject(StoreService);
  private txStore  = inject(TransactionStore);
  private meetings = inject(MeetingsService);

  readonly fetching    = signal(false);
  readonly suggestions = signal<GmailSuggestion[]>([]);
  readonly lastFetch   = signal<string | null>(null);

  async fetchSuggestions(): Promise<void> {
    if (this.fetching()) return;
    this.fetching.set(true);
    try {
      const emails = await this.fetchRecentEmails();
      if (emails.length === 0) {
        this.notify.add({ type: 'info', title: 'No new emails to parse', message: 'No recent Promotions or Updates emails found.', icon: 'mail' });
        return;
      }
      const parsed = await this.parseWithAi(emails);
      this.suggestions.set(parsed);
      this.lastFetch.set(new Date().toISOString());
      if (parsed.length > 0) {
        this.notify.add({
          type: 'info',
          title: `Gmail: ${parsed.length} suggestion${parsed.length !== 1 ? 's' : ''} found`,
          message: 'Review and import subscriptions, tasks and contacts.',
          icon: 'mail',
          link: '/settings',
        });
      }
    } catch (e: any) {
      this.notify.add({ type: 'error', title: 'Gmail scan failed', message: e?.message ?? String(e), icon: 'error' });
    } finally {
      this.fetching.set(false);
    }
  }

  accept(id: string): void {
    const suggestion = this.suggestions().find(s => s.id === id);
    if (!suggestion) return;
    this.importSuggestion(suggestion);
    this.suggestions.update(ss => ss.filter(s => s.id !== id));
  }

  dismiss(id: string): void {
    this.suggestions.update(ss => ss.filter(s => s.id !== id));
  }

  dismissAll(): void {
    this.suggestions.set([]);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async fetchRecentEmails(): Promise<{ subject: string; from: string; date: string; snippet: string }[]> {
    // Only fetch Promotions + Updates to avoid reading personal/sensitive emails
    const labels = ['CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES'];
    const query  = labels.map(l => `label:${l}`).join(' OR ');
    const params = new URLSearchParams({ q: query, maxResults: '50' });

    const listRes = await this.gAuth.get<{ messages?: { id: string }[] }>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`
    );
    const ids = (listRes.messages ?? []).map(m => m.id);
    if (ids.length === 0) return [];

    const emails = await Promise.allSettled(
      ids.map(id => this.fetchMessageMeta(id))
    );
    return emails
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
      .map(r => r.value);
  }

  private async fetchMessageMeta(id: string): Promise<{ subject: string; from: string; date: string; snippet: string } | null> {
    const params = new URLSearchParams({
      format: 'metadata',
      metadataHeaders: 'From',
      // 'metadataHeaders' only accepts one per key; pass multiple via repeated params
    });
    params.append('metadataHeaders', 'Subject');
    params.append('metadataHeaders', 'Date');

    const res = await this.gAuth.get<{
      snippet?: string;
      payload?: { headers?: { name: string; value: string }[] };
    }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${params}`);

    const header = (name: string) =>
      res.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

    return {
      subject: header('Subject'),
      from:    header('From'),
      date:    header('Date'),
      snippet: res.snippet ?? '',
    };
  }

  private async parseWithAi(
    emails: { subject: string; from: string; date: string; snippet: string }[]
  ): Promise<GmailSuggestion[]> {
    const emailText = emails
      .map((e, i) => `[${i + 1}]\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nSnippet: ${e.snippet}`)
      .join('\n\n---\n\n');

    const prompt = `You are an assistant that extracts structured data from email metadata.

Analyze these emails and identify any of the following:
1. **Subscriptions** - recurring billing emails (e.g. Netflix receipt, AWS bill, Spotify charge). Extract: name, amount (number), currency, billingCycle (monthly/yearly/weekly), date.
2. **Tasks** - action items or deadlines in the email (e.g. "Please review by Friday"). Extract: title, dueDate (ISO date if mentioned).
3. **Contacts** - new people the user should know about. Extract: name, email, company, role, phone (from signatures).
4. **Meetings** - booking confirmations, calendar invites (non-ICS). Extract: title, date (ISO), startTime (HH:MM), location or meetingLink.

Only include HIGH-confidence extractions (clear, unambiguous data). Skip ambiguous or personal emails.

Respond with a JSON array. Each item must have:
- "emailIndex": 1-based index of the source email
- "kind": "subscription" | "task" | "meeting" | "contact"
- "confidence": "high" | "medium"
- "data": object with extracted fields (snake_case keys)

Example:
[
  { "emailIndex": 1, "kind": "subscription", "confidence": "high", "data": { "name": "Netflix", "amount": 15.49, "currency": "USD", "billing_cycle": "monthly", "date": "2026-06-15" } },
  { "emailIndex": 3, "kind": "contact", "confidence": "medium", "data": { "name": "Sarah Chen", "email": "sarah@acme.com", "company": "Acme Corp", "role": "VP Sales" } }
]

If there is nothing to extract, respond with an empty array [].

Emails to analyze:
${emailText}`;

    let rawJson = '[]';
    try {
      rawJson = await this.ai.sendMessage(prompt);
      // Strip markdown code fences if present
      rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    } catch {
      return [];
    }

    let parsed: any[];
    try { parsed = JSON.parse(rawJson); } catch { return []; }
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item?.kind && item?.data)
      .map((item, i) => {
        const email = emails[(item.emailIndex ?? 1) - 1] ?? emails[0];
        return {
          id: `gmail-${Date.now()}-${i}`,
          kind: item.kind,
          confidence: item.confidence ?? 'medium',
          source: { subject: email.subject, from: email.from, date: email.date },
          data: item.data,
        };
      });
  }

  private importSuggestion(s: GmailSuggestion): void {
    try {
      switch (s.kind) {
        case 'subscription': {
          const d = s.data;
          this.txStore.add({
            id: `gmail-sub-${Date.now()}`,
            name: d['name'] ?? s.source.subject,
            type: 'recurring',
            amount: typeof d['amount'] === 'number' ? d['amount'] : parseFloat(d['amount']) || 0,
            currency: d['currency'] ?? 'USD',
            billingCycle: d['billing_cycle'] ?? 'monthly',
            date: d['date'] ?? new Date().toISOString().split('T')[0],
            status: 'active',
            createdAt: new Date().toISOString(),
          });
          break;
        }
        case 'task': {
          const d = s.data;
          this.store.addTask({
            id: `gmail-task-${Date.now()}`,
            title: d['title'] ?? s.source.subject,
            status: 'ACTIVE',
            priority: 'MEDIUM',
            hours: '0',
            due: d['due_date'] ?? undefined,
            labels: ['📧 gmail'],
          });
          break;
        }
        case 'meeting': {
          const d = s.data;
          this.meetings.addMeeting({
            title:       d['title'] ?? s.source.subject,
            date:        d['date']  ?? new Date().toISOString().split('T')[0],
            startTime:   d['start_time'] ?? '09:00',
            duration:    60,
            location:    d['location'] ?? undefined,
            meetingLink: d['meeting_link'] ?? undefined,
            meetingType: d['meeting_link'] ? 'video' : 'in-person',
            attendees:   [],
            status:      'scheduled',
            color:       '#4285F4',
            labels:      ['📧 gmail'],
            reminders:   [],
          });
          break;
        }
        case 'contact': {
          const d = s.data;
          const person: Person = {
            id:        `gmail-contact-${Date.now()}`,
            name:      d['name'] ?? '',
            email:     d['email'] ?? undefined,
            phone:     d['phone'] ?? undefined,
            company:   d['company'] ?? undefined,
            role:      d['role'] ?? undefined,
            tags:      ['📧 gmail'],
            createdAt: new Date().toISOString(),
          };
          if (person.name) this.store.addPerson(person);
          break;
        }
      }
      this.notify.add({ type: 'success', title: 'Imported', message: `${s.kind}: ${s.data['name'] ?? s.data['title'] ?? s.source.subject}`, icon: 'check_circle' });
    } catch (e: any) {
      this.notify.add({ type: 'error', title: 'Import failed', message: e?.message ?? String(e), icon: 'error' });
    }
  }
}
