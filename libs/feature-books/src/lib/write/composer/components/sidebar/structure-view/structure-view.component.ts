import { Component, input, output, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookContentService, FrontMatterItem, Prologue } from '@envello/core';

type FrontMatterType = 'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface';

// Which front matter options are appropriate per writing type
const FM_OPTIONS_BY_TYPE: Record<string, FrontMatterType[]> = {
  NOVEL:       ['title-page', 'copyright', 'toc', 'dedication', 'foreword', 'preface'],
  SHORT_STORY: ['title-page', 'copyright', 'dedication'],
  SCRIPT:      ['title-page'],
  POETRY:      ['title-page', 'copyright', 'dedication', 'foreword'],
  ESSAY:       ['title-page', 'toc', 'preface'],
  RESEARCH:    ['title-page', 'copyright', 'toc', 'preface'],
};

@Component({
  selector: 'app-structure-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './structure-view.component.html',
  styleUrls: [
    './structure-view.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class StructureViewComponent {
  protected bookService = inject(BookContentService);

  frontMatter = input.required<FrontMatterItem[]>();
  prologue    = input<Prologue | null>(null);
  activeFrontMatterId = input.required<string | null>();
  activePrologueId    = input.required<string | null>();
  addMenuOpen  = input.required<boolean>();
  writingType  = input<string>('NOVEL');

  selectFrontMatterItem = output<string>();
  selectPrologue        = output<void>();
  deleteFrontMatterItem = output<{ id: string; title: string }>();
  deletePrologue        = output<void>();
  addFrontMatterItem    = output<FrontMatterType>();
  addPrologue           = output<void>();
  toggleAddMenu         = output<void>();

  // Prologue is only relevant for NOVEL, SHORT_STORY, POETRY
  readonly showPrologue = computed(() => {
    const t = this.writingType();
    return t === 'NOVEL' || t === 'SHORT_STORY' || t === 'POETRY';
  });

  // Available front matter options for the add menu
  readonly availableFmOptions = computed<{ type: FrontMatterType; label: string; icon: string }[]>(() => {
    const allowed = FM_OPTIONS_BY_TYPE[this.writingType()] ?? FM_OPTIONS_BY_TYPE['NOVEL'];
    const all: { type: FrontMatterType; label: string; icon: string }[] = [
      { type: 'title-page',  label: 'Title Page',           icon: 'title'       },
      { type: 'copyright',   label: 'Copyright Page',       icon: 'copyright'   },
      { type: 'toc',         label: 'Table of Contents',    icon: 'list'        },
      { type: 'dedication',  label: 'Dedication',           icon: 'favorite'    },
      { type: 'foreword',    label: 'Foreword',             icon: 'menu_book'   },
      { type: 'preface',     label: 'Preface',              icon: 'description' },
    ];
    return all.filter(o => allowed.includes(o.type));
  });

  getFrontMatterTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'title-page': 'title', 'copyright': 'copyright', 'toc': 'list',
      'dedication': 'favorite', 'foreword': 'menu_book', 'preface': 'description',
    };
    return icons[type] || 'description';
  }
}
