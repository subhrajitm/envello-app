import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  inject,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { NovelContentService } from '@envello/core';
let StructureEditorComponent = class StructureEditorComponent {
  novelService = inject(NovelContentService);
  editor = input.required();
  activeFrontMatterId = input.required();
  activePrologueId = input.required();
  frontMatter = input.required();
  prologue = input(null);
  addFrontMatterItem = output();
  addPrologue = output();
  getFrontMatterTypeLabel(type) {
    const labels = {
      'title-page': 'Title Page',
      copyright: 'Copyright Page',
      toc: 'Table of Contents',
      dedication: 'Dedication',
      foreword: 'Foreword',
      preface: 'Preface',
    };
    return labels[type] || type;
  }
};
StructureEditorComponent = __decorate(
  [
    Component({
      selector: 'app-structure-editor',
      standalone: true,
      imports: [CommonModule, FormsModule, TiptapEditorDirective],
      templateUrl: './structure-editor.component.html',
      styleUrls: [
        './structure-editor.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  StructureEditorComponent,
);
export { StructureEditorComponent };
