import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'TaskMaster';
  isMenuCollapsed = true;
  private collapseInstance: any;

  constructor(
    public authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngAfterViewInit() {
    const collapseElement = this.elementRef.nativeElement.querySelector('#navbarNav');
    if (collapseElement) {
      // Check if Bootstrap is available
      if (typeof bootstrap !== 'undefined') {
        this.collapseInstance = new bootstrap.Collapse(collapseElement, {
          toggle: false
        });
        // Ensure the initial state is correct
        if (this.isMenuCollapsed) {
          this.collapseInstance.hide();
        } else {
          this.collapseInstance.show();
        }
      }
    }
  }

  ngOnDestroy() {
    if (this.collapseInstance) {
      this.collapseInstance.dispose();
    }
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    if (this.collapseInstance) {
      if (this.isMenuCollapsed) {
        this.collapseInstance.hide();
      } else {
        this.collapseInstance.show();
      }
    }
  }

  closeMenu() {
    if (!this.isMenuCollapsed) {
      this.isMenuCollapsed = true;
      if (this.collapseInstance) {
        this.collapseInstance.hide();
      }else {
        this.collapseInstance.show();
      }
    }
    }
  

    /*private updateMenuState() {
      if (this.collapseInstance) {
        if (this.isMenuCollapsed) {
          this.collapseInstance.hide();
        } else {
          this.collapseInstance.show();
        }
      }
    }*/

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const isNavbarToggler = target.closest('.navbar-toggler');
    const isNavbarNav = target.closest('#navbarNav');
    
    if (isNavbarToggler) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleMenu();
    } else if (!isNavbarNav && !this.isMenuCollapsed) {
      this.closeMenu();
    }
  }

  isAdmin(): boolean {
    const user = this.authService.currentUserValue;
    return user ? (user.user?.role === 'admin' || user.role === 'admin') : false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get currentUser() {
    return this.authService.currentUserValue;
  }
}
