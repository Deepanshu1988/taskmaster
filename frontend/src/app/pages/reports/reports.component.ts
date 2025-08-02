import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DurationPipe } from '../../pipes/duration.pipe';
import { UserService } from '../../services/user.service';
import { ProjectService } from '../../services/project.service';
import { Department, DepartmentService } from '../../services/department.service';
import { ReportService } from '../../services/report.service';
//import { Blob } from 'buffer';
import { User } from '../../models/user.model';
import { Project } from '../../models/project.model';
import { ReportResponse } from '../../models/report.model';
// Interfaces
interface TimeReportEntry {
  taskName: string;
  userName: string;
  projectName: string;
  departmentName: string;
  duration: number;
}
interface TaskCompletion {
  count: number;
  stats: { label: string; value: number; }[];
}
interface UserProductivity {
  id: number;
  name: string;
  email: string;
  tasksCompleted: number;
  totalTasks: number;
  totalTime: number;
  avgTimePerTask: number;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, DurationPipe],
})
export class ReportsComponent implements OnInit {
  filters = {
    userId: '',
    projectId: '',
    departmentId: '',
    startDate: '',
    endDate: '',
  };

  users: User[] = [];
  projects: Project[] = [];
  departments: Department[] = [];

  timeReport: TimeReportEntry[] = [];
  taskCompletion: TaskCompletion | null = null;
  userProductivity: ReportResponse['userProductivity'] = [];
  loading: boolean | undefined;

  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private departmentService: DepartmentService,
    private reportService: ReportService
  ) {}

  ngOnInit() {
    // Load all filter options
    this.userService.getUsers().subscribe(users => this.users = users);
    this.projectService.getProjects().subscribe(projects => this.projects = projects);
    this.departmentService.getDepartments().subscribe(departments => {
      this.departments = departments.data;
    });

    // Optionally, load initial report data
    this.loadReports();
  }
 // Initialize reportData with default values
 // In reports.component.ts
 
 reportData: ReportResponse = {
  taskSummary: {
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0
  },
  userProductivity: [],
  projectStats: [],
  departmentStats: []
};

loadReports() {
  this.loading = true;
  this.reportService.getTimeReport(this.filters).subscribe({
    next: (response: ReportResponse) => {
      this.reportData = response;
      console.log('Report data:', this.reportData);
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading report:', error);
      this.loading = false;
    }
  });
}

  export(type: 'csv' | 'pdf') {
    this.reportService.exportReport(this.filters, type).subscribe((blob: Blob | MediaSource) => {
      const url = window.URL.createObjectURL(blob );
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${type}`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}