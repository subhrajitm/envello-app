export interface MentionItem {
  id: string;
  label: string;
  mentionType: 'character' | 'location';
}

/**
 * Builds a Tiptap suggestion config for @mentions using vanilla DOM rendering.
 * @param getItems Called with the current query; return filtered MentionItems.
 */
export function buildMentionSuggestion(getItems: (query: string) => MentionItem[]) {
  return {
    char: '@',

    items: ({ query }: { query: string }): MentionItem[] => getItems(query),

    render: () => {
      let popup: HTMLElement | null = null;
      let selectedIndex = 0;
      let currentItems: MentionItem[] = [];
      let selectFn: ((item: MentionItem) => void) | null = null;

      function buildList(
        items: MentionItem[],
        command: (item: MentionItem) => void,
        clientRect?: (() => DOMRect | null) | null,
      ) {
        currentItems = items;
        selectFn = command;
        selectedIndex = 0;

        if (!popup) return;

        if (!items.length) {
          popup.style.display = 'none';
          return;
        }

        if (clientRect) {
          const rect = clientRect();
          if (rect) {
            popup.style.top = `${rect.bottom + 6}px`;
            popup.style.left = `${rect.left}px`;
          }
        }

        popup.innerHTML = '';
        popup.style.display = 'block';

        items.forEach((item, i) => {
          const btn = document.createElement('button');
          btn.className = 'ne-mention-item' + (i === 0 ? ' ne-mention-item--active' : '');
          btn.type = 'button';

          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined ne-mention-item-icon';
          icon.textContent = item.mentionType === 'character' ? 'person' : 'location_on';

          const label = document.createElement('span');
          label.className = 'ne-mention-item-label';
          label.textContent = item.label;

          const badge = document.createElement('span');
          badge.className = 'ne-mention-item-badge ne-mention-item-badge--' + item.mentionType;
          badge.textContent = item.mentionType;

          btn.append(icon, label, badge);

          btn.addEventListener('mouseenter', () => {
            selectedIndex = i;
            markActive();
          });
          btn.addEventListener('click', () => command(item));
          popup!.appendChild(btn);
        });
      }

      function markActive() {
        popup?.querySelectorAll<HTMLElement>('.ne-mention-item').forEach((el, i) => {
          el.classList.toggle('ne-mention-item--active', i === selectedIndex);
        });
      }

      return {
        onStart(props: {
          items: MentionItem[];
          command: (item: MentionItem) => void;
          clientRect?: (() => DOMRect | null) | null;
        }) {
          popup = document.createElement('div');
          popup.className = 'ne-mention-list';
          document.body.appendChild(popup);
          buildList(props.items, props.command, props.clientRect);
        },

        onUpdate(props: {
          items: MentionItem[];
          command: (item: MentionItem) => void;
          clientRect?: (() => DOMRect | null) | null;
        }) {
          buildList(props.items, props.command, props.clientRect);
        },

        onExit() {
          popup?.remove();
          popup = null;
          currentItems = [];
          selectFn = null;
        },

        onKeyDown({ event }: { event: KeyboardEvent }): boolean {
          if (!currentItems.length) return false;
          if (event.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % currentItems.length;
            markActive();
            return true;
          }
          if (event.key === 'ArrowUp') {
            selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
            markActive();
            return true;
          }
          if (event.key === 'Enter') {
            if (selectFn && currentItems[selectedIndex]) selectFn(currentItems[selectedIndex]);
            return true;
          }
          return false;
        },
      };
    },
  };
}
