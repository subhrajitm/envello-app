import { Component, OnInit, inject, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VaultUnlockService } from '@envello/core';

@Component({
  selector: 'app-vault-unlock',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: flex;
      flex: 1 1 0;
      align-items: center;
      justify-content: center;
      background: var(--bg-app);
    }
    .vu-card {
      width: 360px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .vu-icon {
      font-size: 32px;
      color: var(--accent-primary);
      text-align: center;
    }
    .vu-title {
      font-size: 17px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: center;
      margin: 0;
    }
    .vu-sub {
      font-size: 12.5px;
      color: var(--text-secondary);
      text-align: center;
      margin: -12px 0 0;
      line-height: 1.5;
    }
    .vu-fields { display: flex; flex-direction: column; gap: 10px; }
    .vu-input {
      width: 100%;
      padding: 9px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border-default);
      border-radius: 7px;
      color: var(--text-primary);
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .vu-input:focus { border-color: var(--accent-primary); }
    .vu-input.error { border-color: #ef4444; }
    .vu-btn {
      width: 100%;
      padding: 10px;
      background: var(--accent-primary);
      color: #fff;
      border: none;
      border-radius: 7px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .vu-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .vu-error {
      font-size: 12px;
      color: #ef4444;
      text-align: center;
    }
    .vu-hint {
      font-size: 11px;
      color: var(--text-tertiary);
      text-align: center;
      line-height: 1.5;
    }
  `],
  template: `
    <div class="vu-card">
      <span class="material-symbols-outlined vu-icon">lock</span>

      @if (mode() === 'loading') {
        <p class="vu-title">Vault</p>
        <p class="vu-sub">Checking…</p>
      }

      @if (mode() === 'setup') {
        <p class="vu-title">Set a master password</p>
        <p class="vu-sub">This password protects your vault on web. It is never sent to the server — only a hash is stored.</p>
        <div class="vu-fields">
          <input class="vu-input" type="password" placeholder="Master password"
            [(ngModel)]="password" (keydown.enter)="submit()" />
          <input class="vu-input" [class.error]="mismatch()" type="password" placeholder="Confirm password"
            [(ngModel)]="confirm" (keydown.enter)="submit()" />
        </div>
        @if (mismatch()) { <p class="vu-error">Passwords do not match.</p> }
        @if (errorMsg()) { <p class="vu-error">{{ errorMsg() }}</p> }
        <button class="vu-btn" [disabled]="busy() || !password || !confirm" (click)="submit()">
          {{ busy() ? 'Setting up…' : 'Set password' }}
        </button>
        <p class="vu-hint">Choose a strong password. There is no recovery option — if lost, credentials must be re-entered.</p>
      }

      @if (mode() === 'unlock') {
        <p class="vu-title">Vault locked</p>
        <p class="vu-sub">Enter your master password to access your credentials.</p>
        <div class="vu-fields">
          <input class="vu-input" [class.error]="wrongPassword()" type="password" placeholder="Master password"
            [(ngModel)]="password" (keydown.enter)="submit()" />
        </div>
        @if (wrongPassword()) { <p class="vu-error">Incorrect password.</p> }
        @if (errorMsg()) { <p class="vu-error">{{ errorMsg() }}</p> }
        <button class="vu-btn" [disabled]="busy() || !password" (click)="submit()">
          {{ busy() ? 'Unlocking…' : 'Unlock vault' }}
        </button>
      }
    </div>
  `,
})
export class VaultUnlockComponent implements OnInit {
  private readonly vaultUnlock = inject(VaultUnlockService);

  readonly unlocked = output<void>();

  mode          = signal<'loading' | 'setup' | 'unlock'>('loading');
  password      = '';
  confirm       = '';
  busy          = signal(false);
  mismatch      = signal(false);
  wrongPassword = signal(false);
  errorMsg      = signal('');

  async ngOnInit() {
    const has = await this.vaultUnlock.hasPassword();
    this.mode.set(has ? 'unlock' : 'setup');
  }

  async submit() {
    if (this.busy()) return;
    this.mismatch.set(false);
    this.wrongPassword.set(false);
    this.errorMsg.set('');
    this.busy.set(true);
    try {
      if (this.mode() === 'setup') {
        if (this.password !== this.confirm) { this.mismatch.set(true); return; }
        await this.vaultUnlock.setup(this.password);
        this.unlocked.emit();
      } else {
        const ok = await this.vaultUnlock.unlock(this.password);
        if (ok) this.unlocked.emit();
        else this.wrongPassword.set(true);
      }
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Something went wrong.');
    } finally {
      this.busy.set(false);
      this.password = '';
      this.confirm = '';
    }
  }
}
