# Novel Editor Component Integration Guide

## ✅ Created Components (12/18)

### Modals (4/4) ✅
- `DeleteModalComponent`
- `AddModalComponent`
- `LinkModalComponent`
- `VersionHistoryModalComponent`

### Left Sidebar (5/5) ✅
- `SyncStatusComponent`
- `ChaptersListComponent`
- `StructureViewComponent`
- `CharactersListComponent`
- `LocationsListComponent`

### Editor (3/6)
- ✅ `EditorHeaderComponent`
- ✅ `EditorToolbarComponent`
- ✅ `ManuscriptEditorComponent`
- ⏳ `StructureEditorComponent`
- ⏳ `CharacterDetailsComponent`
- ⏳ `LocationDetailsComponent`

### Right Sidebar (0/3)
- ⏳ `AiPanelComponent`
- ⏳ `NotesPanelComponent`
- ⏳ `ManuscriptDataComponent`

## 📝 Integration Steps

### 1. Update Main Component Imports

Add all component imports to `novel-editor.component.ts`:

```typescript
import { DeleteModalComponent, DeleteModalData } from './components/modals/delete-modal/delete-modal.component';
import { AddModalComponent, AddModalData } from './components/modals/add-modal/add-modal.component';
import { LinkModalComponent } from './components/modals/link-modal/link-modal.component';
import { VersionHistoryModalComponent } from './components/modals/version-history-modal/version-history-modal.component';
import { SyncStatusComponent } from './components/sidebar/sync-status/sync-status.component';
import { ChaptersListComponent } from './components/sidebar/chapters-list/chapters-list.component';
import { StructureViewComponent } from './components/sidebar/structure-view/structure-view.component';
import { CharactersListComponent } from './components/sidebar/characters-list/characters-list.component';
import { LocationsListComponent } from './components/sidebar/locations-list/locations-list.component';
import { EditorHeaderComponent, SearchResult } from './components/editor/editor-header/editor-header.component';
import { EditorToolbarComponent } from './components/editor/editor-toolbar/editor-toolbar.component';
import { ManuscriptEditorComponent } from './components/editor/manuscript-editor/manuscript-editor.component';

@Component({
  selector: 'app-novel-editor',
  standalone: true,
  imports: [
    CommonModule, 
    TiptapEditorDirective, 
    FormsModule,
    // Modals
    DeleteModalComponent,
    AddModalComponent,
    LinkModalComponent,
    VersionHistoryModalComponent,
    // Sidebar
    SyncStatusComponent,
    ChaptersListComponent,
    StructureViewComponent,
    CharactersListComponent,
    LocationsListComponent,
    // Editor
    EditorHeaderComponent,
    EditorToolbarComponent,
    ManuscriptEditorComponent,
  ],
  // ...
})
```

### 2. Update Template to Use Components

Replace sections in `novel-editor.component.html`:

#### Left Sidebar Example:
```html
<!-- MANUSCRIPT VIEW -->
@if (activeNav() === 'manuscript' && novel()) {
  <app-chapters-list
    [chapters]="novel()!.chapters"
    [activeChapterId]="activeChapterId()"
    [bulkMode]="bulkMode()"
    [selectedChapters]="selectedChapters()"
    [addMenuOpen]="addMenuOpen()"
    (selectChapter)="selectChapter($event)"
    (toggleChapter)="toggleChapter($event)"
    (deleteChapter)="deleteChapter($event.id, $event.title)"
    (deleteGroup)="deleteGroup($event.id, $event.title)"
    (toggleBulkMode)="toggleBulkMode()"
    (bulkDelete)="bulkDeleteChapters()"
    (toggleAddMenu)="toggleAddMenu()"
    (addNewActOrPart)="addNewActOrPart()"
    (addNewChapter)="addNewChapter()"
    (toggleChapterSelection)="toggleChapterSelection($event)"
  />
}
```

#### Modals Example:
```html
<app-delete-modal
  [modal]="deleteModal()"
  (confirm)="confirmDelete()"
  (cancel)="cancelDelete()"
/>

<app-add-modal
  [modal]="addModal()"
  (inputValueChange)="updateAddModalInput($event)"
  (inputValue2Change)="updateAddModalInput2($event)"
  (confirm)="confirmAdd()"
  (cancel)="cancelAdd()"
/>
```

#### Editor Example:
```html
<app-editor-header
  [activeNav]="activeNav()"
  [canUndo]="canUndo()"
  [canRedo]="canRedo()"
  [searchOpen]="searchOpen()"
  [searchQuery]="searchQuery()"
  [filteredResults]="filteredChapters()"
  [focusMode]="focusMode()"
  [fullScreenMode]="fullScreenMode()"
  [exportMenuOpen]="exportMenuOpen()"
  (setActiveNav)="setActiveNav($event)"
  (performUndo)="performUndo()"
  (performRedo)="performRedo()"
  (toggleSearch)="toggleSearch()"
  (searchQueryChange)="searchQuery.set($event)"
  (selectSearchResult)="selectSearchResult($event)"
  (toggleFocusMode)="toggleFocusMode()"
  (toggleFullScreen)="toggleFullScreen()"
  (openVersionHistory)="openVersionHistory()"
  (toggleExportMenu)="toggleExportMenu()"
  (exportNovel)="exportNovel($event)"
/>

@if (editor && activeNav() === 'manuscript') {
  <app-editor-toolbar
    [editor]="editor"
    (openLinkModal)="openLinkModal()"
    (addImage)="addImage()"
    (insertTable)="insertTable()"
    (addYoutube)="addYoutube()"
  />
  
  <app-manuscript-editor
    [editor]="editor"
    [activeChapterId]="activeChapterId()"
    [title]="title()"
    [chapterStatus]="chapterStatus()"
    [chapterLastEdited]="chapterLastEdited()"
    [isSaving]="isSaving()"
    [lastSaved]="lastSaved()"
    (titleChange)="onTitleChange($event)"
    (addNewChapter)="addNewChapter()"
  />
}
```

### 3. Update Component Methods

Some methods need to be adjusted to work with component outputs:

```typescript
// Example: Update deleteChapter to work with component output
deleteChapter(data: { id: string; title?: string }) {
  this.requestDelete('chapter', data.id, data.title);
}
```

### 4. Complete Remaining Components

Follow the same pattern for:
- `StructureEditorComponent` - Similar to ManuscriptEditor but for front matter/prologue
- `CharacterDetailsComponent` - Character editing form
- `LocationDetailsComponent` - Location editing form
- `AiPanelComponent` - AI chat interface
- `NotesPanelComponent` - Notes list
- `ManuscriptDataComponent` - Statistics panel

## 🎯 Benefits Achieved

1. **Maintainability**: Each component is ~100-200 lines vs 1600+ lines
2. **Reusability**: Components can be used elsewhere
3. **Testability**: Each component can be tested independently
4. **Performance**: OnPush change detection per component
5. **Clarity**: Clear separation of concerns

## 📋 Next Steps

1. Complete remaining 6 components following the same pattern
2. Update main component template to use all components
3. Test all functionality
4. Extract component-specific CSS (optional)
5. Remove unused code from main component
