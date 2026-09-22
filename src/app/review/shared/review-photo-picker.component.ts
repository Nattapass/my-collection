import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReviewGalleryComponent } from './review-gallery.component';

interface LocalPhoto { url: string; name: string; original: number; size: number; }
@Component({
  selector: 'app-review-photo-picker',
  imports: [ReviewGalleryComponent],
  template: `
    <section aria-labelledby="photo-picker-title">
      <h2 id="photo-picker-title">ภาพประกอบเพิ่มเติม</h2>
      <p class="notice">ทดลองจัดรูปได้ในหน้านี้ รูปยังไม่ถูกบันทึกพร้อมรีวิวจนกว่าจะเชื่อมระบบอัปโหลด cloud</p>
      <label class="drop" (dragover)="$event.preventDefault()" (drop)="drop($event)">
        <strong>{{ busy() ? 'กำลังเตรียมรูป...' : '+ เลือกรูป หรือลากมาวางที่นี่' }}</strong>
        <span>JPEG / PNG / WebP · ไม่เกิน 10 รูป · รูปละไม่เกิน 20 MB</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple [disabled]="busy()" (change)="choose($event)" />
      </label>
      @if (error()) {<p role="alert">{{ error() }}</p>}
      <div class="photos">@for (photo of photos(); track photo.url; let i = $index) {
        <div class="photo"><img [src]="photo.url" [alt]="photo.name" /><div><strong>{{ photo.name }}</strong><small>{{ kb(photo.original) }} → {{ kb(photo.size) }} KB</small></div>
          <button type="button" (click)="move(i,-1)" [disabled]="i === 0 || busy()" aria-label="เลื่อนรูปไปก่อนหน้า">↑</button>
          <button type="button" (click)="move(i,1)" [disabled]="i === photos().length-1 || busy()" aria-label="เลื่อนรูปไปถัดไป">↓</button>
          <button type="button" (click)="remove(i)" [disabled]="busy()" aria-label="ลบรูป">×</button>
        </div>
      }</div>
      @if (photos().length) {<details><summary>ดูตัวอย่างแกลเลอรี</summary><app-review-gallery [photos]="gallery()" /></details>}
    </section>
  `,
  styles: [`
    section{margin-top:2rem;border-top:1px solid #d3deec;padding-top:1.5rem}h2{font-size:1.2rem;font-weight:600}.notice{font-size:.85rem;color:#805823;background:#fff6df;padding:.8rem;border-radius:8px}
    .drop{display:grid;gap:.5rem;border:2px dashed #a9c0df;border-radius:12px;padding:1.5rem;text-align:center;background:#f4f8ff;cursor:pointer}.drop span{font-size:.8rem;color:#5a708c}.drop input{max-width:100%;margin:auto}
    .photos{display:grid;gap:.6rem;margin:1rem 0}.photo{display:flex;align-items:center;gap:.5rem;border:1px solid #d2ddeb;border-radius:8px;padding:.5rem}.photo img{width:60px;height:60px;object-fit:contain}.photo>div{flex:1;min-width:0}.photo strong{display:block;font-size:.8rem;overflow-wrap:anywhere}.photo small{color:#62758e}button{padding:.3rem .6rem;border:1px solid #b9cbe1;border-radius:6px;background:#fff}button:disabled{opacity:.3}summary{cursor:pointer;color:#285ea8}
  `]
})
export class ReviewPhotoPickerComponent {
  readonly photos = signal<LocalPhoto[]>([]);
  readonly gallery = computed(() => this.photos().map(photo => ({url: photo.url, caption: photo.name})));
  readonly busy = signal(false);
  readonly error = signal('');
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; this.photos().forEach(photo => URL.revokeObjectURL(photo.url)); });
  }
  kb(bytes: number) { return Math.round(bytes / 1024); }
  choose(event: Event) { const input = event.target as HTMLInputElement; void this.add(Array.from(input.files ?? [])); input.value = ''; }
  drop(event: DragEvent) { event.preventDefault(); void this.add(Array.from(event.dataTransfer?.files ?? [])); }
  async add(files: File[]) {
    if (this.busy()) return;
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
            if (!this.destroyed) this.photos.update(list => [...list, {url: URL.createObjectURL(blob), name: file.name, original: file.size, size: blob.size}]);
          } finally { bitmap.close(); }
        } catch { this.error.set('อ่านรูปบางไฟล์ไม่ได้ กรุณาลองไฟล์อื่น'); }
      }
    } finally { this.busy.set(false); }
  }
  remove(index: number) { URL.revokeObjectURL(this.photos()[index].url); this.photos.update(list => list.filter((_, i) => i !== index)); }
  move(index: number, step: number) {
    const next = index + step;
    if (next < 0 || next >= this.photos().length) return;
    this.photos.update(list => { const copy = [...list]; [copy[index],copy[next]] = [copy[next],copy[index]]; return copy; });
  }
}
