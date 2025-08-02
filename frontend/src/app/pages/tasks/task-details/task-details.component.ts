import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { TaskService, TaskComment } from '../../../services/task.service';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription, interval } from 'rxjs';
import { TimeEntry, TimeSummary, TimeTrackingService } from '../../../services/time-tracking.service';
import { TaskAttachmentsComponent } from '../task-attachments/task-attachments.component';
import * as saveAs from 'file-saver';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NgbModule,
    TaskAttachmentsComponent  
  ],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css']
})
export class TaskDetailsComponent implements OnInit, OnDestroy {
  task: any = null;
  taskId: number | undefined;
  isLoading: boolean = false;
  canEdit: boolean = false;
  timeEntries: TimeEntry[] = [];
  timeSummary: TimeSummary = {
    totalEntries: 0,
    totalTime: 0,
    activeEntries: 0,
    formattedTime: '00:00:00'
  };
  activeEntry: TimeEntry | null = null;
  currentTime: Date = new Date();
  private timerSubscription: Subscription | undefined;
  private timeUpdateInterval: Subscription;
  
  // Comments
  comments: any[] = [];
  newComment = '';
  editingComment: { id: number | null, content: string } = { id: null, content: '' };
  currentUserId: number | null = null;
  
  // Manual time entry form
  manualEntry = {
    date: new Date(),
    startTime: { hour: 9, minute: 0 } as NgbTimeStruct,
    endTime: { hour: 17, minute: 0 } as NgbTimeStruct,
    notes: ''
  };
  showManualEntry = false;

  // File upload and delete
  isUploading = false;
  uploadProgress = 0;
  isDeleting: number | null = null;

  private subscriptions = new Subscription();
  isLoadingComments!: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private timeTrackingService: TimeTrackingService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.currentUserId = this.authService['getUserId']();
    // Update current time every second for the timer display
    this.timeUpdateInterval = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    console.log('Task ID from route:', this.taskId);
    if (taskId === null) {
      console.error('No task ID provided in the route');
      this.router.navigate(['/tasks']); // Redirect to tasks list or handle appropriately
      return;
    }
    
    this.taskId = +taskId;
    this.loadTask(this.taskId);
    this.loadComments(this.taskId);
    this.loadTimeData();
    this.checkActiveTimer();
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.timeUpdateInterval) {
      this.timeUpdateInterval.unsubscribe();
    }
    this.subscriptions.unsubscribe();
  }

  loadTask(taskId: number): void {
    this.isLoading = true;
    this.taskService.getTaskById(taskId).subscribe({
      next: (task) => {
        this.task = task;
        // Initialize comments from task data
        this.comments = task.comments || [];
        this.checkEditPermissions();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading task:', error);
        this.isLoading = false;
        this.toastr.error('Failed to load task details');
      }
    });
  }

  loadComments(taskId: number): void {
    if (!taskId) return;
    
    this.isLoadingComments = true;
    this.taskService.getTaskComments(taskId).subscribe({
      next: (comments) => {
        console.log('Received comments:', comments);
        this.comments = comments;
        this.isLoadingComments = false;
      },
      error: (error) => {
        console.error('Failed to load comments:', error);
        this.isLoadingComments = false;
      }
    });
  }

  private loadTimeData(): void {
    if (this.taskId === undefined) {
      console.log('Loading time data for task ID:', this.taskId);
      return;
    }
  
    this.timeTrackingService.getTaskTimeEntries(this.taskId).subscribe({
      next: (response: any) => {
        if (response.success && Array.isArray(response.data)) {
          this.timeEntries = response.data;
          this.updateTimeSummary();
        }
      },
      error: (error: any) => {
        console.error('Error loading time entries:', error);
        this.toastr.error('Failed to load time entries');
      }
    });
    this.timeTrackingService.getTaskTimeSummary(this.taskId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.timeSummary = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading time summary:', error);
      }
    });
  }

  private checkActiveTimer(): void {
    if (this.taskId === undefined) {
      console.error('Task ID is not defined');
      return;
    }
  
    this.timeTrackingService.getActiveTimeEntry().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activeEntry = response.data;
          if (this.activeEntry.task_id === this.taskId) {
            this.startTimer();
          }
        }
      },
      error: (error) => {
        console.error('Error checking active timer:', error);
      }
    });
  }

  private checkEditPermissions(): void {
    if (!this.task) {
      this.canEdit = false;
      return;
    }
    
    this.authService.currentUser.subscribe({
      next: (currentUser) => {
        if (!currentUser) {
          this.canEdit = false;
          return;
        }
        
        const isAdmin = currentUser.role === 'admin';
        const isCreator = this.task?.created_by === currentUser.id;
        const isAssigned = this.task?.assigned_to === currentUser.id;
        
        this.canEdit = isAdmin || isCreator || isAssigned;
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.canEdit = false;
      }
    });
  }

  startTimer(notes: string = ''): void {
    if (this.taskId === undefined) {
      console.error('Cannot start timer: Task ID is not defined');
      this.toastr.error('Cannot start timer: Task not found');
      return;
    }
  
    this.timeTrackingService.startTracking(this.taskId, notes).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Time tracking started');
          this.loadTimeData();
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

  stopTimer(notes: string = ''): void {
    if (!this.activeEntry || this.activeEntry.id === undefined) {
      console.error('Cannot stop timer: No active time entry');
      this.toastr.error('No active time entry to stop');
      return;
    }
  
    this.timeTrackingService.stopTracking(this.activeEntry.id, notes).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Time tracking stopped');
          this.activeEntry = null;
          this.loadTimeData();
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

  addComment(): void {
    if (!this.newComment.trim() || !this.taskId) return;
    
    this.subscriptions.add(
      this.taskService.addTaskComment(this.taskId, this.newComment.trim()).subscribe({
        next: (comment) => {
          this.comments.unshift(comment);
          this.newComment = '';
          this.toastr.success('Comment added');
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.toastr.error('Failed to add comment');
        }
      })
    );
  }

  startEditing(comment: TaskComment): void {
    this.editingComment = { id: comment.id, content: comment.comment };
  }

  cancelEditing(): void {
    this.editingComment = { id: null, content: '' };
  }

  updateComment(commentId: number): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (!comment || !this.editingComment.content.trim()) return;
    
    this.subscriptions.add(
      this.taskService.updateComment(commentId, this.editingComment.content.trim()).subscribe({
        next: (updatedComment) => {
          const index = this.comments.findIndex(c => c.id === commentId);
          if (index !== -1) {
            this.comments[index] = updatedComment;
          }
          this.cancelEditing();
          this.toastr.success('Comment updated');
        },
        error: (error) => {
          console.error('Error updating comment:', error);
          this.toastr.error('Failed to update comment');
        }
      })
    );
  }

  deleteComment(commentId: number): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    this.subscriptions.add(
      this.taskService.deleteComment(commentId).subscribe({
        next: (success) => {
          if (success) {
            this.comments = this.comments.filter(c => c.id !== commentId);
            this.toastr.success('Comment deleted');
          }
        },
        error: (error) => {
          console.error('Error deleting comment:', error);
          this.toastr.error('Failed to delete comment');
        }
      })
    );
  }

  isCommentOwner(comment: TaskComment): boolean {
    return comment.user_id === this.currentUserId;
  }

  addManualEntry(): void {
    if (!this.manualEntry.date || !this.manualEntry.startTime || !this.manualEntry.endTime) {
      this.toastr.warning('Please fill in all required fields');
      return;
    }

    // Create start and end date objects
    const startDate = new Date(this.manualEntry.date);
    startDate.setHours(this.manualEntry.startTime.hour, this.manualEntry.startTime.minute);
    
    const endDate = new Date(this.manualEntry.date);
    endDate.setHours(this.manualEntry.endTime.hour, this.manualEntry.endTime.minute);

    // Validate dates
    if (startDate >= endDate) {
      this.toastr.warning('End time must be after start time');
      return;
    }

    // Calculate duration in seconds
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

    // Create a time entry with the calculated duration
    const timeEntry: Partial<TimeEntry> = {
      task_id: this.taskId,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: duration,
      notes: this.manualEntry.notes
    };

    // Here you would typically call your API to save the manual entry
    // For now, we'll just add it to the local entries array
    this.timeEntries.unshift({
      ...timeEntry as TimeEntry,
      id: Date.now(), // Temporary ID
      user_id: this.authService.currentUserValue?.id || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      formatted_duration: this.timeTrackingService.formatDuration(duration)
    });

    // Update the total time
    this.timeSummary.totalTime += duration;
    this.timeSummary.totalEntries++;
    this.timeSummary.formattedTime = this.timeTrackingService.formatDuration(this.timeSummary.totalTime);

    // Reset the form
    this.manualEntry = {
      date: new Date(),
      startTime: {
          hour: 9, minute: 0,
          second: 0
      },
      endTime: {
          hour: 17, minute: 0,
          second: 0
      },
      notes: ''
    };
    this.showManualEntry = false;

    this.toastr.success('Manual time entry added');
  }

  deleteTimeEntry(entryId: number): void {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    this.timeTrackingService.deleteTimeEntry(entryId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Time entry deleted');
          this.loadTimeData();
        } else {
          this.toastr.error(response.message || 'Failed to delete time entry');
        }
      },
      error: (error) => {
        console.error('Error deleting time entry:', error);
        this.toastr.error('Failed to delete time entry');
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getCurrentDuration(entry: TimeEntry): string {
    if (entry.end_time) {
      return this.timeTrackingService.formatDuration(entry.duration || 0);
    }
    
    const start = new Date(entry.start_time);
    const duration = Math.floor((this.currentTime.getTime() - start.getTime()) / 1000);
    return this.timeTrackingService.formatDuration(duration);
  }

  isCurrentUserEntry(entry: TimeEntry): boolean {
    return entry.user_id === this.authService.currentUserValue?.id;
  }

  toggleManualEntry(): void {
    this.showManualEntry = !this.showManualEntry;
  }

  updateTimeSummary() {
    throw new Error('Method not implemented.');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileType: string): string {
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

  downloadAttachment(attachment: any, event?: Event): void {
    // Prevent default anchor behavior if event is provided
    if (event) {
      event.preventDefault();
    }
    
    if (!attachment || !attachment.id) {
      console.error('Invalid attachment data');
      this.toastr.error('Invalid attachment');
      return;
    }
    
    this.taskService.downloadFile(attachment.id).subscribe({
      next: (blob: Blob) => {
        saveAs(blob, attachment.file_name || 'download');
      },
      error: (error: any) => {
        console.error('Error downloading file:', error);
        this.toastr.error('Failed to download file. Please try again.');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
    }
  }

  uploadFile(file: File): void {
    if (!this.task?.id || this.taskId === undefined) {
        this.toastr.error('No task selected');
        return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', this.task.id.toString());

    this.taskService.uploadTaskAttachment(this.task.id, formData).subscribe({
        next: (event: any) => {
            if (event.type === 1) {
                this.uploadProgress = Math.round((100 * event.loaded) / (event.total || 1));
            } else if (event.type === 4) {
                this.isUploading = false;
                this.uploadProgress = 0;
                this.toastr.success('File uploaded successfully');
                if (this.taskId !== undefined) {
                    this.loadTask(this.taskId);
                }
            }
        },
        error: (error) => {
            console.error('Error uploading file:', error);
            this.isUploading = false;
            this.uploadProgress = 0;
            this.toastr.error('Failed to upload file. Please try again.');
        }
    });
}

  deleteAttachment(attachmentId: number): void {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    this.isDeleting = attachmentId;
    this.taskService.deleteTaskAttachment(attachmentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Attachment deleted successfully');
          // Remove the deleted attachment from the list
          if (this.task?.attachments) {
            this.task.attachments = this.task.attachments.filter((a: { id: number; }) => a.id !== attachmentId);
          }
        } else {
          this.toastr.error(response.message || 'Failed to delete attachment');
        }
        this.isDeleting = null;
      },
      error: (error) => {
        console.error('Error deleting attachment:', error);
        this.toastr.error('An error occurred while deleting the attachment');
        this.isDeleting = null;
      }
    });
  }
}
