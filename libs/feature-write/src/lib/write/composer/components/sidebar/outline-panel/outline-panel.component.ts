import {
  Component,
  input,
  signal,
  effect,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';

export interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

@Component({
  selector: 'app-outline-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './outline-panel.component.html',
  styleUrls: [
    './outline-panel.component.css',
    '../../../composer.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OutlinePanelComponent {
  editor = input<Editor | null>(null);
  showHeader = input<boolean>(true);

  outline = signal<OutlineItem[]>([]);

  constructor() {
    effect(() => {
      const ed = this.editor();
      if (!ed) { this.outline.set([]); return; }

      // Define update inside effect so it closes over this specific ed instance
      const update = () => {
        const items: OutlineItem[] = [];
        ed.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            const level = Number(node.attrs['level']);
            if (level >= 1 && level <= 6) {
              items.push({ level, text: node.textContent, pos });
            }
          }
        });
        this.outline.set(items);
      };

      update();
      ed.on('update', update);
      return () => ed.off('update', update);
    });
  }

  goTo(item: OutlineItem) {
    const ed = this.editor();
    if (!ed) return;
    ed.commands.setTextSelection(item.pos + 1);
    ed.commands.scrollIntoView();
    ed.view.focus();
  }
}
