// header.component.ts
import { Component, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

declare var bootstrap: any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnDestroy {
  isMenuCollapsed = true;
  private collapseInstance: any;

  constructor(
    public authService: AuthService, 
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngAfterViewInit() {
    // Initialize the collapse manually
    const collapseElement = this.elementRef.nativeElement.querySelector('#navbarNav');
    if (collapseElement) {
      this.collapseInstance = new bootstrap.Collapse(collapseElement, {
        toggle: false
      });
    }
  }

  ngOnDestroy() {
    // Clean up the collapse instance
    if (this.collapseInstance) {
      this.collapseInstance.dispose();
    }
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    this.updateMenuState();
  }

  closeMenu() {
    if (!this.isMenuCollapsed) {
      this.isMenuCollapsed = true;
      this.updateMenuState();
    }
  }

  private updateMenuState() {
    if (this.collapseInstance) {
      if (this.isMenuCollapsed) {
        this.collapseInstance.hide();
      } else {
        this.collapseInstance.show();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    const target = event.target as HTMLElement;
    const isNavbarToggler = target.closest('.navbar-toggler');
    const isNavbarNav = target.closest('#navbarNav');
    
    if (isNavbarToggler) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleMenu();
    } else if (!isNavbarNav && !this.isMenuCollapsed) {
      // Click outside the menu when it's open
      this.closeMenu();
    }
  }

  get isAdmin(): boolean {
    const user = this.authService.currentUserValue;
    return user ? (user.user?.role === 'admin' || user.role === 'admin') : false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}