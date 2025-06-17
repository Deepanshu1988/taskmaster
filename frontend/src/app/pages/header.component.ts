// header.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  constructor(
    public authService: AuthService, 
    private router: Router
  ) {}

  get isAdmin(): boolean {
    const user = this.authService.currentUserValue;
    // Check both possible locations for the role
    return user ? (user.user?.role === 'admin' || user.role === 'admin') : false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}