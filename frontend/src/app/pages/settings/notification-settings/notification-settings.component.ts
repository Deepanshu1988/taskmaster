import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { NotificationService } from '../../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {  FormControl } from '@angular/forms';
interface NotificationPreference {
  enabled: boolean;
  taskReminders?: boolean;
  dueDateAlerts?: boolean;
  statusUpdates?: boolean;
  mentions?: boolean;
}

interface NotificationPreferences {
  email: NotificationPreference;
  in_app: NotificationPreference;
  push: NotificationPreference;
}

@Component({
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule
  ],
  selector: 'app-notification-settings',
  templateUrl: './notification-settings.component.html',
  styleUrls: ['./notification-settings.component.css']
})
export class NotificationSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = true;
  isSaving = false;
  settingsForm: FormGroup;
  
  // Default preferences structure
  defaultPreferences: NotificationPreferences = {
    email: { enabled: true, taskReminders: true, dueDateAlerts: true, statusUpdates: true },
    in_app: { enabled: true, taskReminders: true, mentions: true, statusUpdates: true },
    push: { enabled: false, taskReminders: false, mentions: false }
  };
    isTesting: boolean | undefined;
    activeModal: any;
  emailGroup: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private notificationService: NotificationService,
    private modalService: NgbModal
  ) {
    this.settingsForm = this.createForm();
  }

  ngOnInit() {
    this.settingsForm = this.createForm();
    this.emailGroup = this.settingsForm.get('email') as FormGroup;  // Initialize emailGroup
    this.loadUserPreferences();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserPreferences() {
    this.userService.getCurrentUser().subscribe({
      next: (user: { notificationPreferences: { email: any; in_app: any; push: any; }; }) => {
        if (user?.notificationPreferences) {
          this.settingsForm.patchValue({
            email: user.notificationPreferences.email || this.defaultPreferences.email,
            in_app: user.notificationPreferences.in_app || this.defaultPreferences.in_app,
            push: user.notificationPreferences.push || this.defaultPreferences.push
          });
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading user preferences:', error);
        this.isLoading = false;
      }
    });
  }

// Add these getters to your component class
get emailEnabled(): FormControl {
  return (this.emailGroup?.get('enabled') || new FormControl(true)) as FormControl;
}

get emailTaskReminders(): FormControl {
  return (this.emailGroup?.get('taskReminders') || new FormControl(true)) as FormControl;
}

get emailDueDateAlerts(): FormControl {
  return (this.emailGroup?.get('dueDateAlerts') || new FormControl(true)) as FormControl;
}

get emailStatusUpdates(): FormControl {
  return (this.emailGroup?.get('statusUpdates') || new FormControl(true)) as FormControl;
}

get inAppEnabled(): FormControl {
  return (this.settingsForm?.get('in_app.enabled') || new FormControl(true)) as FormControl;
}

get inAppTaskReminders(): FormControl {
  return (this.settingsForm?.get('in_app.taskReminders') || new FormControl(true)) as FormControl;
}

get inAppMentions(): FormControl {
  return (this.settingsForm?.get('in_app.mentions') || new FormControl(true)) as FormControl;
}

get inAppStatusUpdates(): FormControl {
  return (this.settingsForm?.get('in_app.statusUpdates') || new FormControl(true)) as FormControl;
}

get pushEnabled(): FormControl {
  return (this.settingsForm?.get('push.enabled') || new FormControl(false)) as FormControl;
}

get pushTaskReminders(): FormControl {
  return (this.settingsForm?.get('push.taskReminders') || new FormControl(false)) as FormControl;
}

get pushMentions(): FormControl {
  return (this.settingsForm?.get('push.mentions') || new FormControl(false)) as FormControl;
}

  private createForm(): FormGroup {
    return this.fb.group({
      email: this.fb.group({
        enabled: [true],
        taskReminders: [true],
        dueDateAlerts: [true],  // Make sure this matches exactly with template
        statusUpdates: [true]
      }),
      in_app: this.fb.group({
        enabled: [true],
        taskReminders: [true],
        mentions: [true],
        statusUpdates: [true]
      }),
      push: this.fb.group({
        enabled: [false],
        taskReminders: [false],
        mentions: [false]
      })
    });
  }

  onPreferenceChange(type: 'email' | 'in_app') {
    const control = this.settingsForm.get(type) as FormGroup;
    if (control) {
      const isEnabled = control.get('enabled')?.value;
      Object.keys(control.controls).forEach(key => {
        if (key !== 'enabled') {
          const controlToToggle = control.get(key);
          if (controlToToggle) {
            isEnabled ? controlToToggle.enable() : controlToToggle.disable();
          }
        }
      });
    }
  }
  onPushNotificationChange() {
    const pushControl = this.settingsForm.get('push') as FormGroup;
    if (pushControl) {
      const isEnabled = pushControl.get('enabled')?.value;
      if (isEnabled && !('Notification' in window)) {
        alert('Push notifications are not supported in your browser');
        pushControl.get('enabled')?.setValue(false);
        return;
      }
      
      if (isEnabled && Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
          if (permission !== 'granted') {
            pushControl.get('enabled')?.setValue(false);
          }
        });
        return; // Add return to prevent further execution until permission is granted
      }
      
      // Now TypeScript knows pushControl is a FormGroup with controls
      Object.keys(pushControl.controls).forEach(key => {
        if (key !== 'enabled') {
          const control = pushControl.get(key);
          if (control) {
            isEnabled ? control.enable() : control.disable();
          }
        }
      });
    }
  }

  saveSettings() {
    if (this.settingsForm.invalid || this.isSaving) {
      return;
    }
  
    this.isSaving = true;
    
    // Get the form values
    const preferences = this.settingsForm.value;
  
    this.userService.updateNotificationPreferences(preferences)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSaving = false;
          // Show success message
          this.notificationService.showSuccess('Notification preferences saved successfully');
          
          // Mark form as pristine since we just saved
          this.settingsForm.markAsPristine();
        },
        error: (error: any) => {
          console.error('Error saving notification preferences:', error);
          this.isSaving = false;
          this.notificationService.showError('Failed to save notification preferences');
        }
      });
  }

  dismissModal() {
    if (this.modalService.hasOpenModals()) {
      this.modalService.dismissAll();
    }
  }

  onPushToggleChange(checked: boolean): void {
    if (checked) {
      this.notificationService.requestNotificationPermission();
    }
  }

  onSubmit(): void {
    if (this.settingsForm.invalid || this.isSaving) {
      return;
    }

    this.isSaving = true;
    const preferences = this.settingsForm.value;

    this.userService.updateNotificationPreferences(preferences)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
        },
        error: (error: any) => {
          console.error('Error saving notification preferences:', error);
          this.isSaving = false;
        }
      });
  }

  sendTestNotification(type: string): void {
    this.isTesting = true;
    this.notificationService.sendTestNotification(type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isTesting = false;
        },
        error: (error: any) => {
          console.error(`Error sending test notification for ${type}:`, error);
          this.isTesting = false;
        }
      });
  }
private sendTestNotificationRequest(type: string): void {
    this.notificationService.sendTestNotification(type).subscribe({
      next: () => {
        this.isTesting = false;
      },
      error: (error: any) => {
        console.error('Error sending test notification:', error);
        this.isTesting = false;
      }
    });
  }
  private async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
  
    if (Notification.permission === 'granted') {
      return true;
    }
  
    if (Notification.permission === 'denied') {
      return false;
    }
  
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset to default notification settings?')) {
      this.settingsForm.patchValue(this.defaultPreferences);
    }
  }
  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }

  checkPushNotificationSupport(): void {
    if (!('Notification' in window)) {
      const pushGroup = this.settingsForm.get('push') as FormGroup;
      pushGroup.disable();
      pushGroup.get('enabled')?.setValue(false);
    } else {
      // Request permission if not already granted
      Notification.requestPermission().then(permission => {
        if (permission === 'denied') {
          const pushGroup = this.settingsForm.get('push') as FormGroup;
          pushGroup.get('enabled')?.disable();
        }
      });
    }
  }
}
