import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model'; // Import Project model

interface StatCard {
  title: string;
  value: string;
  color: string;
  icon: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgClass, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  @ViewChild('addTaskModal') addTaskModal!: ElementRef;
  
  tasks: Task[] = [];
  recentTasks: Task[] = [];
  stats: StatCard[] = [
    { title: 'Total Tasks', value: '0', color: 'bg-primary', icon: 'fa-tasks' },
    { title: 'Completed', value: '0', color: 'bg-success', icon: 'fa-check-circle' },
    { title: 'In Progress', value: '0', color: 'bg-warning', icon: 'fa-spinner' }
  ];
  
  newTask: Task = {
    id: 0,
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    progress: 0,
    assigned_to: 0,
    project_id: 0,
    created_at: new Date().toISOString()
  };

  priorities = ['high', 'medium', 'low'];
  statuses = ['pending', 'in_progress', 'completed'];
  projects: Project[] = []; // Initialize with empty array

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    public modalService: NgbModal,
    private projectService: ProjectService
  ) {
    this.loadTasks();
    this.loadProjects();
  }

  async loadTasks() {
    try {
      this.tasks = await this.taskService.getTasks().toPromise() || [];
      this.recentTasks = this.tasks.filter(task => ['pending', 'in_progress'].includes(task.status));
      this.updateStats();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  async loadProjects() {
    try {
      const projects = await this.projectService.getProjects().toPromise();
      this.projects = projects || []; // Ensure we always have an array
    } catch (error) {
      console.error('Error loading projects:', error);
      this.projects = []; // Set to empty array on error
    }
  }

  async updateTaskStatus(task: Task, status: 'pending' | 'in_progress' | 'completed') {
    try {
      if (!task.id) {
        console.error('Cannot update task status: Task ID is undefined');
        return;
      }
      
      task.status = status;
      await this.taskService.updateTask(task.id, task).toPromise();
      this.updateStats();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  async deleteTask(task: Task) {
    try {
      if (!task.id) {
        console.error('Cannot delete task: Task ID is undefined');
        return;
      }
      
      await this.taskService.deleteTask(task.id).toPromise();
      this.tasks = this.tasks.filter(t => t.id !== task.id);
      this.recentTasks = this.recentTasks.filter(t => t.id !== task.id);
      this.updateStats();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  openAddTaskModal() {
    const modalRef = this.modalService.open(this.addTaskModal);
    modalRef.result.then((result) => {
      if (result === 'success') {
        this.loadTasks();
      }
    }).catch((error) => {
      console.log('Modal dismissed:', error);
    });
  }

  createTask() {
    if (!this.newTask.title) {
      alert('Please enter a task title');
      return;
    }

    const taskToCreate: Task = {
      ...this.newTask,
      assigned_to: this.authService.currentUserValue?.id || 0,
      created_at: new Date().toISOString()
    };

    this.taskService.createTask(taskToCreate).subscribe(
      (response) => {
        this.modalService.dismissAll('success');
        this.newTask = {
          id: 0,
          title: '',
          description: '',
          status: 'pending',
          priority: 'medium',
          progress: 0,
          assigned_to: 0,
          project_id: 0,
          created_at: new Date().toISOString()
        };
      },
      (error) => {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please try again.');
      }
    );
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const inProgress = this.tasks.filter(t => ['in_progress', 'pending'].includes(t.status)).length;

    this.stats[0].value = total.toString();
    this.stats[1].value = completed.toString();
    this.stats[2].value = inProgress.toString();
  }
}