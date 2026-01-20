import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Session {
  id: string;
  title: string;
  lastEdit: string;
  aiCount: number;
  active: boolean;
  statusColor?: string;
}

@Component({
  selector: 'app-brainstorming',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brainstorming.component.html',
  styleUrl: './brainstorming.component.css'
})
export class BrainstormingComponent {
  sessions = signal<Session[]>([
    { id: '1', title: 'Q4 Project "Phoenix"', lastEdit: '2m ago', aiCount: 142, active: false, statusColor: '#4ade80' },
    { id: '2', title: 'Global Market Pivot', lastEdit: 'Active', aiCount: 843, active: true, statusColor: '#fcd34d' },
    { id: '3', title: 'SaaS Pricing Model', lastEdit: '1h ago', aiCount: 24, active: false, statusColor: '#9ca3af' },
    { id: '4', title: 'Core Infra Expansion', lastEdit: '4h ago', aiCount: 512, active: false, statusColor: '#9ca3af' },
    { id: '5', title: 'Retention Alpha Lab', lastEdit: 'Yesterday', aiCount: 12, active: false, statusColor: '#9ca3af' },
  ]);
}
