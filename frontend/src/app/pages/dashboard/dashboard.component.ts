import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { catchError, EMPTY, filter, firstValueFrom, from, of, Subscription, switchMap, timer } from 'rxjs';
import { DepartmentManagementComponent } from '../department-management/department-management.component';
import { ToastrModule } from 'ngx-toastr';
//import { ToastrService } from 'ngx-toastr';
import { NotificationSettingsComponent } from '../settings/notification-settings/notification-settings.component';

interface TaskFormValue {
  title: string;
  description: string;
  projectId: string;
  assigned_to: string;
  priority: string;
  status: string;
  dueDate: string;
  progress: string;
  comment: string;
  attachments?: {
    id: number;
    file_name: string;
    file_type: string;
    created_at: string;
  }[];
}

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
    ReactiveFormsModule,
    ToastrModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  toastr: any;
  newComment: any;
  taskComments: any;
  openNotificationSettingsModal() {
    const modalRef = this.modalService.open(NotificationSettingsComponent, {
      size: 'lg',
      windowClass: 'notification-settings-modal',
      backdrop: 'static',
      keyboard: false
    });
    
    // Store the modal reference
    this.currentModalRef = modalRef;
    
    modalRef.result.then(
      (result) => {
        console.log('Notification settings saved:', result);
        // You can add any success handling here if needed
        if (result === 'saved') {
          // Reload user preferences if needed
          this.loadUserPreferences();
        }
      },
      (reason) => {
        console.log('Modal dismissed: user dismissed the modal', reason);
      }
    ).finally(() => {
      this.currentModalRef = null;
    });
  }
  loadUserPreferences() {
    throw new Error('Method not implemented.');
  }
  openAddDepartmentModal() {
    const modalRef = this.modalService.open(DepartmentManagementComponent, {
      size: 'lg',
      windowClass: 'department-modal',
      backdrop: 'static'
    });
  
    // Handle the modal result
    modalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.toastr.success('Department saved successfully!');
        }
      },
      (reason) => {
        // Handle dismiss
        console.log('Modal dismissed:', reason);
      }
    );
  }
  @ViewChild('addTaskModal') addTaskModal!: TemplateRef<any>;
  @ViewChild('addProjectModal') addProjectModal!: TemplateRef<any>;
  @ViewChild('addUserModal') addUserModal!: TemplateRef<any>;

  tasks: TaskWithProject[] = [];
  recentTasks: TaskWithProject[] = [];
  projects: Project[] = [];
  users: User[] = []; 
  filteredTasks: Task[] = [];
  stats: StatCard[] = [
    { title: 'Total Tasks', value: '0', color: 'bg-primary', icon: 'fa-tasks' },
    { title: 'Completed', value: '0', color: 'bg-success', icon: 'fa-check-circle' },
    { title: 'In Progress', value: '0', color: 'bg-warning', icon: 'fa-spinner' },
    //{ title: 'Pending', value: '0', color: 'bg-warning', icon: 'fa-clock' },
  ];

  get quickActions() {
    const allActions = [
      {
        icon: 'fas fa-tasks',
        title: 'Add Task',
        description: 'Create a new task',
        buttonText: 'Add Task',
        onClick: () => this.openAddTaskModal(),
        adminOnly: true // Regular users can add tasks
      },
      {
        icon: 'fas fa-project-diagram',
        title: 'Add Project',
        description: 'Create a new project',
        buttonText: 'Add Project',
        onClick: () => this.openAddProject(),
        adminOnly: true // Only admins can add projects
      },
      {
        icon: 'fas fa-user-plus',
        title: 'Add User',
        description: 'Create a new user',
        buttonText: 'Add User',
        onClick: () => this.openAddUserModal(),
        adminOnly: true // Only admins can add users
      },
      
     {
        icon: 'fas fa-user-plus',
        title: 'Add Department',
        description: 'Create a new department',
        buttonText: 'Add Department',
        onClick: () => this.openAddDepartmentModal(),
        adminOnly: true // Only admins can add users
      },
     /*{
        icon: 'fas fa-bell',
        title: 'Notification Settings',
        description: 'Manage notification preferences',
        buttonText: 'Notification Settings',
        onClick: () => this.openNotificationSettingsModal(),
        adminOnly: true // Only admins can access notification settings
      }*/
    ];
  
    // If user is admin, show all actions, otherwise filter out admin-only actions
    return this.isAdmin 
      ? allActions 
      : allActions.filter(action => !action.adminOnly);
  }

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
 // toastr!: ToastrService;
  isAdmin: boolean | undefined;
  currentUserId: any;

  // Add these properties for file upload
  selectedFiles: File[] = [];
  isUploading = false;
  uploadProgress = 0;
  uploadMessage = '';
  uploadMessageType: 'success' | 'error' | 'info' = 'info';
  maxFileSize = 10 * 1024 * 1024; // 10MB
  allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private taskService: TaskService,
    private projectService: ProjectService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    //private toastr: ToastrService
  ) {
    // Initialize forms
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      projectId: ['', Validators.required],
      assigned_to: ['', Validators.required],
      priority: ['medium', Validators.required],
      status: ['pending', Validators.required],
      dueDate: [null, [Validators.required, this.futureDateValidator()]], // Make dueDate required
      comment: [''],
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
    futureDateValidator(): import('@angular/forms').ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null; // Let required validator handle empty values
      }
      
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part to compare dates only
      
      if (selectedDate < today) {
        return { 'invalidDate': true };
      }
      return null;
    };
  }
  ngOnInit(): void {
    // Set isAdmin based on current user's role
    const currentUser = this.authService.currentUserValue;
    console.log('Current user in dashboard:', currentUser);
    this.isAdmin = currentUser ? (currentUser.user?.role === 'admin' || currentUser.role === 'admin') : false;
    console.log('Is admin in dashboard:', this.isAdmin);
    
    // Load all data when component initializes
    this.loadAllData().catch(error => {
      console.error('Error loading dashboard data:', error);
    });
  }

  private async loadAllData(): Promise<void> {
    try {
      // Load projects and users in parallel
      await Promise.all([
        this.loadProjects(),
        this.loadUsers()
      ]);
      
      // Then load tasks which depends on projects
      await this.loadTasks();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }
  
// Add this method in your DashboardComponent class
formatDueDate(due_date: string | null): string {
  if (!due_date) return 'No due date';
  try {
    const date = new Date(due_date);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
  } catch (e) {
    return 'Invalid date';
  }
}
async loadProjects() {
  try {
    console.log('Loading projects...');
    const projects = await firstValueFrom(this.projectService.getProjects());
    console.log('Projects loaded:', projects);
    this.projects = projects;
  } catch (error) {
    console.error('Error loading projects:', error);
    this.toastr.error('Failed to load projects');
  }
}

  async loadUsers() {
    try {
      console.log('Fetching users...');
      const allUsers = await firstValueFrom(
        this.userService.getUsers().pipe(
          catchError(error => {
            if (error.status === 403) {
              console.log('User does not have permission to view all users');
              return of([]); // Return empty array if not authorized
            }
            throw error; // Re-throw other errors
          })
        )
      );
  
      if (!Array.isArray(allUsers)) {
        console.error('Expected users array but got:', typeof allUsers);
        return;
      }
  
      // Map the API response to our User model
      this.users = allUsers.map(user => ({
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        role: user.role || 'user',
        status: user.status || 'active',
        departmentId: user.departmentId || user.department || undefined,
        department: user.department
      }));
  
      console.log('Mapped users:', this.users);
      
      // Filter users by role for the dropdown
      this.managers = this.users.filter(user => user.role === 'manager' || user.role === 'admin');
      this.teamMembers = this.users.filter(user => user.role === 'user');
      
      console.log('Managers:', this.managers);
      console.log('Team Members:', this.teamMembers);
    } catch (error: any) {  
      console.error('Error loading users:', error);
      // No need for additional error handling here as we're already handling 403
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
   this.router.navigate(['/users/new']);
  }

  openAddProject() {
    console.log('Opening project form...');
    this.router.navigate(['/projects/new']);
  }

  createTask() {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formValue = this.taskForm.value;
    console.log('Form values before creating task:', formValue);
    
    const taskToCreate: Task = {
      ...this.newTask,
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      priority: formValue.priority,
      progress: formValue.progress,
      assigned_to: formValue.assigned_to,
      project_id: formValue.projectId,
      comments: formValue.comment || null,  // Make sure this is not undefined
      created_at: new Date().toISOString()
    };

    console.log('Task data being sent to backend:', taskToCreate);

    this.taskService.createTask(taskToCreate).subscribe(
      (response) => {
        console.log('Task created successfully:', response);
        this.modalService.dismissAll('success');
        this.taskForm.reset({
          priority: 'medium',
          status: 'pending',
          progress: 0,
          comment: ''  // Reset the comment field
        });
        this.loadTasks();
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
        console.log('Saving project with data:', formData);
        
        if (this.editProjectMode && this.selectedProject?.id) {
          console.log('Updating project with ID:', this.selectedProject.id);
          const updatedProject = await this.projectService
            .updateProject(this.selectedProject.id.toString(), formData)
            .toPromise();
          console.log('Project updated:', updatedProject);
        } else {
          console.log('Creating new project');
          const newProject = await this.projectService
            .createProject(formData)
            .toPromise();
          console.log('Project created:', newProject);
        }
        
        this.modalService.dismissAll();
        await this.loadProjects();
      } catch (error) {
        console.error('Error saving project:', error);
        // You might want to show an error message to the user here
      }
    } else {
      console.log('Form is invalid:', this.projectForm.errors);
      // You might want to show validation errors to the user here
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

  editTask(task: Task) {
    this.editMode = true;
    this.selectedTask = task;
    
    // Format due date for the form
    let dueDateValue = '';
    if (task.due_date) {
      const date = new Date(task.due_date);
      if (!isNaN(date.getTime())) {
        dueDateValue = date.toISOString().split('T')[0];
      }
    }

    this.taskForm.patchValue({
      title: task.title || '',
      description: task.description || '',
      projectId: task.project_id?.toString() || '',
      assigned_to: task.assigned_to?.toString() || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: dueDateValue,
      progress: task.progress || 0,
      comment: task.comments || '' // Map backend comments to frontend comment field
    });
    // Open the modal
    this.modalService.open(this.addTaskModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });
  }

  async onSubmit() {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
  
    try {
      this.taskForm.disable();
      const formValue = this.taskForm.value;
      
      // Format the due date
      const dueDate = formValue.dueDate ? new Date(formValue.dueDate).toISOString().split('T')[0] : null;
      
      // Prepare task data with proper field names for the backend
      const taskData = {
        title: formValue.title,
        description: formValue.description,
        project_id: formValue.projectId,
        assigned_to: formValue.assigned_to,
        priority: formValue.priority,
        status: formValue.status,
        progress: formValue.progress || 0,
        comments: formValue.comment || null,  // Changed from 'comment' to 'comments' to match backend
        due_date: dueDate 
      };
  
      console.log('Submitting task data:', taskData); // Debug log
  
      let taskId: number;
      
      // Handle task creation/update
      if (this.editMode && this.selectedTask) {
        // Update existing task
        const updatedTask = await firstValueFrom(this.taskService.updateTask(this.selectedTask.id, taskData));
        taskId = this.selectedTask.id; // Use existing task ID for file upload
        this.showUploadMessage('Task updated successfully', 'success');
      } else {
        // Create new task
        const newTask = await firstValueFrom(this.taskService.createTask(taskData));
        taskId = newTask.id; // Use new task ID for file upload
        this.showUploadMessage('Task created successfully', 'success');
      }
      
      // Upload files if any (for both create and update)
      if (this.selectedFiles.length > 0 && taskId) {
        console.log('Uploading files for task ID:', taskId);
        await this.uploadFiles(taskId);
      }
      
      // Refresh tasks and close modal
      this.loadTasks();
      this.dismissModal();
    } catch (error) {
      console.error('Error saving task:', error);
      this.showUploadMessage('Failed to save task. Please try again.', 'error');
    } finally {
      this.taskForm.enable();
    }
  }
  editTaskFromRecent(task: any) {
    // Load task details including comments
    this.taskService.getTaskById(task.id).subscribe({
      next: (taskDetails) => {
        // Open edit modal with task details
        this.editTask(taskDetails);
        
        // If you have a separate comments array in your task object
        if (taskDetails.comments) {
          this.taskComments[task.id] = Array.isArray(taskDetails.comments) 
            ? taskDetails.comments 
            : [taskDetails.comments];
        }
      },
      error: (error) => {
        console.error('Error loading task details:', error);
      }
    });
  }
  addComment(taskId: number) {
    if (!this.newComment[taskId]?.trim()) return;
    
    this.taskService.addTaskComment(taskId, this.newComment[taskId].trim()).subscribe({
      next: (response) => {
        if (response && response.success) {
          if (!this.taskComments[taskId]) {
            this.taskComments[taskId] = [];
          }
          this.taskComments[taskId].unshift(response.data || response);
          this.newComment[taskId] = '';
        }
      },
      error: (error) => {
        console.error('Error adding comment:', error);
      }
    });
  }
  dismissModal() {
    if (this.currentModalRef) {
      this.currentModalRef.dismiss('User dismissed the modal');
      this.currentModalRef = null;
    } else if (this.modalService.hasOpenModals()) {
      this.modalService.dismissAll('User dismissed the modal');
    }
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

  // Add these methods for file handling
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > this.maxFileSize) {
        this.showUploadMessage(`File ${file.name} exceeds maximum size of 10MB`, 'error');
        continue;
      }
      
      // Check file type
      if (!this.allowedFileTypes.includes(file.type)) {
        this.showUploadMessage(`File type not supported: ${file.name}`, 'error');
        continue;
      }
      
      // Add to selected files if not already added
      if (!this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.selectedFiles.push(file);
      }
    }
    
    // Reset file input to allow selecting the same file again
    event.target.value = '';
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  async uploadFiles(taskId: number): Promise<void> {
    if (this.selectedFiles.length === 0) return;
    
    this.isUploading = true;
    this.uploadProgress = 0;
    
    try {
      const formData = new FormData();
      this.selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 300);
      
      // Call the upload service
      await firstValueFrom(this.taskService.uploadTaskAttachments(taskId, formData));
      
      // Simulate upload completion
      await new Promise(resolve => setTimeout(resolve, 300));
      clearInterval(progressInterval);
      this.uploadProgress = 100;
      
      this.showUploadMessage('Files uploaded successfully', 'success');
      this.selectedFiles = [];
    } catch (error) {
      console.error('Error uploading files:', error);
      this.showUploadMessage('Failed to upload files. Please try again.', 'error');
    } finally {
      this.isUploading = false;
    }
  }

  private showUploadMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.uploadMessage = message;
    this.uploadMessageType = type;
    
    // Auto-hide message after 5 seconds
    if (type !== 'error') {
      setTimeout(() => {
        this.uploadMessage = '';
      }, 5000);
    }
  }

  ngOnDestroy(): void {
    // Clean up any remaining resources if needed
  }

  async loadTasks() {
    try {
      // First, ensure projects are loaded
      if (this.projects.length === 0) {
        await this.loadProjects();
      }
  
      // Load tasks
      const tasks = await firstValueFrom(this.taskService.getTasks());
      
      // Map project to each task
      this.tasks = tasks.map(task => {
        const taskWithProject: TaskWithProject = { 
          ...task,
          project: this.projects.find(p => p.id === task.project_id?.toString())
        };
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
}