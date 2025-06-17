import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbDropdownModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  notifications: Notification[] = [];
  unreadCount = 0;
  isLoading = false;
  isDropdownOpen = false;
  currentUserId: number | null = null;
  
  // Pagination
  page = 1;
  pageSize = 10;
  totalItems = 0;
  hasMore = true;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.currentUserValue?.id || null;
    
    if (this.currentUserId) {
      this.loadNotifications();
      
      // Subscribe to real-time notifications
      this.notificationService.getNotifications()
        .pipe(takeUntil(this.destroy$))
        .subscribe(notifications => {
          this.notifications = notifications;
        });
      
      // Subscribe to unread count changes
      this.notificationService.getUnreadCount()
        .pipe(takeUntil(this.destroy$))
        .subscribe(count => {
          this.unreadCount = count;
        });
    }
    
    // Request notification permission
    this.notificationService.requestNotificationPermission();
  }

  loadNotifications(loadMore = false): void {
    if (!this.currentUserId || this.isLoading || (!loadMore && this.page > 1)) {
      return;
    }
    
    this.isLoading = true;
    
    if (!loadMore) {
      this.page = 1;
    }
    
    const params = {
      page: this.page.toString(),
      limit: this.pageSize.toString(),
      status: 'all'
    };
    
    this.notificationService.getUserNotifications(this.currentUserId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (loadMore) {
            this.notifications = [...this.notifications, ...response.data];
          } else {
            this.notifications = response.data;
          }
          
          this.totalItems = response.total;
          this.hasMore = (this.page * this.pageSize) < this.totalItems;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.isLoading = false;
        }
      });
  }
  
  loadMore(): void {
    if (this.hasMore && !this.isLoading) {
      this.page++;
      this.loadNotifications(true);
    }
  }
  
  toggleDropdown(open: boolean): void {
    this.isDropdownOpen = open;
    
    if (open) {
      // Mark all as read when dropdown is opened
      this.markAllAsRead();
    }
  }
  
  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    
    if (notification.status === 'unread') {
      this.notificationService.markAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }
  
  markAllAsRead(): void {
    if (this.unreadCount > 0 && this.currentUserId) {
      this.notificationService.markAllAsRead(this.currentUserId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }
  
  deleteNotification(notificationId: number, event: Event): void {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.deleteNotification(notificationId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }
  
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'email':
        return 'bi-envelope';
      case 'push':
        return 'bi-bell';
      default:
        return 'bi-bell';
    }
  }
  
  getNotificationClass(notification: Notification): string {
    const baseClass = 'notification-item';
    const typeClass = `notification-${notification.type}`;
    const statusClass = notification.status === 'unread' ? 'unread' : '';
    
    return [baseClass, typeClass, statusClass].filter(Boolean).join(' ');
  }
  
  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    if (this.isDropdownOpen && this.shouldLoadMore()) {
      this.loadMore();
    }
  }
  
  private shouldLoadMore(): boolean {
    const threshold = 100; // pixels from bottom
    const position = window.innerHeight + window.scrollY;
    const height = document.body.offsetHeight;
    
    return position > height - threshold && this.hasMore && !this.isLoading;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
