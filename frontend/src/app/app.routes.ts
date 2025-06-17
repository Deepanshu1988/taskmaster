import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { UsersComponent } from './pages/users/users.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ProjectFormComponent } from './pages/projects/project-form/project-form.component';
import { UserFormComponent } from './pages/users/user-form/user-form.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { DepartmentManagementComponent } from './pages/department-management/department-management.component';
import { DepartmentsComponent } from './pages/departments/departments.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { 
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'tasks',
    component: TasksComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'test',
    component: UserFormComponent
  },
  {
    path: 'users/new',
    component: UserFormComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'users/:id',
    component: UserFormComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'projects/new',
    component: ProjectFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'projects/:id',
    component: ProjectFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'department-management',
    component: DepartmentManagementComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'departments',
    component: DepartmentsComponent,
    canActivate: [AuthGuard]
  },

  { path: '**', redirectTo: '/dashboard' }
];