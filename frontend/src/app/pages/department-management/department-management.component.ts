import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DepartmentService, Department } from '../../services/department.service';
//import { ToastrService } from 'ngx-toastr';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ToastrModule } from 'ngx-toastr';

@Component({
  selector: 'app-department-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastrModule],
  templateUrl: './department-management.component.html',
  styleUrls: ['./department-management.component.css']
})
export class DepartmentManagementComponent implements OnInit {
  departments: Department[] = [];
  departmentForm: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  editingDepartment: Department | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private departmentService: DepartmentService,
    private fb: FormBuilder,
    private toastr: ToastrModule
  ) {
    this.departmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.isLoading = true;
    this.departmentService.getDepartments().subscribe({
      next: (response: any) => {
        console.log('Departments API Response:', response);
        if (response && response.success && Array.isArray(response.data)) {
          this.departments = response.data;
        } else {
          this.error = 'Failed to load departments';
          //this.toastr.error('Failed to load departments');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.error = 'Error loading departments';
        this.isLoading = false;
       // this.toastr.error('Error loading departments');
      }
    });
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.values(this.departmentForm.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.error = null;
    const formData = this.departmentForm.value;
    
    console.log('Form submitted with data:', formData);
    console.log('Is edit mode:', this.isEditMode);
    if (this.isEditMode && this.editingDepartment) {
      console.log('Editing department ID:', this.editingDepartment.id);
    }

    const request$ = this.isEditMode && this.editingDepartment
      ? this.departmentService.updateDepartment(
          this.editingDepartment.id,
          formData.name,
          formData.description
        )
      : this.departmentService.createDepartment(formData);

    request$.subscribe({
      next: (response) => {
        console.log('Operation successful, response:', response);
        this.isSubmitting = false;
        this.activeModal.close('saved');
      },
      error: (error) => {
        console.error('Department operation failed:', {
          error,
          errorString: String(error),
          errorMessage: error?.message,
          errorResponse: error?.error
        });
        
        this.isSubmitting = false;
        
        // Handle the error response from the backend
        if (error?.error?.message) {
          this.error = error.error.message;
        } else if (error?.message) {
          this.error = error.message;
        } else {
          this.error = 'An error occurred while processing your request.';
        }
      }
    });
  }

  deleteDepartment(id: number): void {
    if (confirm('Are you sure you want to delete this department?')) {
      this.departmentService.deleteDepartment(id).subscribe({
        next: () => {
          //this.toastr.success('Department deleted successfully');
          this.loadDepartments();
        },
        error: (error) => {
          console.error('Error deleting department:', error);
         // this.toastr.error('Failed to delete department');
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingDepartment = null;
    this.departmentForm.reset();
  }

  closeModal(): void {
    this.activeModal.dismiss('cancel');
  }
}