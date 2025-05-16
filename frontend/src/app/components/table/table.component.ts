import { Component, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-table',
  template: `
    <table>
      <thead>
        <tr>
          <th *ngFor="let col of columns">{{ col.header }}</th>
          <th *ngIf="actions.length">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of data">
          <td *ngFor="let col of columns">{{ item[col.field] }}</td>
          <td *ngIf="actions.length">
            <app-button
              *ngFor="let action of actions"
              [label]="action.label"
              [color]="action.color"
              (click)="action.handler(item.id)"
            ></app-button>
          </td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [`
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
  `]
})
export class TableComponent {
  @Input() data: any[] = [];
  @Input() columns: { field: string; header: string }[] = [];
  @Input() actions: { label: string; color: string; handler: (id: number) => void }[] = [];
}