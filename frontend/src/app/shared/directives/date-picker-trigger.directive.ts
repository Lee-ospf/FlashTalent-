// shared/directives/date-picker-trigger.directive.ts
import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'input[type=date], input[type=time]',
  standalone: true,
})
export class DatePickerTriggerDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('click')
  @HostListener('focus')
  open(): void {
    const input = this.el.nativeElement;
    if (typeof (input as any).showPicker === 'function') {
      try {
        (input as any).showPicker();
      } catch {
        // some browsers throw if the input isn't visible/focused yet — safe to ignore
      }
    }
  }
}