import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Department } from '../../services/department.service';

@Component({
  selector: 'app-department-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal fade show" [ngClass]="{'d-block': isOpen}" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ department?.id ? 'Edit' : 'Add' }} Department</h5>
            <button type="button" class="btn-close" (click)="onClose()" aria-label="Close"></button>
          </div>
          <form [formGroup]="departmentForm" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="mb-3">
                <label for="name" class="form-label">Department Name *</label>
                <input type="text" class="form-control" id="name" formControlName="name" 
                       [ngClass]="{'is-invalid': departmentForm.get('name')?.invalid && departmentForm.get('name')?.touched}">
                <div class="invalid-feedback">
                  Department name is required
                </div>
              </div>
              <div class="mb-3">
                <label for="description" class="form-label">Description</label>
                <textarea class="form-control" id="description" formControlName="description" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="onClose()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="departmentForm.invalid || isLoading">
                <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                {{ department?.id ? 'Update' : 'Create' }} Department
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="isOpen"></div>
  `,
  styles: [`
    .modal-backdrop {
      opacity: 0.5;
    }
    .modal-content {
      border: none;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    }
  `]
})
export class DepartmentFormModalComponent {
  @Input() isOpen = false;
  @Input() department: Department | null = null;
  @Input() isLoading = false;
  @Output() close = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<{ name: string; description: string }>();

  departmentForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.departmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnChanges() {
    if (this.department) {
      this.departmentForm.patchValue({
        name: this.department.name,
        description: this.department.description || ''
      });
    } else {
      this.departmentForm.reset();
    }
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.departmentForm.valid) {
      this.submitForm.emit(this.departmentForm.value);
    } else {
      // Mark all fields as touched to show validation messages
      Object.values(this.departmentForm.controls).forEach(control => {
        control.markAsTouched();
      });
    }
  }
}
