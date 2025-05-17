import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model'; // Import Project model
import { firstValueFrom } from 'rxjs';
interface StatCard {
  title: string;
  value: string;
  color: string;
  icon: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

// Add this interface right after your imports and before the component class
interface TaskWithProject extends Task {
  project?: Project;
}
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgClass,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild('addTaskModal') addTaskModal!: ElementRef;
  @ViewChild('addProjectModal') addProjectModal!: ElementRef;

  // Update these arrays to use TaskWithProject type
  tasks: TaskWithProject[] = [];
  recentTasks: TaskWithProject[] = [];
  projects: Project[] = [];
  filteredTasks: Task[] = [];
  stats: StatCard[] = [
    { title: 'Total Tasks', value: '0', color: 'bg-primary', icon: 'fa-tasks' },
    { title: 'Completed', value: '0', color: 'bg-success', icon: 'fa-check-circle' },
    { title: 'In Progress', value: '0', color: 'bg-warning', icon: 'fa-spinner' }
  ];

  // Quick Actions with all required properties
  quickActions: {
    icon: string;
    title: string;
    description: string;
    buttonText: string;
    onClick: () => void;
  }[] = [
    {
      icon: 'fas fa-plus',
      title: 'Add Task',
      description: 'Create a new task',
      buttonText: 'Add Task',
      onClick: () => this.openAddTaskModal()
    },
    {
      icon: 'fas fa-project-diagram',
      title: 'Add Project',
      description: 'Create a new project',
      buttonText: 'Add Project',
      onClick: () => this.openAddProjectModal()
    },
    {
      icon: 'fas fa-user-plus',
      title: 'Add User',
      description: 'Create a new user',
      buttonText: 'Add User',
      onClick: () => this.openAddUserModal()
    }
  ];

  // Task form properties
  taskForm!: any;
  editMode = false;
  selectedTask: Task | null = null;
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

  // Project form properties
  projectForm!: any;
  editProjectMode = false;
  selectedProject: Project | null = null;

  priorities = ['high', 'medium', 'low'];
  statuses = ['pending', 'in_progress', 'completed'];

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private taskService: TaskService,
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize forms
    this.taskForm = {
      title: ['', Validators.required],
      description: ['', Validators.required],
      project_id: ['', Validators.required],
      assigned_to: ['', Validators.required],
      priority: ['', Validators.required],
      status: ['', Validators.required],
      dueDate: ['', Validators.required],
      progress: ['', Validators.required]
    };
  
    this.projectForm = {
      name: ['', Validators.required],
      description: ['', Validators.required],
      status: ['', Validators.required]
    };
  }

  ngOnInit(): void {
    // Load data
    this.loadProjects();
  }

  async loadTasks() {
    try {
      const tasks = await firstValueFrom(this.taskService.getTasks());
      this.tasks = tasks;
      this.recentTasks = this.tasks.slice(0, 5);
      
      // Map project names to tasks
      for (const task of this.tasks) {
        if (task.project_id) {
          const project = this.projects.find(p => p.id === task.project_id);
          if (project) {
            task['project'] = project;
          }
        }
      }
      
      this.updateStats();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  async loadProjects() {
    try {
      const projects = await firstValueFrom(this.projectService.getProjects());
      this.projects = projects;
      // Ensure projects are loaded before tasks
      await this.loadTasks();
    } catch (error) {
      console.error('Error loading projects:', error);
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

  openAddUserModal() {
    // TODO: Implement user modal opening
    console.log('Open add user modal');
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

  openAddProjectModal() {
    this.editProjectMode = false;
    this.selectedProject = null;
    this.projectForm.reset();
    this.modalService.open(this.addProjectModal);
  }

  editProject(project: Project) {
    this.editProjectMode = true;
    this.selectedProject = project;
    this.projectForm.patchValue({
      name: project.name,
      description: project.description,
      status: project.status
    });
    this.modalService.open(this.addProjectModal);
  }

  async saveProject() {
    if (this.projectForm.valid) {
      try {
        const formData = this.projectForm.value;
        if (this.editProjectMode && this.selectedProject) {
          await this.projectService.updateProject(this.selectedProject.id, formData);
        } else {
          await this.projectService.createProject(formData);
        }
        this.modalService.dismissAll();
        await this.loadProjects();
      } catch (error) {
        console.error('Error saving project:', error);
      }
    }
  }

  async deleteProject(project: Project) {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await this.projectService.deleteProject(project.id);
        await this.loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  }

  viewAllTasks() {
    this.router.navigate(['/tasks']);
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

  dismissModal() {
    this.modalService.dismissAll();
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