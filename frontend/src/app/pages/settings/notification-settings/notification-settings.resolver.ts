import { Injectable } from '@angular/core';
import { Resolve, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { UserService } from '../../../services/user.service';
interface NotificationPreference {
    enabled: boolean;
    taskReminders?: boolean;
    dueDateAlerts?: boolean;
    statusUpdates?: boolean;
    mentions?: boolean;
  }
  
  interface User {
    id: number;
    username: string;
    email: string;
    notificationPreferences?: {
      email: NotificationPreference;
      in_app: NotificationPreference;
      push: NotificationPreference;
    };
    // Add other user properties as needed
  }
  
  interface ResolvedData {
    user: User | null;
    notificationPreferences: {
      email: NotificationPreference;
      in_app: NotificationPreference;
      push: NotificationPreference;
    };
  }
@Injectable({
  providedIn: 'root'
})
export class NotificationSettingsResolver implements Resolve<ResolvedData> {
  constructor(private userService: UserService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ResolvedData> {
    return this.userService.getCurrentUser().pipe(
      map((user: User | null) => {
        const defaultPrefs = {
          email: { enabled: true, taskReminders: true, dueDateAlerts: true, statusUpdates: true },
          in_app: { enabled: true, taskReminders: true, mentions: true, statusUpdates: true },
          push: { enabled: false, taskReminders: false, mentions: false }
        };
        
        return {
          user,
          notificationPreferences: user?.notificationPreferences || defaultPrefs
        };
      }),
      catchError(error => {
        console.error('Error loading notification settings:', error);
        return of({
          user: null,
          notificationPreferences: {
            email: { enabled: true, taskReminders: true, dueDateAlerts: true, statusUpdates: true },
            in_app: { enabled: true, taskReminders: true, mentions: true, statusUpdates: true },
            push: { enabled: false, taskReminders: false, mentions: false }
          }
        });
      })
    );
  }
}