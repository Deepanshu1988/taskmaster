import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}
  
    canActivate(): boolean {
      const currentUser = this.authService.currentUserValue;
      console.log('Current user in AdminGuard:', currentUser); // Debug log
      
      // Check if user is logged in
      if (!currentUser) {
        this.router.navigate(['/login']);
        return false;
      }
  
      // Check if user has admin role
      const isAdmin = currentUser.user?.role === 'admin' || currentUser.role === 'admin';
      console.log('Is admin:', isAdmin); // Debug log
      
      if (!isAdmin) {
        // Redirect to dashboard if not admin
        this.router.navigate(['/dashboard']);
        return false;
      }
      
      return true;
    }
  }