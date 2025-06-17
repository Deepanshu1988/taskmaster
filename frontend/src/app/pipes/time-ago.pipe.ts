import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'timeAgo',
  pure: false
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timer: number | null = null;
  
  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private translate: TranslateService
  ) {}
  
  transform(value: string | Date): string {
    this.removeTimer();
    
    if (!value) return '';
    
    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return '';
    
    // Calculate time difference in seconds
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Set up timer to update the display
    this.setupTimer(seconds);
    
    return this.getTimeAgoString(seconds);
  }
  
  private setupTimer(seconds: number): void {
    // Clear any existing timer
    this.removeTimer();
    
    // Calculate time until next update (in milliseconds)
    const updateInterval = this.getUpdateInterval(seconds) * 1000;
    
    // Run outside Angular zone to avoid unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      if (typeof window !== 'undefined') {
        this.timer = window.setTimeout(() => {
          this.ngZone.run(() => this.changeDetectorRef.markForCheck());
        }, updateInterval);
      }
    });
  }
  
  private getUpdateInterval(seconds: number): number {
    // Update less frequently as time passes
    if (seconds < 60) { // Less than a minute
      return 1; // Update every second
    } else if (seconds < 3600) { // Less than an hour
      return 60; // Update every minute
    } else if (seconds < 86400) { // Less than a day
      return 3600; // Update every hour
    } else {
      return 86400; // Update daily
    }
  }
  
  private getTimeAgoString(seconds: number): string {
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      
      if (interval >= 1) {
        if (interval === 1) {
          return this.translate.instant(`timeAgo.${unit}`, { count: interval });
        } else {
          return this.translate.instant(`timeAgo.${unit}s`, { count: interval });
        }
      }
    }
    
    return this.translate.instant('timeAgo.justNow');
  }
  
  private removeTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  ngOnDestroy(): void {
    this.removeTimer();
  }
}
