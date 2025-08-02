import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TaskComment, TaskService } from '../../services/task.service';
import { ProjectService } from '../../services/project.service';
import { UserService } from '../../services/user.service';
import { Task } from '../../models/task.model';
import { Project } from '../../models/project.model';
import { User } from '../../models/user.model';
import { catchError, EMPTY, firstValueFrom, forkJoin, of, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

//import { TaskAttachment } from '../../models/task.model';

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
export class TasksComponent implements OnInit, OnDestroy {
  //tasks: any[] = [];
  @ViewChild('addTaskModal') addTaskModal!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  // Form properties
  taskForm!: FormGroup;
  editMode = false;
  selectedTask: Task | null = null;

  // Data properties
  tasks: TaskWithProjectAndAssignee[] = [];
  projects: Project[] = [];
  users: User[] = [];
  filteredTasks: TaskWithProjectAndAssignee[] = [];
  isAdmin: boolean = false;
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
  

  // Add these properties to the TasksComponent class
  showComments: { [taskId: number]: boolean } = {};
  taskComments: { [taskId: number]: TaskComment[] } = {};
  newComment: { [taskId: number]: string } = {};
  editingComment: { [taskId: number]: { id: number | null, content: string } } = {};
  selectedFiles: File[] = [];
  isUploading = false;
  uploadProgress = 0;
  isDragging = false;
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
    private userService: UserService,
    private authService: AuthService,
    private router: Router


  ) {
    this.isAdmin = this.authService.isAdmin;
    this.taskService.authService = this.authService;
  }

  ngOnInit(): void {
    this.initializeForm();
   // this.checkAdminStatus();
    this.loadInitialData();
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
      comments: [''],  
      progress: [0, [
        Validators.required, 
        Validators.min(0), 
        Validators.max(100),
        Validators.pattern('^[0-9]*$')
      ]]
    });
  }

  private loadInitialData(): void {
    // Load all required data in parallel
    forkJoin([
      this.taskService.getTasks(),
      this.projectService.getProjects(),
      this.userService.getUsers(),
      this.taskService.getTaskCounts()
    ]).pipe(
      tap(([tasks, projects, users, counts]) => {
        // Update tasks
        this.tasks = (tasks as TaskWithProjectAndAssignee[]).sort((a, b) => (b.id || 0) - (a.id || 0));
        this.filteredTasks = [...this.tasks];
        
        // Update projects and users
        this.projects = projects as Project[];
        this.users = users as User[];
        
        // Update counts
        this.taskCounts = counts;
      }),
      catchError(error => {
        console.error('Error loading initial data:', error);
        return of(null);
      })
    ).subscribe();
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

  editTask(task: Task) {
    console.log('Editing task:', task);
    this.editMode = true;
    this.selectedTask = task;

    // Format due date
    let dueDateValue = '';
    if (task.due_date || task.dueDate) {
      const date = task.due_date || task.dueDate;
      if (date && !isNaN(new Date(date).getTime())) {
        dueDateValue = new Date(date).toISOString().split('T')[0];
      }
    }

    // Ensure progress is a number between 0-100
    let progressValue = 0;
    if (task.progress !== undefined && task.progress !== null) {
      progressValue = Math.min(100, Math.max(0, Number(task.progress)));
    }

    // Load comments for this task
    if (task.id) {
      this.loadTaskComments(task.id);
    }

    // Set form values including comments
    this.taskForm.patchValue({
      title: task.title || '',
      description: task.description || '',
      project_id: task.project_id || null,
      assigned_to: task.assigned_to || null,
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: dueDateValue,
      progress: progressValue,
      comments: task.comments,  // Ensure comments are properly set
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

  async onSubmit(modal: any) {
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
      let dueDateValue = formValue.dueDate;
      if (dueDateValue) {
        if (dueDateValue instanceof Date) {
          dueDateValue = dueDateValue.toISOString().split('T')[0];
        } 
        else if (typeof dueDateValue === 'string') {
          // If it's already a string, ensure it's in the correct format
          dueDateValue = new Date(dueDateValue).toISOString().split('T')[0];
        }
      }

      // Prepare task data with proper field names
      const taskData: any = {
        title: formValue.title,
        description: formValue.description,
        project_id: formValue.project_id ? Number(formValue.project_id) : null,
        assigned_to: formValue.assigned_to ? Number(formValue.assigned_to) : null,
        priority: formValue.priority,
        status: formValue.status,
        due_date: dueDateValue,
        progress: progressValue,
        comments: formValue.comments || ''
      };

      console.log('Submitting task data:', taskData);

      let result: Task;
      if (this.editMode && this.selectedTask) {
        // Update existing task
        result = await firstValueFrom(this.taskService.updateTask(this.selectedTask.id, taskData));
      } else {
        // Create new task
        result = await firstValueFrom(this.taskService.createTask(taskData));
      }

      // Handle file uploads if there are any selected files
      if (this.selectedFiles.length > 0) {
        try {
          await this.uploadFiles(result.id);
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          // Continue with the task creation even if file upload fails
        }
      }

      // Reload tasks and reset form
      this.loadInitialData();
      this.resetForm();
      this.selectedFiles = [];
      
      // Close the modal after a short delay to show success message
      setTimeout(() => {
        if (modal && typeof modal.close === 'function') {
          modal.close('Task saved successfully');
        } else {
          this.modalService.dismissAll();
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Error saving task:', error);
      this.uploadMessage = error?.error?.message || error?.message || 'Failed to save task. Please try again.';
      this.uploadMessageType = 'error';
    } finally {
      this.taskForm.enable();
    }
  }
  resetForm() {
    this.taskForm.reset({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      projectId: null,
      assignedTo: null,
      dueDate: null,
      progress: 0,
      comments: ''
    });
    this.selectedTask = null;
    this.editMode = false;
    this.uploadMessage = '';
    this.uploadMessageType = 'info';
    this.uploadProgress = 0;
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

  async deleteTask(task: Task | number) {
    console.log('Delete task clicked');
    
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const taskId = typeof task === 'number' ? task : task.id;
        console.log('Attempting to delete task ID:', taskId);
        
        const result = await firstValueFrom(this.taskService.deleteTask(taskId));
        console.log('Delete API response:', result);
        
        // Remove the task from the local arrays
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.filteredTasks = this.filteredTasks.filter(t => t.id !== taskId);
        
        console.log('Task removed from local state');
        alert('Task deleted successfully');
      } catch (error: unknown) {
        console.error('Error deleting task:', error);
        let errorMessage = 'Failed to delete task. ';
        
        if (error && typeof error === 'object') {
          // Handle error (existing error handling code)
        }
        alert(errorMessage);
      }
    }
  }

  dismissModal() {
    this.modalService.dismissAll();
  }

  // Add these methods to the TasksComponent class
  toggleComments(taskId: number): void {
    this.showComments[taskId] = !this.showComments[taskId];
    if (this.showComments[taskId] && !this.taskComments[taskId]) {
      this.loadTaskComments(taskId);
    }
  }

  private loadTaskComments(taskId: number): void {
    this.taskService.getTaskComments(taskId).subscribe({
      next: (comments) => {
        this.taskComments[taskId] = comments;
        // If there are comments, update the form's comments field
        if (comments && comments.length > 0) {
          // If you want to show all comments, join them with newlines
          const commentText = comments.map(c => c.comment).join('\n\n');
          this.taskForm.patchValue({
            comments: commentText
          });
        }
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  addComment(taskId: number): void {
    try {
      if (!this.newComment[taskId]?.trim()) return;
      
      console.log('Adding comment:', {
        taskId,
        comment: this.newComment[taskId].trim()
      });
    
      this.taskService.addTaskComment(taskId, this.newComment[taskId].trim()).subscribe({
        next: (response) => {
          console.log('Comment added:', response);
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
          console.error('Error details:', error.error);
        }
      });
    } catch (error) {
      console.error('Unexpected error in addComment:', error);
    }
  }

  startEditingComment(taskId: number, comment: TaskComment): void {
    this.editingComment[taskId] = { id: comment.id, content: comment.comment };
  }

  cancelEditingComment(taskId: number): void {
    this.editingComment[taskId] = { id: null, content: '' };
  }

  updateComment(taskId: number, commentId: number): void {
    const content = this.editingComment[taskId]?.content;
    if (!content?.trim()) return;
    
    this.taskService.updateComment(commentId, content.trim()).subscribe({
      next: (updatedComment) => {
        const comments = this.taskComments[taskId] || [];
        const index = comments.findIndex(c => c.id === commentId);
        if (index !== -1) {
          comments[index] = updatedComment;
        }
        this.cancelEditingComment(taskId);
      },
      error: (error) => {
        console.error('Error updating comment:', error);
        // alert('Failed to update comment');
      }
    });
  }

  deleteComment(taskId: number, commentId: number): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    this.taskService.deleteComment(commentId).subscribe({
      next: (success) => {
        if (success) {
          this.taskComments[taskId] = (this.taskComments[taskId] || []).filter(c => c.id !== commentId);
        }
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
        // alert('Failed to delete comment');
      }
    });
  }

  isCommentOwner(comment: TaskComment): boolean {
    return comment.user_id === this.authService['getUserId']();
  }
  onFileSelected(event: any, taskId: number): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    this.selectedFiles = Array.from(files);
    this.uploadMessage = '';
    this.uploadMessageType = 'info';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }
  
  onFileDropped(event: DragEvent, taskId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files, taskId);
    }
  }

  private handleFiles(files: FileList, taskId: number): void {
    this.uploadMessage = '';
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > this.maxFileSize) {
        this.uploadMessage = `File ${file.name} exceeds maximum size of 10MB`;
        this.uploadMessageType = 'error';
        continue;
      }
      
      // Check file type
      if (!this.allowedFileTypes.includes(file.type)) {
        this.uploadMessage = `File type not supported: ${file.name}`;
        this.uploadMessageType = 'error';
        continue;
      }
      
      // Add to selected files if not already added
      if (!this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.selectedFiles.push(file);
      }
    }
  }
  
  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }
  
  getFileIcon(file: File): string {
    const type = file.type.split('/')[0];
    switch (type) {
      case 'image':
        return 'bi-file-image';
      case 'application':
        if (file.type.includes('pdf')) return 'bi-file-pdf';
        if (file.type.includes('word') || file.type.includes('document')) return 'bi-file-word';
        if (file.type.includes('excel') || file.type.includes('sheet')) return 'bi-file-excel';
        return 'bi-file-text';
      case 'text':
        return 'bi-file-text';
      default:
        return 'bi-file';
    }
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
      this.selectedFiles = []; // Clear selected files after successful upload
    } catch (error) {
      console.error('Error uploading files:', error);
      this.showUploadMessage('Failed to upload files. Please try again.', 'error');
      throw error; // Re-throw the error to be caught by the calling method
    } finally {
      this.isUploading = false;
    }
  }
  showUploadMessage(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }

  ngOnDestroy(): void {
    // Close any open modals
    this.modalService.dismissAll();
  }
}
