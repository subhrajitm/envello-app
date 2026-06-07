import { Component, input, output, signal, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Character, CharacterRelationship } from '@envello/core';
import { avatarColor } from '../../../utils/avatar-color.util';

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
  addCharacter       = output<void>();

  // Add-relationship popup state
  popupOpen = signal(false);
  fromId    = signal('');
  toId      = signal('');
  relLabel  = signal('');

  isDuplicate = computed(() => {
    const from = this.fromId(), to = this.toId();
    if (!from || !to || from === to) return false;
    return this.relationships().some(r =>
      (r.fromId === from && r.toId === to) || (r.fromId === to && r.toId === from)
    );
  });

  canSubmit = computed(() =>
    !!this.fromId() && !!this.toId() &&
    this.fromId() !== this.toId() &&
    this.relLabel().trim().length > 0 &&
    !this.isDuplicate()
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

  pillWidth(label: string): number {
    return Math.max(80, Math.min(220, label.length * 7 + 24));
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

  readonly avatarColor = avatarColor;
}
