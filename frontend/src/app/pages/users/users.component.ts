import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgClass],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  @ViewChild('addUserModal') addUserModal!: ElementRef;

  // Form properties
  userForm!: FormGroup;
  editMode = false;
  selectedUser: User | null = null;

  // Data properties
  users: User[] = [];
  filteredUsers: User[] = [];
  departments: string[] = ['Development', 'Design', 'Marketing', 'Sales', 'HR'];

  // Filter properties
  searchQuery = '';
  selectedRole = '';
  selectedDepartment = '';
  selectedStatus = '';

  constructor(
    private fb: FormBuilder,
    public modalService: NgbModal,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Initialize form
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      department: ['', Validators.required],
      status: ['', Validators.required],
      position: ['', Validators.required],
      phone: ['', Validators.pattern('^\d{10}$')],
      avatar: ['']
    });

    // Load data
    this.loadUsers();
  }

  // Data loading methods
  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filterUsers();
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

  // Form methods
  openAddUserModal() {
    this.editMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.modalService.open(this.addUserModal);
  }

  editUser(user: User) {
    this.editMode = true;
    this.selectedUser = user;
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      position: user.position,
      phone: user.phone
    });
    this.modalService.open(this.addUserModal);
  }

  async onSubmit() {
    if (this.userForm.valid) {
      try {
        const formData = this.userForm.value;
        if (this.editMode && this.selectedUser) {
          await this.userService.updateUser(this.selectedUser.id, formData);
        } else {
          await this.userService.createUser(formData);
        }
        this.modalService.dismissAll();
        await this.loadUsers();
      } catch (error) {
        console.error('Error saving user:', error);
      }
    }
  }

  // Action methods
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

  // File upload method
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
}