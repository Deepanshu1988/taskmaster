import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  template: `
    <nav>
      <div class="nav-brand">TaskMaster</div>
      <ul>
        <li><a routerLink="/tasks">Tasks</a></li>
        <li *ngIf="isAdmin"><a routerLink="/users">Users</a></li>
        <li><a (click)="logout()">Logout</a></li>
      </ul>
    </nav>
  `,
  styles: [`
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #007bff;
      padding: 10px 20px;
      color: white;
    }
    .nav-brand {
      font-size: 1.5em;
      font-weight: bold;
    }
    ul {
      list-style: none;
      display: flex;
      gap: 20px;
      margin: 0;
      padding: 0;
    }
    li a {
      color: white;
      text-decoration: none;
      cursor: pointer;
    }
    li a:hover {
      text-decoration: underline;
    }
  `]
})
export class HeaderComponent {
  isAdmin: boolean = false;

  constructor(private authService: AuthService, private router: Router) {
    const token = authService.getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.isAdmin = payload.role === 'admin';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}