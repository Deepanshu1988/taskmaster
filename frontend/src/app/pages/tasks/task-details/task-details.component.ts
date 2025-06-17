import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { TaskService } from '../../../services/task.service';
import { TimeTrackingService, TimeEntry, TimeSummary } from '../../../services/time-tracking.service';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css']
})
export class TaskDetailsComponent implements OnInit, OnDestroy {
  task: any;
  taskId: number | undefined;
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
  
  // Manual time entry form
  manualEntry = {
    date: new Date(),
    startTime: { hour: 9, minute: 0 } as NgbTimeStruct,
    endTime: { hour: 17, minute: 0 } as NgbTimeStruct,
    notes: ''
  };
  showManualEntry = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private timeTrackingService: TimeTrackingService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    // Update current time every second for the timer display
    this.timeUpdateInterval = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (taskId === null) {
      console.error('No task ID provided in the route');
      this.router.navigate(['/tasks']); // Redirect to tasks list or handle appropriately
      return;
    }
    
    this.taskId = +taskId;
    this.loadTaskDetails();
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
  }

  private loadTaskDetails(): void {
    if (this.taskId === undefined) {
      console.log('Loading task details for ID:', this.taskId);
      return;
    }
    
    this.taskService.getTaskById(this.taskId).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.task = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading task details:', error);
        this.toastr.error('Failed to load task details');
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
    updateTimeSummary() {
        throw new Error('Method not implemented.');
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
}
