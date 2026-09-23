import { GalleryPhoto, ReviewMediaService, UploadProgress, UploadContext } from './review-media.service';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ReviewGalleryComponent } from './review-gallery.component';

interface LocalPhoto { url: string; name: string; caption: string; original: number; size: number; blob?: Blob; progress: UploadProgress; }
@Component({
  selector: 'app-review-photo-picker',
  imports: [ReviewGalleryComponent],
  template: `
    <section aria-labelledby="photo-picker-title">
      <h2 id="photo-picker-title">ภาพประกอบเพิ่มเติม</h2>
      <p class="notice">รูปจะถูกบีบอัดก่อนอัปโหลด และบันทึกพร้อมรีวิวเมื่อกดบันทึก</p>
      <label class="drop" (dragover)="$event.preventDefault()" (drop)="drop($event)">
        <strong>{{ busy() ? 'กำลังเตรียมรูป...' : '+ เลือกรูป หรือลากมาวางที่นี่' }}</strong>
        <span>JPEG / PNG / WebP · ไม่เกิน 10 รูป · ต้นฉบับไม่เกิน 20 MB · หลังบีบอัดไม่เกิน 5 MB</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple [disabled]="busy() || locked()" (change)="choose($event)" />
      </label>
      @if (error()) {<p role="alert">{{ error() }}</p>}
      @if (uploadStatus()) {<p role="status" aria-live="polite">{{ uploadStatus() }}</p>}
      <div class="photos">@for (photo of photos(); track photo.progress; let i = $index) {
        <article class="photo">
          <div class="photo-header">
            <img [src]="photo.url || undefined" [alt]="'ภาพที่ ' + (i + 1)" />
            <div class="file-info"><strong>{{ photo.name }}</strong>@if (photo.blob) {<small>{{ kb(photo.original) }} → {{ kb(photo.size) }} KB</small>} @else {<small>รูปที่บันทึกแล้ว</small>}</div>
            <div class="photo-actions">
              <button type="button" (click)="move(i,-1)" [disabled]="i === 0 || busy() || locked()" aria-label="เลื่อนรูปไปก่อนหน้า">↑</button>
              <button type="button" (click)="move(i,1)" [disabled]="i === photos().length-1 || busy() || locked()" aria-label="เลื่อนรูปไปถัดไป">↓</button>
              <button type="button" (click)="remove(i)" [disabled]="busy() || locked()" aria-label="ลบรูป">×</button>
            </div>
          </div>
          <label [for]="'photo-caption-' + i">ความประทับใจในภาพนี้ <span>(ไม่บังคับ)</span></label>
          <textarea [id]="'photo-caption-' + i" rows="3" maxlength="1000" [value]="photo.caption" (input)="updateCaption(i, $any($event.target).value)" [disabled]="busy() || locked()" placeholder="ฉากนี้ทำให้รู้สึกยังไง หรือมีอะไรที่อยากเก็บไว้จำ..."></textarea>
          <small class="count">{{ photo.caption.length }} / 1,000</small>
        </article>
      }</div>
      @if (photos().length) {<details><summary>ดูตัวอย่างแกลเลอรี</summary><app-review-gallery [photos]="gallery()" /></details>}
    </section>
  `,
  styles: [`
    section{margin-top:2rem;border-top:1px solid #d3deec;padding-top:1.5rem}h2{font-size:1.2rem;font-weight:600}.notice{font-size:.85rem;color:#805823;background:#fff6df;padding:.8rem;border-radius:8px}
    .drop{display:grid;gap:.5rem;border:2px dashed #a9c0df;border-radius:12px;padding:1.5rem;text-align:center;background:#f4f8ff;cursor:pointer}.drop span{font-size:.8rem;color:#5a708c}.drop input{max-width:100%;margin:auto}
    .photos{display:grid;gap:1rem;margin:1rem 0}.photo{border:1px solid #d2ddeb;border-left:3px solid var(--accent,#285ea8);border-radius:12px;padding:1rem;background:linear-gradient(125deg,#f5f8fc,#fff 65%);box-shadow:0 5px 14px #20355209}.photo-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}.photo img{width:64px;height:64px;object-fit:contain;border-radius:6px}.file-info{flex:1;min-width:0}.photo strong{display:block;font-size:.85rem;overflow-wrap:anywhere}.photo small,label span{color:#62758e;font-size:.75rem}.photo-actions{display:flex;gap:.3rem}.photo label{display:block;font-size:.9rem;font-weight:500;margin-bottom:.5rem}.photo textarea{display:block;width:100%;box-sizing:border-box;min-height:100px;resize:vertical;border:1px solid #bfcede;border-radius:8px;padding:.7rem .85rem;font:inherit;font-size:.95rem;line-height:1.8;background:#fff;color:#203552}.photo textarea:focus-visible{outline:2px solid var(--accent,#285ea8);outline-offset:2px}.count{display:block;text-align:right;margin-top:.3rem}button{padding:.3rem .6rem;border:1px solid #b9cbe1;border-radius:6px;background:#fff}button:disabled{opacity:.3}summary{cursor:pointer;color:var(--accent,#285ea8)}@media(max-width:420px){.photo{padding:.75rem}.photo-header{flex-wrap:wrap}.photo-actions{margin-left:auto}.photo img{width:48px;height:48px}}
  `]
})
export class ReviewPhotoPickerComponent {
  private readonly media = inject(ReviewMediaService);
  readonly existing = input<GalleryPhoto[]>([]);
  readonly locked = input(false);
  readonly uploadStatus = signal('');
  private readonly abort = new AbortController();
  readonly photos = signal<LocalPhoto[]>([]);
  readonly gallery = computed(() => this.photos().map(photo => ({url: photo.url, caption: photo.caption})));
  readonly busy = signal(false);
  readonly error = signal('');
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; this.abort.abort(); this.clear(); });
    effect(onCleanup => {
      const existing = this.existing();
      untracked(() => {
      this.clear();
      this.photos.set(existing.map((photo, i) => ({ url: '', name: 'ภาพที่ ' + (i + 1), caption: photo.caption ?? '', original: 0, size: 0, progress: {key: photo.key} })));
      this.busy.set(true);
      const subscription = this.media.read(existing).subscribe({
        next: signed => {
          this.photos.update(photos => photos.map(photo => ({ ...photo, url: signed.find(item => item.key === photo.progress.key)?.url || '' })));
          this.busy.set(false);
        },
        error: () => { this.busy.set(false); this.error.set('โหลดตัวอย่างรูปเดิมไม่สำเร็จ ข้อมูลรูปเดิมยังอยู่ กรุณาเปิดหน้าแก้ไขอีกครั้ง'); }
      });
      onCleanup(() => subscription.unsubscribe());
      });
    });
  }
  clear() {
    this.photos().forEach(photo => { if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url); });
    this.photos.set([]);
    this.uploadStatus.set('');
  }
  async prepare(context?: UploadContext): Promise<GalleryPhoto[]> {
    if (this.busy()) throw new Error('กรุณารอให้เตรียมรูปเสร็จก่อน');
    this.busy.set(true);
    this.error.set('');
    try {
      const gallery: GalleryPhoto[] = [];
      for (const [i, photo] of this.photos().entries()) {
        if (this.destroyed) throw new Error('Upload cancelled');
        this.uploadStatus.set('กำลังอัปโหลดรูป ' + (i + 1) + ' / ' + this.photos().length);
        const key = photo.progress.key ?? await this.media.upload(photo.blob!, photo.progress, this.abort.signal, context);
        gallery.push({key, caption: photo.caption});
      }
      this.uploadStatus.set(gallery.length ? 'เตรียมรูปครบแล้ว กำลังบันทึกรีวิว...' : '');
      return gallery;
    } catch (error) {
      this.error.set('อัปโหลดไม่สำเร็จ รูปที่เลือกยังอยู่ กดบันทึกเพื่อลองใหม่ได้');
      this.uploadStatus.set('');
      throw error;
    } finally { this.busy.set(false); }
  }
  updateCaption(index: number, caption: string) {
    if (this.busy() || this.locked()) return;
    this.photos.update(photos => photos.map((photo, i) => i === index ? {...photo, caption: caption.slice(0, 1000)} : photo));
  }
  saved() { this.uploadStatus.set('บันทึกรูปเรียบร้อยแล้ว'); }
  kb(bytes: number) { return Math.round(bytes / 1024); }
  choose(event: Event) { const input = event.target as HTMLInputElement; void this.add(Array.from(input.files ?? [])); input.value = ''; }
  drop(event: DragEvent) { event.preventDefault(); void this.add(Array.from(event.dataTransfer?.files ?? [])); }
  async add(files: File[]) {
    if (this.busy() || this.locked()) return;
    this.busy.set(true); this.error.set('');
    try {
      for (const file of files) {
        if (this.destroyed) break;
        if (this.photos().length >= 10) { this.error.set('เพิ่มได้สูงสุด 10 รูป'); break; }
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
          this.error.set('บางไฟล์ไม่ใช่รูปที่รองรับ หรือมีขนาดเกิน 20 MB'); continue;
        }
        try {
          const bitmap = await createImageBitmap(file);
          try {
            const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
            canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .83));
            const blob = compressed && compressed.size < file.size ? compressed : file;
            if (blob.size > 5 * 1024 * 1024) { this.error.set('รูปยังใหญ่เกิน 5 MB หลังบีบอัด กรุณาลดขนาดก่อน'); continue; }
            if (!this.destroyed) this.photos.update(list => [...list, {url: URL.createObjectURL(blob), name: file.name, caption: '', original: file.size, size: blob.size, blob, progress: {}}]);
          } finally { bitmap.close(); }
        } catch { this.error.set('อ่านรูปบางไฟล์ไม่ได้ กรุณาลองไฟล์อื่น'); }
      }
    } finally { this.busy.set(false); }
  }
  remove(index: number) { if (this.busy() || this.locked()) return; URL.revokeObjectURL(this.photos()[index].url); this.photos.update(list => list.filter((_, i) => i !== index)); }
  move(index: number, step: number) {
    if (this.busy() || this.locked()) return;
    const next = index + step;
    if (next < 0 || next >= this.photos().length) return;
    this.photos.update(list => { const copy = [...list]; [copy[index],copy[next]] = [copy[next],copy[index]]; return copy; });
  }
}
