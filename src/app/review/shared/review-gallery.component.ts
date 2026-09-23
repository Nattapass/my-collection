import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, NgZone, PLATFORM_ID, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { MotionService } from '../../shared/motion';

export interface ReviewPhoto { url: string; caption?: string; }

@Component({
  selector: 'app-review-gallery',
  template: `
    @if (photos().length) {
      <section class="gallery" aria-label="ภาพประกอบ" (mouseenter)="hovered = true" (mouseleave)="hovered = false" (focusin)="focused = true" (focusout)="focused = false">
        <figure>
        <button type="button" class="image-button" (click)="open()" aria-label="ขยายภาพ">
          <img [src]="current()?.url" [alt]="current()?.caption || 'ภาพประกอบ ' + (index() + 1)" (error)="imageError()" [hidden]="failed()" />
          @if (failed()) { <span>โหลดรูปไม่สำเร็จ</span> }
        </button>
        @for (photo of [current()]; track photo?.url) {
          @if (caption()) {
            <figcaption class="memory-note">
              <span class="quote" aria-hidden="true">“</span>
              <div><p [class.collapsed]="longCaption() && !expanded()">{{ caption() }}</p>
                @if (longCaption()) {<button class="read-note" type="button" (click)="expanded.set(!expanded())" [attr.aria-expanded]="expanded()">{{ expanded() ? 'ย่อข้อความ' : 'อ่านข้อความทั้งหมด' }}</button>}
              </div>
            </figcaption>
          }
        }
        </figure>
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
        @if (caption()) {<div class="memory-note lightbox-note"><span class="quote" aria-hidden="true">“</span><p>{{ caption() }}</p></div>}
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
    figure{margin:0}.memory-note{display:flex;align-items:flex-start;gap:.75rem;max-width:760px;margin:1rem auto 0;padding:1rem 1.25rem;border:1px solid var(--edge,#d0dfef);border-left:3px solid var(--accent,#285ea8);border-radius:4px 14px 14px 4px;background:linear-gradient(120deg,var(--tint,#f1f6fc),#fff 85%);box-shadow:0 6px 18px #2035520c;color:#273e59;animation:note-enter .25s ease-out}.memory-note>div,.memory-note p{min-width:0}.memory-note p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(.95rem,1.5vw,1.05rem);line-height:1.9}.quote{font-family:Georgia,serif;font-size:2.7rem;line-height:1;color:var(--accent,#285ea8)}.collapsed{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.read-note{padding:.3rem 0 0;border:0;background:transparent;color:var(--accent,#285ea8);font-size:.85rem;font-weight:500}.lightbox-note{max-width:760px;background:#1f334c;border-color:#47617f;color:#eef4fc;box-shadow:none}.lightbox-note .quote{color:#a7c7ed}dialog:has(.lightbox-note)>img{max-height:58svh}@keyframes note-enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}@media(max-width:560px){.memory-note{padding:.85rem;gap:.5rem}.quote{font-size:2.2rem}}@media(prefers-reduced-motion:reduce){.memory-note{animation:none}}
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
  readonly caption = computed(() => this.current()?.caption?.trim() ?? '');
  readonly longCaption = computed(() => this.caption().length > 120 || this.caption().split('\n').length > 3);
  readonly expanded = signal(false);
  private previousPhotos: ReviewPhoto[] = [];
  readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');
  readonly motion = inject(MotionService);
  private readonly document = inject(DOCUMENT);
  hovered = false;
  focused = false;
  constructor() {
    effect(() => {
      const photos = this.photos();
      const previousUrl = this.previousPhotos[untracked(this.index)]?.url;
      this.index.set(Math.max(0, photos.findIndex(photo => photo.url === previousUrl)));
      this.previousPhotos = photos;
      this.failed.set(false);
    });
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const window = this.document.defaultView;
    if (!window) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.paused.set(media.matches);
    const destroy = inject(DestroyRef);
    inject(NgZone).runOutsideAngular(() => {
      const timer = window.setInterval(() => {
        if (!this.paused() && !this.expanded() && this.motion.enabled() && !media.matches && !this.opened() &&
          !this.hovered && !this.focused && !this.document.hidden && this.photos().length > 1) this.move(1);
      }, 6500);
      destroy.onDestroy(() => window.clearInterval(timer));
    });
  }
  select(index: number) { this.index.set(index); this.failed.set(false); this.expanded.set(false); }
  move(step: number) { if (this.photos().length) this.select((this.index() + step + this.photos().length) % this.photos().length); }
  open() { this.opened.set(true); this.lightbox()?.nativeElement.showModal(); }
  backdrop(event: MouseEvent) { if (event.target === this.lightbox()?.nativeElement) this.lightbox()?.nativeElement.close(); }
}
