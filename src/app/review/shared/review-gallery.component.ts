import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, NgZone, PLATFORM_ID, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { MotionService } from '../../shared/motion';

export interface ReviewPhoto { url: string; caption?: string; }

@Component({
  selector: 'app-review-gallery',
  template: `
    @if (photos().length) {
      <section class="gallery" aria-label="ภาพประกอบ" (mouseenter)="hovered = true" (mouseleave)="hovered = false" (focusin)="focused = true" (focusout)="focused = false">
        <button type="button" class="image-button" (click)="open()" aria-label="ขยายภาพ">
          <img [src]="current()?.url" [alt]="current()?.caption || 'ภาพประกอบ ' + (index() + 1)" (error)="imageError()" [hidden]="failed()" />
          @if (failed()) { <span>โหลดรูปไม่สำเร็จ</span> }
        </button>
        <div class="controls">
          <button type="button" (click)="move(-1)" [disabled]="photos().length < 2" aria-label="ภาพก่อนหน้า">&#8592;</button>
          <span>{{ index() + 1 }} / {{ photos().length }}</span>
          <button type="button" (click)="move(1)" [disabled]="photos().length < 2" aria-label="ภาพถัดไป">&#8594;</button>
          <button type="button" (click)="paused.set(!paused())" [attr.aria-pressed]="paused()" [disabled]="photos().length < 2">{{ paused() ? 'เล่นสไลด์' : 'หยุดสไลด์' }}</button>
        </div>
        <div class="thumbnails" aria-label="เลือกรูป">
          @for (photo of photos(); track $index) { <button type="button" (click)="select($index)" [attr.aria-label]="'รูปที่ ' + ($index + 1)" [attr.aria-pressed]="index() === $index"><img [src]="photo.url" alt="" loading="lazy" /></button> }
        </div>
      </section>
      <dialog #lightbox (click)="backdrop($event)" (close)="opened.set(false)" (keydown.arrowleft)="move(-1); $event.preventDefault()" (keydown.arrowright)="move(1); $event.preventDefault()">
        <button class="close" type="button" (click)="lightbox.close()" autofocus aria-label="ปิดภาพขยาย">ปิด ×</button>
        <img [src]="current()?.url" [alt]="current()?.caption || 'ภาพประกอบ'" />
        <div class="controls"><button type="button" (click)="move(-1)" aria-label="ภาพก่อนหน้า">&#8592;</button><span>{{ index() + 1 }} / {{ photos().length }}</span><button type="button" (click)="move(1)" aria-label="ภาพถัดไป">&#8594;</button></div>
      </dialog>
    }
  `,
  styles: [`
    :host{display:block}.gallery{margin:2rem 0}.image-button{display:grid;place-items:center;border:0;padding:0;width:100%;background:transparent;min-height:150px;cursor:zoom-in}.image-button img{max-height:560px;max-width:100%;object-fit:contain;border-radius:10px}
    button{font:inherit;border:1px solid #bdcde0;background:#fff;border-radius:8px;padding:.5rem .8rem;color:#29476d;cursor:pointer}button:disabled{opacity:.4}
    .controls{display:flex;align-items:center;justify-content:flex-end;gap:.6rem;margin:.8rem 0;font-size:.85rem}.thumbnails{display:flex;gap:.5rem;overflow-x:auto;padding:4px}.thumbnails button{padding:3px;flex:0 0 76px}.thumbnails img{height:55px;width:68px;object-fit:cover}.thumbnails [aria-pressed=true]{outline:2px solid #285ea8}
    dialog{width:min(1100px,95vw);max-height:95svh;border:0;border-radius:12px;padding:1rem;background:#14243a;color:white}dialog::backdrop{background:#071221df}dialog>img{display:block;max-height:75svh;max-width:100%;margin:auto;object-fit:contain}.close{display:block;margin:0 0 .5rem auto}button:focus-visible{outline:3px solid #6b9cdd;outline-offset:3px}
    @media(max-width:560px){.controls{flex-wrap:wrap}.image-button img{max-height:380px}}
  `]
})
export class ReviewGalleryComponent {
  readonly loadFailed = output<void>();
  imageError() { this.failed.set(true); this.loadFailed.emit(); }
  readonly photos = input<ReviewPhoto[]>([]);
  readonly index = signal(0);
  readonly paused = signal(false);
  readonly opened = signal(false);
  readonly failed = signal(false);
  readonly current = computed<ReviewPhoto | undefined>(() => this.photos()[this.index()]);
  readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');
  readonly motion = inject(MotionService);
  private readonly document = inject(DOCUMENT);
  hovered = false;
  focused = false;
  constructor() {
    effect(() => { this.photos(); this.index.set(0); this.failed.set(false); });
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const window = this.document.defaultView;
    if (!window) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.paused.set(media.matches);
    const destroy = inject(DestroyRef);
    inject(NgZone).runOutsideAngular(() => {
      const timer = window.setInterval(() => {
        if (!this.paused() && this.motion.enabled() && !media.matches && !this.opened() &&
          !this.hovered && !this.focused && !this.document.hidden && this.photos().length > 1) this.move(1);
      }, 6500);
      destroy.onDestroy(() => window.clearInterval(timer));
    });
  }
  select(index: number) { this.index.set(index); this.failed.set(false); }
  move(step: number) { if (this.photos().length) this.select((this.index() + step + this.photos().length) % this.photos().length); }
  open() { this.opened.set(true); this.lightbox()?.nativeElement.showModal(); }
  backdrop(event: MouseEvent) { if (event.target === this.lightbox()?.nativeElement) this.lightbox()?.nativeElement.close(); }
}
