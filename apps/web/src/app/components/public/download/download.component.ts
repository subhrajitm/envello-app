import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EnvLogoComponent } from '../../../shared/ui/logo/logo.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
    selector: 'app-download',
    standalone: true,
    imports: [CommonModule, RouterModule, EnvLogoComponent, ButtonComponent],
    template: `
    <div class="download-page">
      <div class="header">
        <a routerLink="/" class="logo-link">
          <env-logo height="32px"></env-logo>
        </a>
      </div>
      
      <div class="content">
        <h1>Download Envello</h1>
        <p class="subtitle">Get the native experience on your desktop.</p>
        
        <div class="platforms">
          <div class="platform-card">
            <span class="material-symbols-outlined icon">laptop_mac</span>
            <h3>macOS</h3>
            <p>Universal (Apple Silicon & Intel)</p>
            <env-button variant="primary" icon="download">Download for Mac</env-button>
          </div>
          
          <div class="platform-card disabled">
            <span class="material-symbols-outlined icon">window</span>
            <h3>Windows</h3>
            <p>Coming Soon</p>
            <env-button variant="secondary" [disabled]="true">Notify Me</env-button>
          </div>
          
          <div class="platform-card disabled">
            <span class="material-symbols-outlined icon">terminal</span>
            <h3>Linux</h3>
            <p>Coming Soon</p>
            <env-button variant="secondary" [disabled]="true">Notify Me</env-button>
          </div>
        </div>
      </div>
    </div>
    `,
    styles: [`
      .download-page {
        min-height: 100vh;
        background: var(--bg-app);
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .header {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-bottom: 60px;
      }
      
      .logo-link {
        color: var(--text-primary);
        text-decoration: none;
      }
      
      .content {
        text-align: center;
        max-width: 900px;
        width: 100%;
      }
      
      h1 {
        font-size: 36px;
        font-weight: 700;
        margin-bottom: 12px;
        color: var(--text-primary);
      }
      
      .subtitle {
        font-size: 18px;
        color: var(--text-tertiary);
        margin-bottom: 48px;
      }
      
      .platforms {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
      }
      
      .platform-card {
        background: var(--bg-panel);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 32px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        transition: transform 0.2s;
      }
      
      .platform-card:not(.disabled):hover {
        transform: translateY(-4px);
        border-color: var(--accent-primary);
      }
      
      .platform-card.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .icon {
        font-size: 48px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      
      h3 {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      p {
        color: var(--text-tertiary);
        margin-bottom: 8px;
        font-size: 14px;
      }
    `]
})
export class DownloadComponent { }
