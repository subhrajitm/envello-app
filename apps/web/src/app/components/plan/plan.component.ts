import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExecutionEngineService } from '@envello/core';
import { ButtonComponent, EmptyStateComponent } from '@envello/ui';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, EmptyStateComponent],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.css',
})
export class PlanComponent implements OnInit {
  executionEngine = inject(ExecutionEngineService);

  // Quick Capture State
  captureInput = signal('');
  isCapturing = signal(false);

  // Derived State
  // Focus: Pick top 3 items based on priority score, or simply top 3 from active
  focusItems = computed(() => {
    // Use the suggestion engine logic for scoring
    const scored = this.executionEngine.generateSuggestions();
    return scored.slice(0, 3);
  });

  inProgressItems = computed(() => {
    // All active items that are not in the focus list (for visual distinctiveness)
    // Or we could just show all in-progress
    const focusIds = new Set(this.focusItems().map((i) => i.id));
    return this.executionEngine
      .activeItems()
      .filter((i) => !focusIds.has(i.id));
  });

  suggestions = computed(() => {
    // Writing suggestions
    return this.executionEngine
      .generateSuggestions()
      .filter((s) => s.type === 'writing');
  });

  successMessage = signal('');

  ngOnInit() {
    // Optional: seed some mock data for development
    if (this.executionEngine.items().length === 0) {
      this.executionEngine.loadItems([
        {
          id: '1',
          title: 'Finalize Envello v1.0 PRD',
          content: 'Review and refine the PRD before sending to team.',
          type: 'writing',
          status: 'in-progress',
          progress: 80,
          created_at: new Date().toISOString(),
          last_edited_at: new Date(
            Date.now() - 48 * 60 * 60 * 1000,
          ).toISOString(),
          ai_generated: false,
        },
        {
          id: '2',
          title: 'Implement Hybrid Execution UI',
          content: 'Update the Angular app to support mixed item types.',
          type: 'task',
          status: 'todo',
          progress: 0,
          created_at: new Date().toISOString(),
          last_edited_at: new Date().toISOString(),
          ai_generated: false,
        },
      ]);
    }
  }

  async submitCapture() {
    const input = this.captureInput().trim();
    if (!input) return;

    this.isCapturing.set(true);
    try {
      const item = await this.executionEngine.quickCapture(input);
      this.showSuccess(`Captured 1 ${item.type}`);
      this.captureInput.set('');
    } finally {
      this.isCapturing.set(false);
    }
  }

  markCompleted(id: string) {
    this.executionEngine.markCompleted(id);
    this.showSuccess('Item completed!');
  }

  updateProgress(id: string, newProgress: number) {
    this.executionEngine.updateProgress(id, newProgress);
  }

  showSuccess(message: string) {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3500);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
