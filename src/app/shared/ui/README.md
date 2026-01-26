# Shared UI Components

Reusable UI components used across the Envello app. All components use design tokens (CSS variables) from `styles.css` and work with the app themes.

## Components

### `env-button`
Primary, secondary, danger, and ghost buttons with optional icon.

```html
<env-button variant="primary" icon="add" (clicked)="create()">Create</env-button>
<env-button variant="secondary" (clicked)="cancel()">Cancel</env-button>
<env-button variant="danger">Delete</env-button>
<env-button variant="ghost" size="sm">Skip</env-button>
```

**Inputs:** `variant` (primary | secondary | danger | ghost), `size` (sm | md | lg), `icon`, `iconPos` (left | right), `disabled`, `type`  
**Outputs:** `clicked`

---

### `env-icon-button`
Icon-only button (add, close, etc.).

```html
<env-icon-button icon="add" variant="primary" (clicked)="open()" title="Add" />
<env-icon-button icon="close" variant="ghost" [active]="isActive" />
```

**Inputs:** `icon`, `variant` (primary | ghost | danger), `size` (28 | 32), `disabled`, `active`, `title`  
**Outputs:** `clicked`

---

### `env-badge`
Small labels for status, counts, or tags.

```html
<env-badge variant="default">12</env-badge>
<env-badge variant="success">Done</env-badge>
<env-badge variant="warning" pill>Pending</env-badge>
<env-badge variant="error">Failed</env-badge>
```

**Inputs:** `variant` (default | success | warning | error | accent), `pill`

---

### `env-modal`
Overlay modal with header, body, and footer slots.

```html
<env-modal [isOpen]="show()" (closed)="show.set(false)" title="Create Library" size="md">
  <div body>
    <p>Modal body content.</p>
  </div>
  <div footer>
    <env-button variant="secondary" (clicked)="show.set(false)">Cancel</env-button>
    <env-button variant="primary" (clicked)="save()">Create</env-button>
  </div>
</env-modal>
```

**Inputs:** `isOpen`, `title`, `size` (sm | md | large), `showClose`  
**Outputs:** `closed`  
**Slots:** `[header]`, `[body]`, `[footer]`. Use `[body]` and `[footer]` for main content and actions.

---

### `env-empty-state`
Centered empty state with icon, title, description, and optional action.

```html
<env-empty-state
  icon="library_books"
  title="No Library Selected"
  description="Select a library from the sidebar or create a new one."
>
  <env-button variant="primary" icon="add" (clicked)="create()">Create Library</env-button>
</env-empty-state>
```

**Inputs:** `icon`, `title`, `description`, `compact`

---

### `env-input`
Form input with label; supports `ngModel` / `formControlName`.

```html
<env-input label="Name" placeholder="Enter name" [(ngModel)]="name" />
```

**Inputs:** `label`, `placeholder`, `type`, `disabled`

---

## Importing

```ts
import { ButtonComponent, IconButtonComponent, BadgeComponent, ModalComponent, EmptyStateComponent, InputComponent } from '../shared/ui';
```

Add the components you need to your `imports` array (standalone).

## Migration

- **Research**: "No Library Selected" uses `env-empty-state` + `env-button`; "Create Library" modal uses `env-modal` with `[body]` / `[footer]` and `env-button`. Form markup (`.form-group`, `.modal-input`, etc.) remains in the page component and continues to use existing CSS.
- **Daily Notes, Journals, etc.**: Replace `modal-overlay` / `modal-container` with `env-modal`; `btn-primary` / `btn-secondary` with `env-button`; `empty-action-btn` with `env-empty-state` + `env-button` as you migrate.
