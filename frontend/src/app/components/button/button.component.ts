import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-button',
  template: `
    <button [style.backgroundColor]="color" (click)="onClick()">{{ label }}</button>
  `,
  styles: [`
    button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      color: white;
      cursor: pointer;
      margin-right: 5px;
    }
    button:hover {
      opacity: 0.9;
    }
  `]
})
export class ButtonComponent {
  @Input() label: string = 'Button';
  @Input() color: string = '#007bff';
  @Output() click = new EventEmitter<void>();

  onClick(): void {
    this.click.emit();
  }
}