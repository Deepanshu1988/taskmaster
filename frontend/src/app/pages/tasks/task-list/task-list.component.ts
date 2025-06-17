// frontend/src/app/components/task-list/task-list.component.ts
import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../../services/task.service';
import { TimeTrackingService } from '../../../services/time-tracking.service';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  tasks: any[] = [];
  selectedTask: any = null;
  newComment: string = '';
  loading = true;
  isAdmin: boolean = false;
  currentUserId: number | null = null;
  activeTimer: any = null;

  constructor(
    private taskService: TaskService,
    private timeTrackingService: TimeTrackingService,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) { 
    const currentUser = this.authService.currentUserValue;
    this.isAdmin = currentUser?.role === 'admin';
    this.currentUserId = currentUser?.id || null;
  }

  ngOnInit() {
    this.loadMyTasks();
    this.checkActiveTimer();
  }

  loadMyTasks() {
    this.loading = true;
    console.log('Loading tasks...', { isAdmin: this.isAdmin });

    const tasks$ = this.isAdmin 
      ? this.taskService.getTasks() 
      : this.taskService.getMyTasks();

    tasks$.subscribe({
      next: (tasks: any[]) => {
        console.log('Tasks loaded:', tasks);
        this.tasks = tasks;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.toastr.error('Failed to load tasks');
        this.loading = false;
      }
    });
  }

  checkActiveTimer() {
    this.timeTrackingService.getActiveTimeEntry().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activeTimer = response.data;
        }
      },
      error: (error) => {
        console.error('Error checking active timer:', error);
      }
    });
  }

  isTaskActive(taskId: number): boolean {
    return this.activeTimer && this.activeTimer.task_id === taskId;
  }

  startTimer(taskId: number): void {
    if (this.activeTimer) {
      this.toastr.warning('You already have an active timer');
      return;
    }

    this.timeTrackingService.startTracking(taskId, 'Started from task list').subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Time tracking started');
          this.checkActiveTimer();
        } else {
          this.toastr.error(response.message || 'Failed to start time tracking');
        }
      },
      error: (error) => {
        console.error('Error starting timer:', error);
        this.toastr.error('Failed to start time tracking');
      }
    });
  }

  stopTimer(): void {
    if (!this.activeTimer) return;

    this.timeTrackingService.stopTracking(this.activeTimer.id, 'Stopped from task list').subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Time tracking stopped');
          this.activeTimer = null;
          this.loadMyTasks(); // Refresh tasks to update time
        } else {
          this.toastr.error(response.message || 'Failed to stop time tracking');
        }
      },
      error: (error) => {
        console.error('Error stopping timer:', error);
        this.toastr.error('Failed to stop time tracking');
      }
    });
  }

  viewTaskDetails(taskId: number): void {
    this.router.navigate(['/tasks', taskId]);
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-primary';
      case 'in_progress': return 'bg-warning text-dark';
      case 'completed': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'low': return 'bg-info';
      case 'medium': return 'bg-warning text-dark';
      case 'high': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  updateTaskStatus(taskId: number, newStatus: string) {
    if (!taskId) {
      console.error('No task ID provided');
      return;
    }
  
    this.taskService.updateTaskStatus(taskId, newStatus).subscribe({
      next: (updatedTask) => {
        console.log('Task status updated:', updatedTask);
        
        // Update the task in the tasks array
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = { 
            ...this.tasks[taskIndex], 
            status: newStatus 
          };
        }
  
        // Update selected task if it's the one being updated
        if (this.selectedTask?.id === taskId) {
          this.selectedTask = { 
            ...this.selectedTask, 
            status: newStatus 
          };
        }
  
        this.toastr.success('Task status updated successfully');
      },
      error: (error) => {
        console.error('Error updating task status:', error);
        const errorMessage = error.error?.message || 'Failed to update task status';
        this.toastr.error(errorMessage);
      }
    });
  }

  addComment(taskId: number) {
    if (!taskId || !this.newComment?.trim()) {
      return;
    }
  
    this.taskService.addComment(taskId, { content: this.newComment.trim() }).subscribe({
      next: (comment) => {
        console.log('Comment added:', comment);
        
        // Update the selected task's comments
        if (this.selectedTask?.id === taskId) {
          if (!this.selectedTask.comments) {
            this.selectedTask.comments = [];
          }
          this.selectedTask.comments = [...this.selectedTask.comments, comment];
          this.newComment = '';
        }
        
        this.toastr.success('Comment added successfully');
      },
      error: (error) => {
        console.error('Error adding comment:', error);
        const errorMessage = error.error?.message || 'Failed to add comment';
        this.toastr.error(errorMessage);
      }
    });
  }

  loadTaskComments(taskId: number) {
    this.taskService.getTaskComments(taskId).subscribe({
      next: (comments: any[]) => {
        if (this.selectedTask) {
          this.selectedTask.comments = comments;
        }
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  selectTask(task: any) {
    this.selectedTask = { ...task };
    if (!this.selectedTask.comments) {
      this.loadTaskComments(task.id);
    }
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date() && 
           this.selectedTask?.status !== 'completed';
  }
}