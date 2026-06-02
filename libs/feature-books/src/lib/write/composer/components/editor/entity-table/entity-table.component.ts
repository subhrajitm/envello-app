import { Component, input, output, signal, computed, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableComponent, EnvTableColumn, EnvTableAction, EnvTableActionEvent, EnvTableRow } from '@envello/ui';

export interface EntityTableRow {
  id: string;
  name: string;
  values: (string | undefined)[];
}

export interface EntityTableColumn {
  label: string;
}

export interface EntityTablePopupField {
  id: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

@Component({
  selector: 'app-entity-table',
  standalone: true,
  imports: [FormsModule, TableComponent],
  templateUrl: './entity-table.component.html',
  styleUrls: [
    './entity-table.component.css',
    '../../../composer.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class EntityTableComponent {
  // Table data
  columns = input.required<EntityTableColumn[]>();
  items = input.required<EntityTableRow[]>();

  // Empty state
  emptyIcon = input.required<string>();
  emptyTitle = input.required<string>();
  emptyHint = input.required<string>();

  // Popup
  popupTitle = input.required<string>();
  popupIcon = input.required<string>();
  popupFields = input.required<EntityTablePopupField[]>();
  popupGridFields = input<boolean>(false);

  // Outputs
  selectItem = output<string>();
  deleteItem = output<{ id: string; name?: string }>();
  addItem = output<Record<string, string>>();

  // ── Popup state ──
  popupOpen = signal(false);
  private popupValues = signal<Record<string, string>>({});

  singularTitle = computed(() => this.popupTitle().replace(/^Add\s+/i, ''));

  remainingFields = computed(() => this.popupFields().slice(1));

  firstFieldTrimmed = computed(() =>
    (this.popupValues()[this.popupFields()[0]?.id ?? ''] ?? '').trim().length > 0
  );

  // ── env-table integration ──
  readonly tableActions: EnvTableAction[] = [
    { key: 'delete', label: 'Delete', icon: 'delete', danger: true, bulk: false },
  ];

  envColumns = computed<EnvTableColumn[]>(() => [
    { key: '_name', header: 'Name', type: 'avatar-text' },
    ...this.columns().map((col, i): EnvTableColumn => ({
      key: `_val${i}`,
      header: col.label,
      type: 'text',
    })),
  ]);

  envRows = computed<EnvTableRow[]>(() =>
    this.items().map(item => {
      const row: EnvTableRow = { id: item.id, _name: { name: item.name } };
      item.values.forEach((val, i) => { row[`_val${i}`] = val || '—'; });
      return row;
    })
  );

  onRowClick(row: EnvTableRow) {
    this.selectItem.emit(row['id']);
  }

  onActionClick(event: EnvTableActionEvent) {
    if (event.actionKey === 'delete') {
      const nameCell = event.row['_name'];
      const name = typeof nameCell === 'object' ? nameCell.name : String(nameCell);
      this.deleteItem.emit({ id: event.row['id'], name });
    }
  }

  getFieldValue(id: string): string {
    return this.popupValues()[id] ?? '';
  }

  setFieldValue(id: string, value: string) {
    this.popupValues.update(v => ({ ...v, [id]: value }));
  }

  openPopup() {
    const defaults: Record<string, string> = {};
    for (const f of this.popupFields()) {
      defaults[f.id] = f.defaultValue ?? '';
    }
    this.popupValues.set(defaults);
    this.popupOpen.set(true);
  }

  closePopup() {
    this.popupOpen.set(false);
  }

  submitPopup() {
    if (!this.firstFieldTrimmed()) return;
    const result: Record<string, string> = {};
    for (const f of this.popupFields()) {
      result[f.id] = (this.popupValues()[f.id] ?? '').trim() || f.defaultValue || '';
    }
    this.addItem.emit(result);
    this.closePopup();
  }
}
