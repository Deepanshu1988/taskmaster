import { Component, Input, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AttachmentService, TaskAttachment } from '../../../services/attachment.service';
import { finalize } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import { AuthService } from '../../../services/auth.service';
import { TaskService } from '../../../services/task.service';
import { ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import * as bootstrap from 'bootstrap';
import { FileSizePipe } from './file-size.pipe';
@Component({
  selector: 'app-task-attachments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FileSizePipe],
  templateUrl: './task-attachments.component.html',
  styleUrls: ['./task-attachments.component.css']
})
export class TaskAttachmentsComponent implements OnInit {
  [x: string]: any;
  @Input() task: any;
  @Output() uploadComplete = new EventEmitter<void>();
  userCache: {[key: number]: string} = {};

  tasks: any[] = [];
  taskId: number | null = null;
  canEdit: boolean = true;
  attachments: TaskAttachment[] = [];
  isUploading = false;
  uploadProgress = 0;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isDragging = false;
  searchQuery: string = '';
filteredTasks: any[] = [];
currentAttachmentId: number | null = null;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isLoading!: boolean;
  isDeleting!: number;
  selectedTask: any = null;
  projects: any[] = [];
  users: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private attachmentService: AttachmentService,
    private authService: AuthService,
    private taskService: TaskService,
    private userService: UserService,
    private cdRef: ChangeDetectorRef
  ) {
    this.uploadForm = this.fb.group({
      file: [null, Validators.required]
    });
  }
  filterTasks(): void {
    if (!this.searchQuery.trim()) {
      this.filteredTasks = [...this.tasks];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredTasks = this.tasks.filter(task => 
      task.title.toLowerCase().includes(query) || 
      (task.description && task.description.toLowerCase().includes(query))
    );
  }
  clearFile(): void {
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
      this.filteredTasks = [...this.tasks];
    }
  }

  ngOnInit(): void {
    console.log('TaskAttachmentsComponent - ngOnInit');
    this.loadTasks();
    
    if (this.task?.id) {
      this.taskId = +this.task.id;
      this.checkEditPermissions();
      this.loadAttachments();
    } else {
      this.route.paramMap.subscribe(params => {
        const taskId = params.get('taskId') || params.get('id');
        if (taskId) {
          this.taskId = +taskId;
          this.checkEditPermissions();
          this.loadAttachments();
        } else {
          console.warn('No taskId found in route params');
        }
      });
    }
  }

  private loadTasks(): void {
    this.isLoading = true;
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.filteredTasks = [...tasks];
        this.isLoading = false;
  
        // Pre-fetch user data for all tasks
        tasks.forEach(task => {
          if (task.assigned_to) {
            this.fetchUserDetails(task.assigned_to);
          }
        });
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.showMessage('Failed to load tasks', 'error');
        this.isLoading = false;
      }
    });
  }

  onTaskSelect(taskId: number | null): void {
    if (!taskId) {
      this.selectedTask = null;
      return;
    }
    
    console.log('Selected task ID:', taskId);
    const task = this.tasks.find(t => t.id === taskId);
    console.log('Found task:', task);
    
    if (!task) {
      this.selectedTask = null;
      return;
    }
  
    // Log all task properties to see what's available
    console.log('Task properties:', Object.keys(task));
    console.log('Assignee object:', task.assignee);
    console.log('assigned_to_name:', task.assigned_to_name);
    console.log('assigned_to:', task.assigned_to);
  
    // Ensure assignee name is set
    this.selectedTask = {
      ...task,
      assigned_to_name: task.assigned_to_name || 
                       task.assignee?.name || 
                       task.assignee?.username || 
                       task.assignee?.email?.split('@')[0] || 
                       'Unassigned'
    };
    
    console.log('Final selected task:', this.selectedTask);
    this.taskId = taskId;
    this.loadAttachments();
  }
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile || !this.taskId) {
      this.showMessage('Please select a file and a task', 'error');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.attachmentService.uploadFile(this.taskId, formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          this.showMessage('File uploaded successfully', 'success');
          this.loadAttachments();
          this.uploadForm.reset();
          this.selectedFile = null;
          this.uploadProgress = 0;
        }
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.showMessage('Failed to upload file', 'error');
        this.uploadProgress = 0;
      },
      complete: () => {
        this.isUploading = false;
      }
    });
  }

  private loadAttachments(): void {
    if (!this.taskId) return;
    
    this.isLoading = true;
    this.attachmentService.getTaskAttachments(this.taskId).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading attachments:', error);
        this.showMessage('Failed to load attachments', 'error');
        this.isLoading = false;
      }
    });
  }
// In task-attachments.component.ts
// In task-attachments.component.ts
getAssigneeName(task: any): string {
  if (!task) return 'Unassigned';
  
  // If we have a direct name, use it
  if (task.assigned_to_name && task.assigned_to_name !== 'Unassigned') {
    return task.assigned_to_name;
  }
  
  // If we have an assignee object with name
  if (task.assignee?.name) {
    return task.assignee.name;
  }
  
  // If we have an assigned_to ID but no name yet, fetch it
  if (task.assigned_to) {
    // Check cache first
    if (this.userCache[task.assigned_to]) {
      return this.userCache[task.assigned_to];
    }
    
    // If not in cache, fetch the user details
    this.fetchUserDetails(task.assigned_to);
    return 'Loading...';
  }
  
  return 'Unassigned';
}
// Add this method to fetch user details
private fetchUserDetails(userId: number): void {
  console.log('Fetching user details for ID:', userId);
  if (this.userCache[userId]) {
    console.log('User already in cache:', this.userCache[userId]);
    return;
  }

  // Mark as loading
  this.userCache[userId] = 'Loading...';
  console.log('Current cache state:', this.userCache);

  this.userService.getUserById(userId).subscribe({
    next: (user) => {
      console.log('Raw user data received:', user);
      if (user && (user.name || user.username)) {
        const userName = user.name || user.username;
        console.log('Setting user name:', userName);
        this.userCache[userId] = userName;
        console.log('Updated cache:', this.userCache);
        
        // Force change detection
        this.cdRef.detectChanges();
      } else {
        console.warn('User data missing name/username:', user);
        this.userCache[userId] = 'Unknown User';
      }
    },
    error: (error) => {
      console.error('Error fetching user:', error);
      console.error('Error details:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url
      });
      this.userCache[userId] = 'Error';
      this.cdRef.detectChanges();
    }
  });
}
  downloadFile(attachment: TaskAttachment): void {
    this.attachmentService.downloadFile(attachment.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (error) => {
        console.error('Error downloading file:', error);
        this.showMessage('Failed to download file', 'error');
      }
    });
  }

  deleteAttachment(attachmentId: number): void {
    if (!attachmentId) return;
    
    this.attachmentService.deleteFile(attachmentId).subscribe({
      next: () => {
        this.showMessage('Attachment deleted successfully', 'success');
        this.loadAttachments();
        this['currentAttachmentId'] = null;
        // Hide the modal
        const modalElement = document.getElementById('deleteAttachmentModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal?.hide();
        }
      },
      error: (error) => {
        console.error('Error deleting attachment:', error);
        this.showMessage('Error deleting attachment', 'error');
      }
    });
  }
  confirmDelete(attachment: any): void {
    this['currentAttachmentId'] = attachment.id;
    // Show the modal
    const modalElement = document.getElementById('deleteAttachmentModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }
  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.message = message;
    this.messageType = type;
    
    // Auto-hide message after 5 seconds
    if (type !== 'info') {
      setTimeout(() => {
        this.message = '';
      }, 5000);
    }
  }

  private checkEditPermissions(): void {
    if (!this.authService.currentUser || !this.taskId) {
      this.canEdit = false;
      return;
    }
    
    this.authService.currentUser.subscribe(user => {
      if (user) {
        // Allow if user is admin, task creator, or assigned to the task
        this.taskService.getTaskById(this.taskId!).subscribe(task => {
          this.canEdit = user.role === 'admin' || 
                       user.id === task.created_by || 
                       user.id === task.assigned_to;
        });
      } else {
        this.canEdit = false;
      }
    });
  }

  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  formatFileSizeCustom(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.onFileChange({ target: { files } });
    }
  }
  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'bi-file-earmark-pdf';
      case 'doc':
      case 'docx': return 'bi-file-earmark-word';
      case 'xls':
      case 'xlsx': return 'bi-file-earmark-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'bi-file-earmark-image';
      case 'zip':
      case 'rar': return 'bi-file-earmark-zip';
      default: return 'bi-file-earmark-text';
    }
  }

  getFileIconCustom(fileType: string): string {
    if (!fileType) return 'fa-file';
    
    if (fileType.startsWith('image/')) return 'fa-file-image';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.startsWith('text/')) return 'fa-file-alt';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel')) return 'fa-file-excel';
    if (fileType.includes('powerpoint')) return 'fa-file-powerpoint';
    if (fileType.includes('zip') || fileType.includes('compressed')) return 'fa-file-archive';
    
    return 'fa-file';
  }
  
}
