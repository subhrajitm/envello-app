import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent {
  store = inject(StoreService);
  selectedFilter = signal<string>('All');

  todayTasksCount = computed(() => this.store.tasks().filter(t => t.due?.includes('Today')).length);
  completedTasksCount = computed(() => this.store.tasks().filter(t => t.status === 'COMPLETED').length);
  activeTasksCount = computed(() => this.store.tasks().filter(t => t.status === 'ACTIVE').length);
  priorityTasksCount = computed(() => this.store.tasks().filter(t => t.priority === 'PRIORITY 01').length);

  filteredTasks = computed(() => {
    // Basic filter logic to match React version (which only had mock logic initially? No, the buttons didn't actually filter the table in that code provided, or did they?
    // In React code: It didn't seem to apply filtering to `tasks.map`. 
    // I will implement filtering for better UX.
    /*
      <div className="tasks-detail-table">
          ...
          {tasks.map((task) => (...))}
      </div>
    */
    // The React code iterated `tasks` directly, ignoring `selectedFilter` for the list.
    // I will replicate that but filtering is trivial to add if needed. I'll stick to exact replica: show all.
    return this.store.tasks();
  });
}
