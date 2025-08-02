import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { TasksRoutingModule } from './tasks-routing.module';
import { TasksComponent } from './tasks.component';
import { TaskListComponent } from './task-list/task-list.component';
import { TaskDetailsComponent } from './task-details/task-details.component';
import { TaskAttachmentsComponent } from './task-attachments/task-attachments.component';
import { FileSizePipe } from './file-size.pipe';

@NgModule({
  declarations: [
    TasksComponent,
    TaskListComponent,
    TaskDetailsComponent,
    TaskAttachmentsComponent,
    FileSizePipe
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
    TasksRoutingModule
  ],
  exports: [
    TasksComponent
  ]
})
export class TasksModule { }
