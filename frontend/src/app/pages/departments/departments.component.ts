import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentService, Department } from '../../services/department.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.css']
})
export class DepartmentsComponent implements OnInit {
  departments: Department[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private departmentService: DepartmentService,
    private modalService: NgbModal
  ) {
    // Subscribe to the departments$ observable
    this.departmentService.departments$.subscribe(departments => {
      this.departments = departments;
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.isLoading = true;
    this.error = null;
    
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        // The departments$ subscription will handle updating the departments array
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.error = 'Failed to load departments. Please try again.';
        this.isLoading = false;
      }
    });
  }

  editDepartment(department: Department): void {
    import('../department-management/department-management.component').then(({ DepartmentManagementComponent }) => {
      const modalRef = this.modalService.open(DepartmentManagementComponent, { size: 'lg' });
      
      console.log('Editing department:', department);
      // Set edit mode and department data
      modalRef.componentInstance.isEditMode = true;
      modalRef.componentInstance.editingDepartment = { ...department };
      
      // Set the form values
      modalRef.componentInstance.departmentForm.patchValue({
        name: department.name,
        description: department.description || ''
      });
      
      // Handle the result when the modal is closed
      modalRef.result.then(
        (result) => {
          if (result === 'saved') {
            this.loadDepartments(); // Refresh the list after edit
          }
        },
        (reason) => {
          // Handle modal dismissal
          console.log('Modal dismissed:', reason);
        }
      );
    });
  }

  deleteDepartment(department: Department): void {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
      backdrop: 'static'
    });
    
    modalRef.componentInstance.title = 'Confirm Deletion';
    modalRef.componentInstance.message = `Are you sure you want to delete the department "${department.name}"? This action cannot be undone.`;
    modalRef.componentInstance.confirmText = 'Delete';
    modalRef.componentInstance.confirmClass = 'btn-danger';
    
    modalRef.result.then(
      (result) => {
        if (result === 'confirm') {
          this.isLoading = true;
          this.departmentService.deleteDepartment(department.id).subscribe({
            next: () => {
              // The departments$ subscription will handle updating the list
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Error deleting department:', error);
              this.error = error.message || 'Failed to delete department. It may be in use by other records.';
              this.isLoading = false;
            }
          });
        }
      },
      (dismissReason) => {
        // Modal dismissed, do nothing
      }
    );
  }
}