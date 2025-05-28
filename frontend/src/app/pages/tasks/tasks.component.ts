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
    // Initialize form with default values
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      project_id: [null, Validators.required],
      assigned_to: [null, Validators.required],
      priority: ['medium', Validators.required],
      status: ['pending', Validators.required],
      dueDate: ['', Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
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
          const project = this.projects.find(p => p.id === task.project_id?.toString());
          if (project) {
            task.project = project;
          }
        }
        
        // Map assignee to tasks
      if (task.assigned_to) {
        console.log('\nProcessing task:', task.id, 'Assigned to ID:', task.assigned_to?.toString());
        const user = this.users.find(u => u.username === task.assigned_to?.toString());
        console.log('Found user:', user);
        if (user) {
          task.assignee = user;
        } else {
          console.warn('No matching user found for ID:', task.assigned_to);
          console.log('Available users:', this.users.map(u => ({id: u.id, username: u.username})));
        }
      }
    }
    
    this.filteredTasks = [...this.tasks];
    console.log('Tasks after mapping:', this.tasks);
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
      next: (users: any) => {
        console.log('Users loaded:', users); // Add this for debugging
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        // You might want to show an error message to the user here
      }
    });
  }
 /* loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }*/
    getUsername(userId: number | string | undefined): string {
      if (!userId) return 'Unassigned';
      
      // Convert both IDs to string for comparison to avoid type issues
      const userIdStr = userId.toString();
      const user = this.users.find(u => u.id.toString() === userIdStr);
      
      return user ? user.username : 'Unknown User';
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

  // Form methods
  openAddTaskModal() {
    this.editMode = false;
    this.selectedTask = null;
    this.taskForm.reset({
      priority: 'medium',
      status: 'pending',
      progress: 0,
      project_id: null,
      assigned_to: null,
      dueDate: ''
    });
    this.modalService.open(this.addTaskModal, { 
      ariaLabelledBy: 'modal-basic-title',
      backdrop: 'static',
      keyboard: false
    });
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
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      progress: task.progress || 0
    });
    this.modalService.open(this.addTaskModal, { 
      ariaLabelledBy: 'modal-basic-title',
      backdrop: 'static',
      keyboard: false
    });
  }

  async onSubmit(modal?: any) {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    try {
      // Disable form while submitting
      this.taskForm.disable();
      
      const formValue = this.taskForm.value;
      const taskData: Partial<Task> = {
        title: formValue.title,
        description: formValue.description,
        project_id: Number(formValue.project_id),
        assigned_to: Number(formValue.assigned_to),
        priority: formValue.priority,
        status: formValue.status,
        dueDate: formValue.dueDate,
        progress: Number(formValue.progress)
      };

      if (this.editMode && this.selectedTask) {
        await firstValueFrom(this.taskService.updateTask(this.selectedTask.id, taskData));
      } else {
        await firstValueFrom(this.taskService.createTask(taskData as Task));
      }

      // Close modal if it exists
      if (modal) {
        modal.close('Task saved');
      } else {
        this.modalService.dismissAll();
      }

      // Reload tasks
      await this.loadTasks();

    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      // Re-enable form
      this.taskForm.enable();
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

  dismissModal() {
    this.modalService.dismissAll();
  }
}