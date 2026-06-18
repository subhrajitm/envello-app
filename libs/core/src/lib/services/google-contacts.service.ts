import { Injectable, inject, signal } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';
import { StoreService } from './store.service';
import { NotificationService } from './notification.service';
import { Person } from '@envello/domain';

interface GPersonName    { displayName?: string; givenName?: string; familyName?: string }
interface GEmailAddress  { value?: string; type?: string; metadata?: { primary?: boolean } }
interface GPhoneNumber   { value?: string; type?: string; metadata?: { primary?: boolean } }
interface GOrganization  { name?: string; title?: string }

interface GPerson {
  resourceName: string;
  names?:         GPersonName[];
  emailAddresses?: GEmailAddress[];
  phoneNumbers?:  GPhoneNumber[];
  organizations?: GOrganization[];
  photos?:        { url?: string }[];
}

@Injectable({ providedIn: 'root' })
export class GoogleContactsService {
  private gAuth  = inject(GoogleAuthService);
  private store  = inject(StoreService);
  private notify = inject(NotificationService);

  readonly syncing  = signal(false);
  readonly lastSync = signal<string | null>(null);

  async sync(): Promise<{ imported: number; skipped: number }> {
    if (this.syncing()) return { imported: 0, skipped: 0 };
    this.syncing.set(true);
    try {
      const people = await this.fetchAll();
      let imported = 0;
      let skipped  = 0;

      const existing = this.store.people();
      const knownEmails = new Set(existing.map(p => p.email?.toLowerCase()).filter(Boolean));
      const knownNames  = new Set(existing.map(p => p.name.toLowerCase()));

      for (const gp of people) {
        const person = this.gPersonToPerson(gp);
        if (!person) continue;

        // Deduplicate by email first, then name
        const emailKey = person.email?.toLowerCase();
        if (emailKey && knownEmails.has(emailKey)) { skipped++; continue; }
        if (!emailKey && knownNames.has(person.name.toLowerCase())) { skipped++; continue; }

        this.store.addPerson(person);
        if (emailKey) knownEmails.add(emailKey);
        knownNames.add(person.name.toLowerCase());
        imported++;
      }

      this.lastSync.set(new Date().toISOString());
      if (imported > 0) {
        this.notify.add({
          type: 'success',
          title: 'Google Contacts synced',
          message: `${imported} contact${imported !== 1 ? 's' : ''} imported${skipped ? `, ${skipped} already up to date` : ''}`,
          icon: 'contacts',
        });
      }
      return { imported, skipped };
    } catch (e: any) {
      this.notify.add({ type: 'error', title: 'Contacts sync failed', message: e?.message ?? String(e), icon: 'error' });
      return { imported: 0, skipped: 0 };
    } finally {
      this.syncing.set(false);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async fetchAll(): Promise<GPerson[]> {
    const people: GPerson[] = [];
    let pageToken: string | undefined;

    const fields = 'names,emailAddresses,phoneNumbers,organizations,photos';

    do {
      const params = new URLSearchParams({
        personFields: fields,
        pageSize: '1000',
        ...(pageToken ? { pageToken } : {}),
      });
      const res = await this.gAuth.get<{ connections?: GPerson[]; nextPageToken?: string }>(
        `https://people.googleapis.com/v1/people/me/connections?${params}`
      );
      if (res.connections) people.push(...res.connections);
      pageToken = res.nextPageToken;
    } while (pageToken);

    return people;
  }

  private gPersonToPerson(gp: GPerson): Person | null {
    const nameEntry = gp.names?.[0];
    const name = nameEntry?.displayName
      ?? [nameEntry?.givenName, nameEntry?.familyName].filter(Boolean).join(' ')
      ?? '';
    if (!name.trim()) return null;

    const primaryEmail = gp.emailAddresses?.find(e => e.metadata?.primary)
      ?? gp.emailAddresses?.[0];
    const primaryPhone = gp.phoneNumbers?.find(p => p.metadata?.primary)
      ?? gp.phoneNumbers?.[0];
    const org = gp.organizations?.[0];

    return {
      id:        `google-${gp.resourceName.replace('people/', '')}`,
      name:      name.trim(),
      email:     primaryEmail?.value || undefined,
      phone:     primaryPhone?.value || undefined,
      company:   org?.name || undefined,
      role:      org?.title || undefined,
      avatar:    gp.photos?.[0]?.url || undefined,
      tags:      ['google-contacts'],
      createdAt: new Date().toISOString(),
    };
  }
}
