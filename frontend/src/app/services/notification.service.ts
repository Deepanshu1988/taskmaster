import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'email' | 'in_app' | 'push';
  status: 'unread' | 'read' | 'deleted';
  relatedEntity?: string;
  relatedEntityId?: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notifications`;
  private wsUrl = environment.wsUrl || 'ws://localhost:3000';
  
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);
  private ws!: WebSocket;
  sendTestNotification: any;
  toastr: any;
  userService: any;
  emailService: any;

  constructor(private http: HttpClient) {
  //  this.connectWebSocket();
    
  }

  private connectWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          this.handleNewNotification(data.payload);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected. Attempting to reconnect...');
        setTimeout(() => this.connectWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  private handleNewNotification(notification: Notification) {
    const currentNotifications = this.notifications$.value;
    this.notifications$.next([notification, ...currentNotifications]);
    
    if (notification.status === 'unread') {
      this.unreadCount$.next(this.unreadCount$.value + 1);
    }
    
    // Show browser notification if enabled
    if (Notification.permission === 'granted' && notification.type === 'push') {
      this.showBrowserNotification(notification);
    }
  }

  private showBrowserNotification(notification: Notification) {
    const options: NotificationOptions = {
      body: notification.message,
      icon: '/assets/logo.png',
      data: { url: this.getNotificationUrl(notification) }
    };

    const browserNotification = new Notification(notification.title, options);
    
    browserNotification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (browserNotification.data?.url) {
        window.open(browserNotification.data.url, '_blank');
      }
      browserNotification.close();
    };
  }

  private getNotificationUrl(notification: Notification): string | undefined {
    if (!notification.relatedEntity || !notification.relatedEntityId) return undefined;
    
    switch (notification.relatedEntity.toLowerCase()) {
      case 'task':
        return `/tasks/${notification.relatedEntityId}`;
      case 'project':
        return `/projects/${notification.relatedEntityId}`;
      default:
        return undefined;
    }
  }

  // API Methods
  getUserNotifications(userId: number, params?: any): Observable<{data: Notification[], total: number}> {
    return this.http.get<{data: Notification[], total: number}>(`${this.apiUrl}/user/${userId}`, { params })
      .pipe(
        tap(response => {
          this.notifications$.next(response.data);
          this.updateUnreadCount(response.data);
        }),
        catchError(error => {
          console.error('Error fetching notifications:', error);
          return of({ data: [], total: 0 });
        })
      );
  }

  markAsRead(notificationId: number): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.apiUrl}/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          const notifications = this.notifications$.value.map(n => 
            n.id === notificationId ? { ...n, status: 'read' as const } : n
          );
          this.notifications$.next(notifications);
          this.updateUnreadCount(notifications);
        })
      );
  }

  markAllAsRead(userId: number): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.apiUrl}/mark-all-read`, { userId })
      .pipe(
        tap(() => {
          const notifications = this.notifications$.value.map(n => ({
            ...n,
            status: 'read' as const
          }));
          this.notifications$.next(notifications);
          this.unreadCount$.next(0);
        })
      );
  }

  deleteNotification(notificationId: number): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/${notificationId}`)
      .pipe(
        tap(() => {
          const filtered = this.notifications$.value.filter(n => n.id !== notificationId);
          this.notifications$.next(filtered);
          this.updateUnreadCount(filtered);
        })
      );
  }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  requestNotificationPermission(): void {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }

  private updateUnreadCount(notifications: Notification[]): void {
    const count = notifications.filter(n => n.status === 'unread').length;
    this.unreadCount$.next(count);
  }

  showSuccess(message: string): void {
    // Using toastr if available, otherwise fallback to console
    if (this.toastr) {
      this.toastr.success(message, 'Success');
    } else {
      console.log('Success:', message);
    }
  }

  showError(message: string): void {
    // Using toastr if available, otherwise fallback to console
    if (this.toastr) {
      this.toastr.error(message, 'Error');
    } else {
      console.error('Error:', message);
    }
  }

  private async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
  
    if (Notification.permission === 'granted') {
      return true;
    }
  
    if (Notification.permission === 'denied') {
      this.toastr.warning('Please enable notifications in your browser settings');
      return false;
    }
  
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
    }
  }


  // In your notification service
  async sendTaskUpdateEmail(userId: string, taskData: any, updatedByUser: any) {
    try {
      const user = await this.userService.getUserById(userId);
      const prefs = user.notification_preferences || {};
      
      if (!prefs.email?.enabled || !prefs.email?.taskUpdates) {
        return { success: true, notificationSent: false };
      }
  
      const updaterName = updatedByUser ? 
        `${updatedByUser.firstName} ${updatedByUser.lastName}`.trim() : 
        'A team member';
  
      const emailContent = `
        <div>
          <p>Hello ${user.firstName},</p>
          <p>${updaterName} has updated the task: <strong>${taskData.title}</strong></p>
          <!-- Add more task details here -->
        </div>
      `;
  
      // Send email using your email service
      await this.emailService.sendEmail({
        to: user.email,
        subject: `Task Updated: ${taskData.title}`,
        html: emailContent
      });
  
      return { success: true, notificationSent: true };
    } catch (error: unknown) {
      console.error('Error sending task update email:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }
}
