import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, Injectable, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionService {
  readonly enabled = signal(true);
}

@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  readonly appReveal = input<unknown>();
  readonly revealStagger = input<number | null>(null);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(MotionService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  constructor() {
    effect(onCleanup => {
      this.appReveal();
      const stagger = this.revealStagger();
      const enabled = this.motion.enabled();
      if (!this.browser || !enabled ||
        this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (stagger !== null) {
        // Animate incoming rows on creation or pagination without fading the whole page.
        const animation = this.element.nativeElement.animate(
          [{ opacity: 0, transform: 'translateY(16px) scale(.98)' },
           { opacity: 1, transform: 'translateY(0) scale(1)' }],
          { duration: 420, delay: Math.min(stagger, 5) * 45,
            easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
        );
        const showNow = () => animation.cancel();
        this.element.nativeElement.addEventListener('focusin', showNow);
        onCleanup(() => {
          animation.cancel();
          this.element.nativeElement.removeEventListener('focusin', showNow);
        });
        return;
      }
      let animation: Animation | undefined;
      // Coalesce rapid search updates; never delay the actual results.
      const timer = setTimeout(() => {
        animation = this.element.nativeElement.animate(
          [{ opacity: .55, translate: '0 6px' }, { opacity: 1, translate: '0 0' }],
          { duration: 220, easing: 'ease-out' }
        );
      }, 140);
      onCleanup(() => { clearTimeout(timer); animation?.cancel(); });
    });
  }
}

@Directive({ selector: '[appFloat]', host: { class: 'floating-surface' } })
export class FloatDirective {
  private readonly element = inject(ElementRef<HTMLElement>);
  constructor() {
    const destroy = inject(DestroyRef);
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const node = this.element.nativeElement;
    const observer = new IntersectionObserver(entries => {
      node.classList.toggle('float-visible', entries[0].isIntersecting);
    }, { threshold: .1 });
    observer.observe(node);
    const document = inject(DOCUMENT);
    const visibility = () => node.classList.toggle('float-hidden', document.hidden);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    destroy.onDestroy(() => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    });
  }
}
