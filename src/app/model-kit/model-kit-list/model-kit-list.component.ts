import { Component, DestroyRef, inject, signal } from '@angular/core';
import { IModelKit } from '../interface/manga.interface';
import { ModelKitService } from '../service/model-kit.service';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../../shared/pagination.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-model-kit-list',
  imports: [
    CommonModule,
    PaginationComponent,],
  templateUrl: './model-kit-list.component.html',
  styleUrl: './model-kit-list.component.scss'
})
export class ModelKitListComponent {
  private destroyRef = inject(DestroyRef);
  modelKitList = signal<IModelKit[]>([]);
  page = 1;

  constructor(private modelKitService: ModelKitService) {
  }

  ngOnInit() {
    this.modelKitService.getModelKitList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.modelKitList.set(data ?? []);
        },
        error: (error) => {
          console.error(error);
        }
      });
  }
}
