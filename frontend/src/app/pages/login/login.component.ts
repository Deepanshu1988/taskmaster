// login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    RouterModule,
    NgClass
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  returnUrl!: string;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = ''; // Clear previous errors

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      console.log('Form is invalid');
      this.loading = false;
      return;
    }

    this.loading = true;
    const email = this.f['email'].value;
    const password = this.f['password'].value;
    
    console.log('Attempting login with email:', email);
    
    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('Login successful, navigating to:', this.returnUrl);
        this.loading = false; // Reset loading state on success
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.loading = false; // Reset loading state immediately on error
        this.error = error.message || 'Login failed. Please try again.';
        
        // Clear the password field on error
        this.loginForm.patchValue({ password: '' });
        
        // Focus back on the email field
        const emailControl = document.getElementById('email') as HTMLInputElement;
        if (emailControl) {
          emailControl.focus();
        }
      },
      complete: () => {
        // Not needed since we reset loading in next and error
      }
    });
  }
}