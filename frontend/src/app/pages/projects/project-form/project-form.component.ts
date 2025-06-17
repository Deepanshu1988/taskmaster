import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectService } from '../../../services/project.service';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.css']
})
export class ProjectFormComponent implements OnInit {
  @Output() projectAdded = new EventEmitter<void>();
  projectForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  currentDate = new Date();
  currentUser: any | null = null;

  // Getters for form controls
  get name() { return this.projectForm.get('name'); }
  get description() { return this.projectForm.get('description'); }

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      created_by: [''],
      created_at: [this.currentDate]
    });
  }

  ngOnInit(): void {
    // Get current user from auth service
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('Current User:', this.currentUser); // Debug log
      
      if (this.currentUser) {
        this.projectForm.patchValue({
          created_by: this.currentUser.user?.username || 'Unknown User'
        });
      }
    });
  }

  onSubmit() {
    if (this.projectForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    // Include current user ID in the project data
    const projectData = {
      ...this.projectForm.value,
      created_by: this.currentUser?.user?.id || null,
      created_by_name: this.currentUser?.user?.username || 'Unknown User',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: null
    };

    console.log('Submitting project data:', projectData); // Debug log

    this.projectService.createProject(projectData).subscribe({
      next: (project) => {
        this.isSubmitting = false;
        this.projectAdded.emit();
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.error = error.error?.message || 'Failed to create project';
        this.isSubmitting = false;
      }
    });
  }

  onCancel() {
    this.router.navigate(['/dashboard']);
  }
}
