import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { DepartmentService } from '../../services/department.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Department {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgClass],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  @ViewChild('addUserModal') addUserModal!: ElementRef;

  // Form properties
  userForm!: FormGroup;
  departments: Department[] = [];
  isLoadingDepartments = false;
  editMode = false;
  selectedUser: User | null = null;
  isSubmitting = false;

  // Data properties
  users: User[] = [];
  filteredUsers: User[] = [];

  // Filter properties
  searchQuery = '';
  selectedRole = '';
  selectedDepartment = '';
  selectedStatus = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private departmentService: DepartmentService,
    private modalService: NgbModal,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadDepartments();
  }

  private loadDepartments(): void {
    this.isLoadingDepartments = true;
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        console.log('Departments API Response:', response);
        
        // Handle both response formats: direct array or {success, data} format
        if (Array.isArray(response)) {
          this.departments = response;
        } else if (response && response.success && Array.isArray(response.data)) {
          this.departments = response.data;
        } else {
          console.warn('Unexpected departments response format:', response);
          this.departments = [];
        }
        
        console.log('Departments loaded:', this.departments);
        this.isLoadingDepartments = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.isLoadingDepartments = false;
        this.departments = [];
      }
    });
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      department: ['', Validators.required],
      status: ['active', Validators.required]
    });
  }

  // Data loading methods
  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users: User[]) => {  
        this.users = users.map(user => ({
          ...user,
          department: (user as any).department_name || user.department || 'No Department'
        }));
        this.filteredUsers = [...this.users];
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  // Filter methods
  filterUsers() {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesRole = !this.selectedRole || user.role === this.selectedRole;
      const matchesDepartment = !this.selectedDepartment || user.department === this.selectedDepartment;
      const matchesStatus = !this.selectedStatus || user.status === this.selectedStatus;
      
      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    });
  }

  openAddUserModal() {
    console.log('Opening modal...');
    console.log('Modal reference:', this.addUserModal);
    this.editMode = false;
    this.selectedUser = null;
    this.userForm.reset({
      status: 'active'
    });
    const modalRef = this.modalService.open(this.addUserModal, { 
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
    console.log('Modal opened:', modalRef);
  }

  editUser(user: User) {
    console.log('Editing user:', user);
    this.editMode = true;
    this.selectedUser = user;
    
    // Open modal first
    const modalRef = this.modalService.open(this.addUserModal, { 
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
    
    // If we already have departments, patch the form immediately
    if (this.departments.length > 0) {
      this.patchUserForm(user);
      return;
    }
    
    // Otherwise, load departments first
    this.isLoadingDepartments = true;
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.departments = response;
        } else if (response?.success && Array.isArray(response.data)) {
          this.departments = response.data;
        }
        this.patchUserForm(user);
        this.isLoadingDepartments = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.isLoadingDepartments = false;
        // Still try to patch the form with the existing data
        this.patchUserForm(user);
      }
    });
  }
  
  private patchUserForm(user: User): void {
    if (!user) return;
    
    console.log('Patching form with user:', user);
    console.log('Available departments:', this.departments);
    
    // Find the department by name or ID
    let departmentId = null;
    if (user.department) {
      // If department is already an ID
      if (typeof user.department === 'number') {
        departmentId = user.department;
      } 
      // If department is a string (name), find matching department
      else if (typeof user.department === 'string') {
        const foundDept = this.departments.find(d => 
          d.name === user.department || String(d.id) === user.department
        );
        departmentId = foundDept?.id || user.department;
      }
    }
    
    console.log('Setting department ID:', departmentId);
    
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      role: user.role,
      department: departmentId,
      status: user.status || 'active'
    }, { emitEvent: false });
    
    console.log('Form after patch:', this.userForm.value);
  }

  onSubmit() {
    if (this.userForm.invalid) {
      console.error('Form is invalid:', this.userForm.errors);
      return;
    }

    this.isSubmitting = true;
  
    // Only include the fields we want to send
    const formValue = {
      username: this.userForm.value.username,
      email: this.userForm.value.email,
      role: this.userForm.value.role,
      department: this.userForm.value.department,
      status: this.userForm.value.status
    };

    console.log('Submitting form with values:', formValue);

    const update$ = this.selectedUser?.id
      ? this.userService.updateUser(this.selectedUser.id, formValue)
      : this.userService.createUser(formValue);

    update$.subscribe({
      next: (response) => {
        console.log('Operation successful:', response);
        this.loadUsers();
        this.modalService.dismissAll();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Operation failed:', error);
        this.isSubmitting = false;
        alert(`Failed to ${this.selectedUser ? 'update' : 'create'} user. Please try again.`);
      }
    });
  }

  async toggleStatus(user: User) {
    try {
      const newRole = user.role === 'user' ? 'admin' : 'user';
      await this.userService.updateUser(user.id, { role: newRole });
      await this.loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  }

  async deleteUser(user: User) {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await this.userService.deleteUser(user.id);
        await this.loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.userForm.patchValue({
          avatar: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  handleImageError(user: User) {
    user.avatar = undefined;
  }
}