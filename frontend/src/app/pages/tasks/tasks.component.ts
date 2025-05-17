import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { ProjectService } from '../../services/project.service';
import { UserService } from '../../services/user.service';
import { Task } from '../../models/task.model';
import { Project } from '../../models/project.model';
import { User } from '../../models/user.model';
import { firstValueFrom } from 'rxjs';
// In tasks.component.ts
interface TaskWithProjectAndAssignee extends Task {
  project?: Project;
  assignee?: User;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgClass],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent {
  @ViewChild('addTaskModal') addTaskModal!: ElementRef;

  // Form properties
  taskForm!: FormGroup;
  editMode = false;
  selectedTask: Task | null = null;

  // Data properties
  tasks: TaskWithProjectAndAssignee[] = [];
  projects: Project[] = [];
  users: User[] = [];
  filteredTasks: TaskWithProjectAndAssignee[] = [];
  

  // Search and filter properties
  searchQuery = '';
  selectedStatus = '';
  selectedPriority = '';
  selectedProject = '';
  selectedAssignee = '';

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private taskService: TaskService,
    private projectService: ProjectService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Initialize form
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      project_id: ['', Validators.required],
      assigned_to: ['', Validators.required],
      priority: ['', Validators.required],
      status: ['', Validators.required],
      dueDate: ['', Validators.required],
      progress: ['', Validators.required]
    });

    // Load data
    this.loadTasks();
    this.loadProjects();
    this.loadUsers();
  }

  // In your loadTasks method
  async loadTasks() {
    try {
      this.tasks = await firstValueFrom(this.taskService.getTasks());
      
      // Map project names to tasks
      for (const task of this.tasks) {
        if (task.project_id) {
          const project = this.projects.find(p => p.id === task.project_id);
          if (project) {
            task.project = project;
          }
        }
        
        // Map assignee to tasks
        if (task.assigned_to) {
          const user = this.users.find(u => u.id === task.assigned_to);
          if (user) {
            task.assignee = user;
          }
        }
      }
      
      this.filteredTasks = [...this.tasks];
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  // Filter methods
  filterTasks() {
    this.filteredTasks = this.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus = !this.selectedStatus || task.status === this.selectedStatus;
      const matchesPriority = !this.selectedPriority || task.priority === this.selectedPriority;
      const matchesProject = !this.selectedProject || task.project_id === parseInt(this.selectedProject);
      const matchesAssignee = !this.selectedAssignee || task.assigned_to === parseInt(this.selectedAssignee);
      
      return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee;
    });
  }
// In tasks.component.ts
dismissModal() {
  this.modalService.dismissAll();
}
  // Form methods
  openAddTaskModal() {
    this.editMode = false;
    this.selectedTask = null;
    this.taskForm.reset();
    this.modalService.open(this.addTaskModal);
  }

  editTask(task: Task) {
    this.editMode = true;
    this.selectedTask = task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      project_id: task.project_id,
      assigned_to: task.assigned_to,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      progress: task.progress
    });
    this.modalService.open(this.addTaskModal);
  }

  async onSubmit() {
    if (this.taskForm.valid) {
      try {
        const formData = this.taskForm.value;
        if (this.editMode && this.selectedTask) {
          await this.taskService.updateTask(this.selectedTask.id, formData);
        } else {
          await this.taskService.createTask(formData);
        }
        this.modalService.dismissAll();
        await this.loadTasks();
      } catch (error) {
        console.error('Error saving task:', error);
      }
    }
  }

  // Action methods
  async updateStatus(task: Task, newStatus: 'pending' | 'in_progress' | 'completed') {
    try {
      await this.taskService.updateTask(task.id, { status: newStatus } as Partial<Task>);
      await this.loadTasks();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async deleteTask(task: Task) {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await this.taskService.deleteTask(task.id);
        await this.loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  }
}