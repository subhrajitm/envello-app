import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Book {
  id: string;
  title: string;
  author: string;
  category: 'DESIGN' | 'CREATIVE' | 'PRODUCTIVITY';
  lastAccessed: string;
  progress: number;
  notes: number;
  status: 'VERIFIED' | 'QUEUED';
  coverImage?: string;
}

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './books.component.html',
  styleUrl: './books.component.css'
})
export class BooksComponent {
  books = signal<Book[]>([
    {
      id: '1',
      title: 'The Design of Everyday Things',
      author: 'Don Norman',
      category: 'DESIGN',
      lastAccessed: 'Oct 24, 2023 14:20',
      progress: 45,
      notes: 14,
      status: 'VERIFIED'
    },
    {
      id: '2',
      title: 'Story: Substance, Structure',
      author: 'Robert McKee',
      category: 'CREATIVE',
      lastAccessed: 'Oct 22, 2023 09:15',
      progress: 12,
      notes: 3,
      status: 'QUEUED'
    },
    {
      id: '3',
      title: 'Atomic Habits',
      author: 'James Clear',
      category: 'PRODUCTIVITY',
      lastAccessed: 'Oct 20, 2023 18:44',
      progress: 94,
      notes: 86,
      status: 'VERIFIED'
    },
  ]);

  getCategoryColor(cat: string) {
    switch (cat) {
      case 'DESIGN': return 'badge-blue';
      case 'CREATIVE': return 'badge-purple';
      case 'PRODUCTIVITY': return 'badge-orange';
      default: return 'badge-gray';
    }
  }
}
