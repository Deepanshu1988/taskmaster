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
  authService: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private notificationService: NotificationService,
    private modalService: NgbModal
  ) {
    this.settingsForm = this.createForm();
  }

  ngOnInit() {
    //console.log('Auth state:', this.authService.checkAuthState());
    this.loadUserPreferences();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserPreferences() {
    this.isLoading = true;
    
    // Reset the form while loading
    this.settingsForm = this.createForm();
  
    this.userService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user: any) => {
        if (user?.notification_preferences) {
          console.log('Loading user preferences:', user.notification_preferences);
          this.settingsForm.patchValue({
            email: user.notification_preferences.email || this.defaultPreferences.email,
            in_app: user.notification_preferences.in_app || this.defaultPreferences.in_app,
            push: user.notification_preferences.push || this.defaultPreferences.push
          }, { emitEvent: false });
        } else {
          console.log('No saved preferences found, using defaults');
        }
        this.isLoading = false;
      },
      error: (error) => {
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
    const form = this.fb.group({
      email: this.fb.group({
        enabled: [true],
        taskReminders: [{value: true, disabled: false}],
        dueDateAlerts: [{value: true, disabled: false}],
        statusUpdates: [{value: true, disabled: false}]
      }),
      in_app: this.fb.group({
        enabled: [true],
        taskReminders: [{value: true, disabled: false}],
        mentions: [{value: true, disabled: false}],
        statusUpdates: [{value: true, disabled: false}]
      }),
      push: this.fb.group({
        enabled: [false],
        taskReminders: [{value: false, disabled: false}],
        mentions: [{value: false, disabled: false}]
      })
    });

    // Store reference to email form group
    this.emailGroup = form.get('email') as FormGroup;

    // Set up value changes for toggling disabled states
    this.setupFormValueChanges(form);

    return form;
  }
  shouldSendEmailNotification(notificationType: string): boolean {
    const emailEnabled = this.settingsForm.get('email.enabled')?.value;
    const statusUpdatesEnabled = this.settingsForm.get('email.statusUpdates')?.value;
    
    // Don't send email if email notifications are disabled
    if (!emailEnabled) {
      return false;
    }
    
    // For status updates, check if status updates are enabled
    if (notificationType === 'status_update' && !statusUpdatesEnabled) {
      return false;
    }
    
    return true;
  }
  
  // Example usage when sending a notification
  sendNotification(notificationType: string, data: any) {
    if (this.shouldSendEmailNotification(notificationType)) {
      // Your email sending logic here
      console.log('Sending email notification:', notificationType, data);
    } else {
      console.log('Email notification skipped - status updates disabled or email notifications off');
    }
  }
  private setupFormValueChanges(form: FormGroup): void {
    // Handle email group
    const emailGroup = form.get('email') as FormGroup;
    emailGroup.get('enabled')?.valueChanges.subscribe(enabled => {
      const controls = ['taskReminders', 'dueDateAlerts', 'statusUpdates'];
      this.toggleControlsState(emailGroup, controls, enabled);
    });

    // Handle in_app group
    const inAppGroup = form.get('in_app') as FormGroup;
    inAppGroup.get('enabled')?.valueChanges.subscribe(enabled => {
      const controls = ['taskReminders', 'mentions', 'statusUpdates'];
      this.toggleControlsState(inAppGroup, controls, enabled);
    });

    // Handle push group
    const pushGroup = form.get('push') as FormGroup;
    pushGroup.get('enabled')?.valueChanges.subscribe(enabled => {
      const controls = ['taskReminders', 'mentions'];
      this.toggleControlsState(pushGroup, controls, enabled);
    });
  }

  private toggleControlsState(
    group: FormGroup,
    controlNames: string[],
    enabled: boolean
  ): void {
    controlNames.forEach(controlName => {
      const control = group.get(controlName);
      if (control) {
        if (enabled) {
          control.enable();
        } else {
          control.disable();
        }
      }
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
    const preferences = this.settingsForm.getRawValue();
    
    // Ensure status updates are disabled if email is disabled
    if (!preferences.email.enabled) {
      preferences.email.statusUpdates = false;
    }
  
    this.userService.updateNotificationPreferences(preferences)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          this.notificationService.showSuccess('Notification preferences saved successfully');
          this.modalService.dismissAll();
        },
        error: (error) => {
          console.error('Error saving settings:', error);
          this.isSaving = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to save preferences';
          this.notificationService.showError(errorMessage);
        }
      });
  }
  dismissModal() {
    
    if (this.modalService.hasOpenModals()) {
      this.modalService.dismissAll('Preferences saved');
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
