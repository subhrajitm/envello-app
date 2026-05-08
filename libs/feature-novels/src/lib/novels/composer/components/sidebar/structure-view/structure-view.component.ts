import { Component, input, output, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NovelContentService, FrontMatterItem, Prologue } from '@envello/core';

@Component({
  selector: 'app-structure-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './structure-view.component.html',
  styleUrls: [
    './structure-view.component.css',
    '../../../novel-editor.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class StructureViewComponent {
  protected novelService = inject(NovelContentService);
  
  frontMatter = input.required<FrontMatterItem[]>();
  prologue = input<Prologue | null>(null);
  activeFrontMatterId = input.required<string | null>();
  activePrologueId = input.required<string | null>();
  addMenuOpen = input.required<boolean>();
  
  selectFrontMatterItem = output<string>();
  selectPrologue = output<void>();
  deleteFrontMatterItem = output<{ id: string; title: string }>();
  deletePrologue = output<void>();
  addFrontMatterItem = output<'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface'>();
  addPrologue = output<void>();
  toggleAddMenu = output<void>();
  
  getFrontMatterTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'title-page': 'title',
      'copyright': 'copyright',
      'toc': 'list',
      'dedication': 'favorite',
      'foreword': 'menu_book',
      'preface': 'description'
    };
    return icons[type] || 'description';
  }
}
