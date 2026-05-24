import { Component, input, output, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { BookContentService, FrontMatterItem, Prologue } from '@envello/core';

@Component({
  selector: 'app-structure-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective],
  templateUrl: './structure-editor.component.html',
  styleUrls: [
    './structure-editor.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class StructureEditorComponent {
  protected bookService = inject(BookContentService);
  
  editor = input.required<Editor>();
  activeFrontMatterId = input.required<string | null>();
  activePrologueId = input.required<string | null>();
  frontMatter = input.required<FrontMatterItem[]>();
  prologue = input<Prologue | null>(null);
  
  addFrontMatterItem = output<'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface'>();
  addPrologue = output<void>();
  
  getFrontMatterTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'title-page': 'Title Page',
      'copyright': 'Copyright Page',
      'toc': 'Table of Contents',
      'dedication': 'Dedication',
      'foreword': 'Foreword',
      'preface': 'Preface'
    };
    return labels[type] || type;
  }
}
