import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { User } from '../../../models/user.model';
import { DepartmentService } from '../../../services/department.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';

interface Department {
  id: number;
  name: string;
  description?: string;
}

@Component({
  imports: [CommonModule,ReactiveFormsModule, RouterModule],
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
  standalone: true,
})
export class UserFormComponent implements OnInit {
  @Input() user?: User;
  userForm!: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  departments: Department[] = [];
  isLoading!: boolean;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private departmentService: DepartmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize form with default values
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['user', [Validators.required]],
      department: [null, [Validators.required]],
      status: ['active', [Validators.required]]
    });

    // Load departments first
    this.loadDepartments();

    // If editing an existing user, patch the form values
    if (this.user) {
      console.log('Initializing form with user data:', this.user);
      
      // Patch all values except password (which is handled separately)
      this.userForm.patchValue({
        username: this.user.username,
        email: this.user.email,
        role: this.user.role || 'user',
        status: this.user.status || 'active',
      });

      // Clear password validators when editing
      this.password?.clearValidators();
      this.password?.updateValueAndValidity();
    }
  }

  loadDepartments(): void {
    this.isLoading = true;
    console.log('Loading departments...');
    
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        console.log('Departments API Response:', response);
        
        if (response?.success && Array.isArray(response.data)) {
          this.departments = response.data;
          console.log('Departments loaded:', this.departments);
          
          // Only set department if we're editing an existing user
          if (this.user) {
            console.log('Setting department for user:', this.user);
            this.setDepartmentForUser();
          }
        } else {
          console.warn('Invalid departments response or empty data');
          this.departments = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.departments = [];
        this.isLoading = false;
      }
    });
  }

  private setDepartmentForUser(): void {
    if (!this.user?.department) {
      console.warn('No department found for user');
      return;
    }

    interface DepartmentObject {
      id: number;
      name: string;
    }

    const departmentValue = this.user.department;
    console.log('Processing department value:', departmentValue);

    // Try to find the department by ID or name
    const foundDept = this.departments.find(dept => {
      // If departmentValue is a string, compare with name
      if (typeof departmentValue === 'string') {
        return dept.name === departmentValue || String(dept.id) === departmentValue;
      } 
      // If departmentValue is a number, compare with id
      else if (typeof departmentValue === 'number') {
        return dept.id === departmentValue;
      }
      // If departmentValue is an object, compare with id
      else if (departmentValue && typeof departmentValue === 'object' && 'id' in departmentValue) {
        return dept.id === (departmentValue as DepartmentObject).id;
      }
      return false;
    });

    if (foundDept) {
      console.log('Found matching department:', foundDept);
      this.userForm.patchValue({
        department: foundDept.id
      }, { emitEvent: false });
      console.log('Form after setting department:', this.userForm.value);
    } else {
      console.warn('No matching department found for:', departmentValue);
      console.log('Available departments:', this.departments);
    }
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      console.log('Form is invalid', this.userForm.errors);
      Object.keys(this.userForm.controls).forEach(key => {
        const control = this.userForm.get(key);
        if (control?.errors) {
          console.log('Validation error in field', key, control.errors);
        }
      });
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    // Create a clean data object with proper type conversion
    const formData: any = { 
      username: String(this.userForm.value.username || '').trim(),
      email: String(this.userForm.value.email || '').trim().toLowerCase(),
      password: this.userForm.value.password,
      role: String(this.userForm.value.role || 'user'),
      department: this.userForm.value.department ? Number(this.userForm.value.department) : null,
      status: String(this.userForm.value.status || 'active')
    };
    
    console.log('Submitting user data:', formData);
    
    // Remove password if it's an edit and password wasn't changed
    if (this.user && !formData.password) {
      delete formData.password;
    }

    const operation = this.user
      ? this.userService.updateUser(this.user.id, formData)
      : this.userService.createUser(formData);

    operation.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.router.navigate(['/users']);
      },
      error: (error) => {
        console.error('Error in user operation:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        this.error = error.error?.message || error.message || 'An error occurred while processing your request';
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/users']);
  }

  // Add this method to track departments by ID for better performance
  trackDepartmentById(index: number, department: Department): number {
    return department.id;
  }

  // Getters for form controls
  get username() { return this.userForm.get('username'); }
  get email() { return this.userForm.get('email'); }
  get password() { return this.userForm.get('password'); }
  get role() { return this.userForm.get('role'); }
  get department() { return this.userForm.get('department'); }
  get status() { return this.userForm.get('status'); }
}