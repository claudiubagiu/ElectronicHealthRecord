import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { MAT_COMMON_IMPORTS } from '../../imports/material.imports';

@Component({
  selector: 'app-carousel-section',
  templateUrl: './carousel-section.html',
  styleUrls: ['./carousel-section.scss'],
  standalone: true,
  imports: [...MAT_COMMON_IMPORTS],
})
export class CarouselSection {
  @Input() title!: string;
  @Input() icon!: string;
  @Input() isLoading = false;
  @Input() isEmpty = false;
  @Input() emptyIcon!: string;
  @Input() emptyMessage = 'No items found.';

  @ViewChild('track') trackRef!: ElementRef<HTMLElement>;

  scroll(direction: 'left' | 'right'): void {
    const el = this.trackRef.nativeElement;
    const distance = 296; // 280px card + 16px gap
    const target = direction === 'left' ? -distance : distance;
    const duration = 300;
    const start = el.scrollLeft;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + target * easeOutCubic(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}
