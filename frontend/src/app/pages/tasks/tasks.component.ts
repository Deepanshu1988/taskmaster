import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
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
import { firstValueFrom, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

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
export class TasksComponent implements OnInit {
  
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
  taskCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0
  };

  // Search and filter properties
  searchQuery = '';
  selectedStatus = '';
  selectedPriority = '';
  selectedProject = '';
  selectedAssignee = '';
  isAdmin = false;
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private taskService: TaskService,
    private projectService: ProjectService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    this.taskService.authService = this.authService;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadTasks();
    this.loadProjects();
    this.loadUsers();
    this.checkAdminStatus();
    this.loadTaskCounts();
  }

  private initializeForm() {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      project_id: [null, Validators.required],
      assigned_to: [null, Validators.required],
      priority: ['medium', Validators.required],
      status: ['pending', Validators.required],
      dueDate: ['', Validators.required],
      progress: [0, [
        Validators.required, 
        Validators.min(0), 
        Validators.max(100),
        Validators.pattern('^[0-9]*$')
      ]]
    });
  }

  private loadTasks() {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks as TaskWithProjectAndAssignee[];
        this.filteredTasks = [...this.tasks];
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
      }
    });
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  private loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  private checkAdminStatus() {
    const currentUser = this.authService.currentUserValue;
    console.log('checkAdminStatus - currentUser:', currentUser);
    
    // Check different possible role properties
    const role = currentUser?.role || currentUser?.user?.role;
    console.log('User role from auth:', role);
    
    // Check if user is admin (case-insensitive check)
    this.isAdmin = role?.toLowerCase() === 'admin';
    console.log('isAdmin set to:', this.isAdmin);
  }

  private loadTaskCounts() {
    this.taskService.getTaskCounts().subscribe({
      next: (counts) => {
        console.log('Task counts received:', counts); // Add this line
        this.taskCounts = counts;
      },
      error: (error) => {
        console.error('Error loading task counts:', error);
      }
    });
  }
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

  /*editTask(task: Task) {
    this.editMode = true;
    this.selectedTask = task;
    
    console.log('Editing task with data:', {
      id: task.id,
      progress: task.progress,
      Progress: task.Progress,
      dueDate: task.dueDate,
      due_date: task.due_date,
      rawTask: JSON.parse(JSON.stringify(task))
    });
  
    // Format the due date for the date input (YYYY-MM-DD)
    let dueDateValue = '';
    const dueDate = task.dueDate || task.due_date;
    
    if (dueDate) {
      const date = new Date(dueDate);
      if (!isNaN(date.getTime())) {
        dueDateValue = date.toISOString().split('T')[0];
      }
    }
  
    // Handle progress value - check both progress and Progress
    let progressValue = 0;
    const Progress = task.progress !== undefined ? task.progress : task.Progress;
    console.log('Processing progress value:', {
      progress: task.progress,
      Progress: task.Progress,
      usingValue: Progress
    });
    
    
    if (Progress !== undefined && Progress !== null) {
      const numProgress = Number(Progress);
      if (!isNaN(numProgress)) {
        progressValue = Math.min(100, Math.max(0, numProgress));
      }
    }
  
    console.log('Setting form values:', {
      dueDate: dueDateValue,
      progress: progressValue,
      progressType: typeof progressValue
    });
  
    // Reset form with default values
    this.taskForm.reset({
      priority: 'medium',
      status: 'pending',
      progress: 0,
      dueDate: ''
    });
  
    // Set form values
    this.taskForm.patchValue({
      title: task.title || '',
      description: task.description || '',
      project_id: task.project_id || null,
      assigned_to: task.assigned_to || null,
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: dueDateValue,
      progress: progressValue
    }, { emitEvent: false });
  
    // Log the form control values after patching
    console.log('Form values after patch:', {
      ...this.taskForm.getRawValue(),
      dueDateControl: this.taskForm.get('dueDate')?.value,
      progressControl: this.taskForm.get('progress')?.value
    });
  
    this.modalService.open(this.addTaskModal, { 
      ariaLabelledBy: 'modal-basic-title',
      backdrop: 'static',
      keyboard: false
    });
  }*/
// In tasks.component.ts
editTask(task: Task) {
  this.editMode = true;
  this.selectedTask = task;
  
  console.log('Editing task:', {
    id: task.id,
    progress: task.progress,
    dueDate: task.dueDate,
    due_date: task.due_date,
    rawTask: JSON.parse(JSON.stringify(task))
  });

  // Format due date
  let dueDateValue = '';
  if (task.due_date || task.dueDate) {
    const date = task.due_date || task.dueDate;
    if (date && !isNaN(new Date(date).getTime())) {
      dueDateValue = new Date(date).toISOString().split('T')[0];
    }
  }

  // Handle progress - ensure it's a number between 0-100
  let progressValue = 0;
  if (task.progress !== undefined && task.progress !== null) {
    const numProgress = Number(task.progress);
    progressValue = isNaN(numProgress) ? 0 : Math.min(100, Math.max(0, numProgress));
  }

  console.log('Setting form values:', {
    dueDate: dueDateValue,
    progress: progressValue
  });

  // Reset form first
  this.taskForm.reset({
    priority: 'medium',
    status: 'pending',
    progress: 0
  });

  // Then patch the values
  this.taskForm.patchValue({
    title: task.title || '',
    description: task.description || '',
    project_id: task.project_id || null,
    assigned_to: task.assigned_to || null,
    priority: task.priority || 'medium',
    status: task.status || 'pending',
    dueDate: dueDateValue,
    progress: progressValue
  }, { emitEvent: false });

  // Force update the progress control
  const progressControl = this.taskForm.get('progress');
  if (progressControl) {
    progressControl.setValue(progressValue, { emitEvent: false });
  }

  console.log('Form values after patch:', {
    ...this.taskForm.getRawValue(),
    progressControl: this.taskForm.get('progress')?.value
  });

  this.modalService.open(this.addTaskModal, { 
    ariaLabelledBy: 'modal-basic-title',
    backdrop: 'static',
    keyboard: false
  });
}
   // Add this method to handle progress input changes
   onProgressInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (!isNaN(value)) {
      const clampedValue = Math.min(100, Math.max(0, value));
      this.taskForm.patchValue({
        progress: clampedValue
      }, { emitEvent: true });
    }
  }
  
  onDateInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.taskForm.patchValue({
      dueDate: input.value
    }, { emitEvent: true });
  }

  async onSubmit(modal?: any) {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    try {
      this.taskForm.disable();
      
      const formValue = this.taskForm.value;
       // Ensure progress is a number between 0 and 100
      const progressValue = Math.min(100, Math.max(0, Number(formValue.progress) || 0));
      
      // Format the due date
      let dueDateValue = null;
      if (formValue.dueDate) {
        const date = new Date(formValue.dueDate);
        if (!isNaN(date.getTime())) {
          dueDateValue = date.toISOString().split('T')[0];
        }
      }
      const taskData: Partial<Task> = {
        title: formValue.title,
        description: formValue.description,
        project_id: Number(formValue.project_id),
        assigned_to: Number(formValue.assigned_to),
        priority: formValue.priority,
        status: formValue.status,
        due_date: dueDateValue,
        progress: progressValue
      };
      console.log('Submitting task data:', taskData); // Debug log

      if (this.editMode && this.selectedTask) {
        // Update existing task
        await firstValueFrom(
          this.taskService.updateTask(this.selectedTask.id, taskData)
        );
        
        // Refresh the tasks list to ensure we have the latest data
        await this.loadTasks();
        
        // Close modal if it exists
        if (modal) {
          modal.close('Task updated');
        } else {
          this.modalService.dismissAll();
        }
      } else {
        // Create new task
        await firstValueFrom(
          this.taskService.createTask(taskData as Task)
        );
        
        // Refresh the tasks list to ensure we have the latest data
        await this.loadTasks();
        
        // Close modal if it exists
        if (modal) {
          modal.close(this.editMode ? 'Task updated' : 'Task created');
        } else {
          this.modalService.dismissAll();
        }
      }
      
      // Reset the form and edit mode
      this.editMode = false;
      this.selectedTask = null;
      this.taskForm.reset({
        priority: 'medium',
        status: 'pending',
        progress: 0,
        dueDate: ''
      });
      
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      this.taskForm.enable();
    }
  }

  // Action methods
  async updateStatus(task: Task, newStatus: 'pending' | 'in_progress' | 'completed') {
    if (!task || !task.id) {
      console.error('Invalid task or task ID');
      return false;
    }

    try {
      // Calculate progress based on status
      let progress = task.progress || 0;
      if (newStatus === 'completed') {
        progress = 100;
      } else if (newStatus === 'in_progress' && progress < 50) {
        progress = 50;
      }

      const updateData = { 
        status: newStatus,
        progress: progress
      };
      
      console.log('Sending update request:', {
        taskId: task.id,
        updateData,
        currentTask: task
      });

      const updatedTask = await firstValueFrom(
        this.taskService.updateTask(task.id, updateData)
      );
      
      console.log('Update response:', updatedTask);
      
      // Update the task in the local array
      const taskIndex = this.tasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          ...updatedTask,
          status: newStatus,
          progress: progress,
          updated_at: new Date().toISOString()
        };
        this.filteredTasks = [...this.tasks];
        return true;
      }
      return false;
      
    } catch (error: any) {
      // Log complete error object with all its properties
      console.error('Detailed error:', {
        name: error.name,
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error,
        headers: error.headers,
        fullError: error
      });
      
      // Try to get more detailed error message from response
      let errorMessage = 'Failed to update task. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.status === 404) {
        errorMessage = 'Task not found. It may have been deleted.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Error updating task:', errorMessage);
      alert(errorMessage);
      return false;
    }
  }

  async deleteTask(task: Task) {
    console.log('Delete task clicked');
    console.log('Bypassing admin check for testing');
    
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        console.log('Attempting to delete task ID:', task.id);
        const result = await firstValueFrom(this.taskService.deleteTask(task.id));
        console.log('Delete API response:', result);
        
        // Remove the task from the local arrays
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        this.filteredTasks = this.filteredTasks.filter(t => t.id !== task.id);
        
        console.log('Task removed from local state');
        alert('Task deleted successfully');
      } catch (error: unknown) {
        console.error('Error deleting task:', error);
        let errorMessage = 'Failed to delete task. ';
        
        if (error && typeof error === 'object') {
          const httpError = error as {
            error?: { message?: string };
            status?: number;
            message?: string;
          };
          
          if (httpError.error?.message) {
            errorMessage += httpError.error.message;
          } else if (httpError.status === 403) {
            errorMessage = 'You do not have permission to delete this task.';
          } else if (httpError.status === 401) {
            errorMessage = 'Session expired. Please log in again.';
          } else if (httpError.message) {
            errorMessage += httpError.message;
          }
        }
        
        alert(errorMessage);
      }
    }
  }
  

  dismissModal() {
    this.modalService.dismissAll();
  }
}