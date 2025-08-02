import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  isLoading = false;
  error: string | null = null;
  success = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    console.log('ResetPasswordComponent initialized');
    console.log('Current URL:', window.location.href);
    
    // Get token from URL query parameters
    this.route.queryParams.subscribe(params => {
      console.log('Query params:', params);
      this.token = params['token'];
      console.log('Token from URL:', this.token);
      
      if (!this.token) {
        this.error = 'Invalid or missing reset token. Please use the link from your email.';
        console.error('No token found in URL');
        return;
      }
      
      // Reset any previous error if token is present
      this.error = null;
      console.log('Token found and set successfully');
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value 
      ? null 
      : { mismatch: true };
  }

 // In reset-password.component.ts
onSubmit() {
  // Mark all fields as touched to show validation messages
  this.resetForm.markAllAsTouched();

  if (this.resetForm.invalid) {
    console.log('Form is invalid', this.resetForm.errors);
    this.error = 'Please fill in all required fields correctly.';
    return;
  }

  if (!this.token) {
    console.error('No reset token found');
    this.error = 'Invalid or expired reset link. Please request a new password reset.';
    return;
  }

  // Check if passwords match
  if (this.resetForm.hasError('mismatch')) {
    this.error = 'Passwords do not match.';
    return;
  }

  this.isLoading = true;
  this.error = null;

  console.log('Sending reset to backend with:', {
    token: this.token,
    password: this.resetForm.value.password
  });
  
  // Update the payload to use newPassword instead of password
  this.authService.resetPassword(this.token, this.resetForm.value.password)
    .subscribe({
      next: (response) => {
        console.log('Password reset successful', response);
        this.success = true;
        this.isLoading = false;
        this.resetForm.reset();
        
       // Redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { passwordReset: 'success' }
          });
        }, 3000);
      },
      error: (error) => {
        console.error('Error resetting password:', error);
        this.error = error.error?.error || 
                    error.error?.message || 
                    error.message || 
                    'Failed to reset password. The link may have expired. Please request a new password reset.';
        this.isLoading = false;
      }
    });
}
}
