import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { firstValueFrom } from 'rxjs';

interface StatCard {
  title: string;
  value: string;
  color: string;
  icon: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

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
  @ViewChild('addTaskModal') addTaskModal!: TemplateRef<any>;
  @ViewChild('addProjectModal') addProjectModal!: TemplateRef<any>;

  tasks: TaskWithProject[] = [];
  recentTasks: TaskWithProject[] = [];
  projects: Project[] = [];
  users: User[] = []; 
  filteredTasks: Task[] = [];
  stats: StatCard[] = [
    { title: 'Total Tasks', value: '0', color: 'bg-primary', icon: 'fa-tasks' },
    { title: 'Completed', value: '0', color: 'bg-success', icon: 'fa-check-circle' },
    { title: 'In Progress', value: '0', color: 'bg-warning', icon: 'fa-spinner' }
  ];

  quickActions: {
    icon: string;
    title: string;
    description: string;
    buttonText: string;
    onClick: () => void;
  }[] = [
    {
      icon: 'fas fa-tasks',
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

  taskForm!: FormGroup;
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

  projectForm!: FormGroup;
  editProjectMode = false;
  selectedProject: Project | null = null;

  priorities = ['high', 'medium', 'low'];
  statuses = ['pending', 'in_progress', 'completed'];

  managers: User[] = [];
  teamMembers: User[] = [];

  currentModalRef: NgbModalRef | null = null;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private taskService: TaskService,
    private projectService: ProjectService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {
    // Initialize forms
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      projectId: ['', Validators.required],
      assigned_to: ['', Validators.required],
      priority: ['medium', Validators.required],
      status: ['pending', Validators.required],
      dueDate: ['', [Validators.required, this.futureDateValidator()]],
      progress: [0, [
        Validators.required, 
        Validators.min(0), 
        Validators.max(100),
        Validators.pattern('^[0-9]*$')
      ]]
    });

    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      status: ['', Validators.required]
    });
  }

   // Add this method to your component class
   private futureDateValidator(): import('@angular/forms').ValidatorFn {
    return (control: import('@angular/forms').AbstractControl): {[key: string]: any} | null => {
      if (!control.value) {
        return null; // Let required validator handle empty values
      }
      
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part to ensure date-only comparison
      
      return selectedDate >= today ? null : { 'invalidDate': true };
    };
  }

  async ngOnInit(): Promise<void> {
    try {
      // Load all required data in parallel
      await Promise.all([
        this.loadUsers(),
        this.loadProjects()
      ]);
      
      // Load tasks after users and projects are loaded
      await this.loadTasks();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  async loadTasks() {
    try {
      const tasks = await firstValueFrom(this.taskService.getTasks());
      
      // Map project and format dates for all tasks
      this.tasks = tasks.map(task => {
        const taskWithProject: TaskWithProject = {
          ...task,
          project: this.projects.find(p => p.id === task.project_id?.toString())
        };
        
        // Format the due date if it exists
        if (task.dueDate) {
          taskWithProject.dueDate = this.formatDate(task.dueDate);
        }
        
        return taskWithProject;
      });
      
      // Get most recent 5 tasks
      this.recentTasks = [...this.tasks]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5);
      
      this.updateStats();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  async loadProjects() {
    try {
      const projects = await firstValueFrom(this.projectService.getProjects());
      this.projects = projects;
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  async loadUsers() {
    try {
      console.log('Fetching users...');
      
      // Fetch all users
      const allUsers = await firstValueFrom(this.userService.getUsers());
      console.log('Users from API:', allUsers);
      
      if (!Array.isArray(allUsers)) {
        console.error('Expected users array but got:', typeof allUsers);
        return;
      }
      
      // Map the API response to our User model
      this.users = allUsers.map(user => ({
        id: user.id,
        username: user.username || user.email, // Fallback to email if username is not available
        email: user.email,
        role: user.role || 'user', // Default to 'user' role if not specified
        status: user.status || 'active'
      }));
      
      console.log('Mapped users:', this.users);
      
      // Filter users by role for the dropdown
      this.managers = this.users.filter(user => user.role === 'manager' || user.role === 'admin');
      this.teamMembers = this.users.filter(user => user.role === 'user');
      
      console.log('Managers:', this.managers);
      console.log('Team Members:', this.teamMembers);
      
    } catch (error: any) {  
      console.error('Error loading users:', error);
      if (error?.status === 403) {
        console.error('Access denied. Only admins can view users.');
      }
    }
  }

  // Add this method to filter users by role
  getUsersByRole(role: 'admin' | 'user' | 'manager' | 'all' = 'all'): User[] {
    if (role === 'all') {
      return this.users;
    }
    return this.users.filter(user => user.role === role);
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
    this.modalService.open(this.addTaskModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    }).result.then((result) => {
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
        if (!project.id) {
          console.error('Cannot delete project: Project ID is undefined');
          return;
        }
        
        await this.projectService.deleteProject(project.id).toPromise();
        this.projects = this.projects.filter(p => p.id !== project.id);
        this.updateStats();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  }

  async updateProjectStatus(project: Project, status: string) {
    try {
      if (!project.id) {
        console.error('Cannot update project status: Project ID is undefined');
        return;
      }
      
      project.status = status;
      await this.projectService.updateProject(project.id, project).toPromise();
      this.updateStats();
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  }

  viewAllTasks() {
    this.router.navigate(['/tasks']);
  }

  async onSubmit() {
    if (this.taskForm.valid) {
      try {
        // Show loading state
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
        
        const formData = {
          ...this.taskForm.value,
          // Ensure project_id and assigned_to are numbers
          project_id: Number(this.taskForm.value.projectId),
          assigned_to: Number(this.taskForm.value.assigned_to),
          // Convert date to ISO string
          dueDate: new Date(this.taskForm.value.dueDate).toISOString(),
          // Ensure progress is a number
          progress: Number(this.taskForm.value.progress)
        };
        
        // Remove the projectId field as the API expects project_id
        delete formData.projectId;
        
        // Create the task
        const task = await firstValueFrom(this.taskService.createTask(formData));
        
        // Close the modal
        this.modalService.dismissAll();
        
        // Reload tasks
        await this.loadTasks();
        
        // Reset the form
        this.taskForm.reset({
          priority: 'medium',
          status: 'pending',
          progress: 0
        });
        
      } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please try again.');
      } finally {
        // Reset button state
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = 'Create Task';
        }
      }
    } else {
      // Mark all fields as touched to show validation messages
      Object.keys(this.taskForm.controls).forEach(key => {
        this.taskForm.get(key)?.markAsTouched();
      });
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

  // Helper method to format date
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}