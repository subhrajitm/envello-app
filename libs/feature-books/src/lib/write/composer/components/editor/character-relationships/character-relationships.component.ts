import { Component, input, output, signal, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Character, CharacterRelationship } from '@envello/core';

@Component({
  selector: 'app-character-relationships',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './character-relationships.component.html',
  styleUrls: ['../../../composer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CharacterRelationshipsComponent {
  characters    = input.required<Character[]>();
  relationships = input.required<CharacterRelationship[]>();

  addRelationship    = output<{ fromId: string; toId: string; label: string }>();
  deleteRelationship = output<string>();

  // Add-relationship popup state
  popupOpen = signal(false);
  fromId    = signal('');
  toId      = signal('');
  relLabel  = signal('');

  canSubmit = computed(() =>
    !!this.fromId() && !!this.toId() &&
    this.fromId() !== this.toId() &&
    this.relLabel().trim().length > 0
  );

  // SVG canvas dimensions
  readonly W  = 800;
  readonly H  = 460;
  private readonly CX     = 400;
  private readonly CY     = 220;
  private readonly RADIUS = 158;

  nodePositions = computed<Record<string, { x: number; y: number }>>(() => {
    const chars = this.characters();
    const n = chars.length;
    if (n === 0) return {};
    const r = n === 1 ? 0 : this.RADIUS;
    const result: Record<string, { x: number; y: number }> = {};
    chars.forEach((char, i) => {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      result[char.id] = {
        x: Math.round(this.CX + r * Math.cos(angle)),
        y: Math.round(this.CY + r * Math.sin(angle)),
      };
    });
    return result;
  });

  nodePos(id: string): { x: number; y: number } {
    return this.nodePositions()[id] ?? { x: this.CX, y: this.CY };
  }

  midPoint(rel: CharacterRelationship): { x: number; y: number } {
    const a = this.nodePos(rel.fromId);
    const b = this.nodePos(rel.toId);
    return { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
  }

  openPopup() {
    this.fromId.set('');
    this.toId.set('');
    this.relLabel.set('');
    this.popupOpen.set(true);
  }

  submitRelationship() {
    if (!this.canSubmit()) return;
    this.addRelationship.emit({ fromId: this.fromId(), toId: this.toId(), label: this.relLabel().trim() });
    this.popupOpen.set(false);
  }

  private static readonly PALETTE = [
    '#6366f1', '#8b5cf6', '#f97316', '#14b8a6',
    '#3b82f6', '#84cc16', '#f43f5e', '#f59e0b',
  ];

  avatarColor(name: string): string {
    const code = (name || '').charCodeAt(0) || 0;
    return CharacterRelationshipsComponent.PALETTE[code % 8];
  }
}
