import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrModule } from 'ngx-toastr';

import { TasksRoutingModule } from './tasks-routing.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TasksRoutingModule,
    ToastrModule  // Import without forRoot() since it's already configured in AppModule
  ]
})
export class TasksModule { }
