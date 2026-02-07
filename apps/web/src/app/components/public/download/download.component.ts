import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EnvLogoComponent } from '../../../shared/ui/logo/logo.component';

interface DownloadLink {
    label: string;
    arch: string;
    url: string;
}

interface OsSection {
    name: string;
    icon: string;
    links: DownloadLink[];
}

interface Release {
    version: string;
    date: string;
    isLatest: boolean;
    releaseNotes: string[];
    platforms: OsSection[];
}

@Component({
    selector: 'app-download',
    standalone: true,
    imports: [CommonModule, RouterModule, EnvLogoComponent],
    templateUrl: './download.component.html',
    styleUrl: './download.component.css'
})
export class DownloadComponent {
    expandedVersion = signal<string>('0.1.0');

    releases: Release[] = [
        {
            version: '0.1.0',
            date: '2026-01-29',
            isLatest: true,
            releaseNotes: [
                'Enterprise foundation with environment configuration',
                'Lazy-loaded routes for all feature areas',
                'Global error handler and logging service',
                'Auth service and HTTP interceptors',
                'GitHub Actions CI/CD workflow'
            ],
            platforms: [
                {
                    name: 'macOS',
                    icon: '',
                    links: [
                        { label: 'Mac (ARM64)', arch: 'arm64', url: '#' },
                        { label: 'Mac (x64)', arch: 'x64', url: '#' },
                        { label: 'Mac Universal', arch: 'universal', url: '#' }
                    ]
                },
                {
                    name: 'Windows',
                    icon: 'grid_view',
                    links: [
                        { label: 'Windows (x64) (System)', arch: 'x64-system', url: '#' },
                        { label: 'Windows (x64) (User)', arch: 'x64-user', url: '#' },
                        { label: 'Windows (ARM64) (System)', arch: 'arm64-system', url: '#' },
                        { label: 'Windows (ARM64) (User)', arch: 'arm64-user', url: '#' }
                    ]
                },
                {
                    name: 'Linux',
                    icon: 'terminal',
                    links: [
                        { label: 'Linux .deb (ARM64)', arch: 'deb-arm64', url: '#' },
                        { label: 'Linux .deb (x64)', arch: 'deb-x64', url: '#' },
                        { label: 'Linux RPM (ARM64)', arch: 'rpm-arm64', url: '#' },
                        { label: 'Linux RPM (x64)', arch: 'rpm-x64', url: '#' },
                        { label: 'Linux AppImage (ARM64)', arch: 'appimage-arm64', url: '#' },
                        { label: 'Linux AppImage (x64)', arch: 'appimage-x64', url: '#' }
                    ]
                }
            ]
        }
    ];

    toggleVersion(version: string) {
        if (this.expandedVersion() === version) {
            this.expandedVersion.set('');
        } else {
            this.expandedVersion.set(version);
        }
    }

    isExpanded(version: string): boolean {
        return this.expandedVersion() === version;
    }
}
