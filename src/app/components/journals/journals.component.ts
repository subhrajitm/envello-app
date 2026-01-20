import { Component, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface JournalProject {
  id: string;
  title: string;
  entriesCount: number;
  active: boolean;
}

interface KanbanCard {
  id: string;
  type: 'CONCEPT' | 'CHAPTER' | 'SETTING' | 'CRITICAL';
  title: string;
  desc?: string;
  meta?: string;
  updatedTime: string;
  hasAi?: boolean;
  isAiEdited?: boolean;
  progress?: number;
  statusColor?: string;
  tags?: string[];
}

interface Columns {
  [key: string]: KanbanCard[];
}

@Component({
  selector: 'app-journals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journals.component.html',
  styleUrl: './journals.component.css'
})
export class JournalsComponent {
  projects = signal<JournalProject[]>([
    { id: '1', title: '2024 Morning Pages', entriesCount: 142, active: true },
    { id: '2', title: 'Plot Ideas Log', entriesCount: 86, active: false },
    { id: '3', title: 'Character Dev - SciFi', entriesCount: 54, active: false },
    { id: '4', title: 'Dream Journal 2023', entriesCount: 312, active: false },
    { id: '5', title: 'World Building Notes', entriesCount: 24, active: false },
    { id: '6', title: 'Travel Reflections', entriesCount: 18, active: false },
  ]);

  columns = signal<Columns>({
    IDEAS: [
      {
        id: 'i1', type: 'CONCEPT', title: 'Neon Noir Protagonist',
        desc: 'Initial sketches for the cybernetic detective character in Chapter 3.',
        updatedTime: 'Updated 1h ago', hasAi: true
      },
      {
        id: 'i2', type: 'SETTING', title: 'Underground Bazaar',
        desc: 'The sensory details of the black market in Neo-Tokyo district.',
        updatedTime: 'Updated 3h ago', statusColor: '#4ade80'
      }
    ],
    DRAFTING: [
      {
        id: 'd1', type: 'CHAPTER', title: 'The Rain Never Stops',
        meta: '2,450 words', updatedTime: 'Active',
        progress: 70
      }
    ],
    REVIEW: [
      {
        id: 'r1', type: 'CRITICAL', title: 'Prologue Redux',
        desc: 'Tone consistency check required after AI expansion of opening scene.',
        updatedTime: 'Feedback Ready', isAiEdited: true, tags: ['Feedback Ready']
      }
    ]
  });

  draggedItem: { card: KanbanCard, sourceCol: string } | null = null;

  onDragStart(e: DragEvent, card: KanbanCard, sourceCol: string) {
    this.draggedItem = { card, sourceCol };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }

  onDragEnd(e: DragEvent) {
    this.draggedItem = null;
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(e: DragEvent, targetCol: string) {
    e.preventDefault();

    if (!this.draggedItem) return;
    if (this.draggedItem.sourceCol === targetCol) return;

    const currentColumns = this.columns();
    const sourceList = [...currentColumns[this.draggedItem.sourceCol]];
    const targetList = [...currentColumns[targetCol]];

    const cardIndex = sourceList.findIndex(c => c.id === this.draggedItem!.card.id);
    if (cardIndex > -1) {
      sourceList.splice(cardIndex, 1);
    }

    targetList.push(this.draggedItem.card);

    this.columns.set({
      ...currentColumns,
      [this.draggedItem.sourceCol]: sourceList,
      [targetCol]: targetList
    });
  }
}
