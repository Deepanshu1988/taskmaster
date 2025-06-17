import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS} from '@angular/common/http';  
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
//import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { UsersComponent } from './pages/users/users.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { routes } from './app.routes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ProjectService } from './services/project.service'; 
import { TaskService } from './services/task.service'; 
import { ProjectsModule } from './pages/projects/projects.module';
import { TruncatePipe } from './pipes/truncate.pipe';
import { TaskListComponent } from './pages/tasks/task-list/task-list.component';
import { UserService } from './services/user.service';
import { ToastrModule } from 'ngx-toastr';
import { GanttModule } from 'ngx-gantt';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { AuthModule } from './pages/auth/auth.module';
import { TasksModule } from './pages/tasks/tasks.module';
import { SettingsModule } from './pages/settings/settings.module';
import { NotificationsModule } from './pages/notifications/notifications.module';
import { DepartmentManagementComponent } from './pages/department-management/department-management.component';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    TasksComponent,
    UsersComponent,
    DashboardComponent,
    TruncatePipe,
    TaskListComponent,
    DepartmentManagementComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes, { useHash: true }),
    BrowserAnimationsModule,
    NgbModule,
    ProjectsModule,
    ToastrModule.forRoot(),
    GanttModule,
    DashboardModule,
    AuthModule,
    TasksModule,
    SettingsModule,
    NotificationsModule,
    //MatSnackBarModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    AuthService,
    AuthGuard,
    AdminGuard,
    ProjectService,
    TaskService,
    UserService
  ],
  bootstrap: [AppComponent],
  //entryComponents: [DepartmentManagementComponent]
})
export class AppModule { }