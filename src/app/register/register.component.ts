import { API_URL } from '../shared/api-url';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import Swal from 'sweetalert2'
import { CollectionSearchComponent } from '../shared/collection-search.component';
import { finalize } from 'rxjs';
import { IManga } from '../manga/interface/manga.interface';
import { MangaService } from '../manga/service/manga.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CollectionSearchComponent, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private destroyRef = inject(DestroyRef);
  private readonly initialFormValue = {
    name: '',
    licence: '',
    startDate: '',
    lastUpDate: '',
    status: '',
    totalVol: '',
    imgUrl: '',
    type: '',
  };
  listForm = new FormGroup({
    name: new FormControl(this.initialFormValue.name),
    licence: new FormControl(this.initialFormValue.licence),
    startDate: new FormControl(this.initialFormValue.startDate),
    lastUpDate: new FormControl(this.initialFormValue.lastUpDate),
    status: new FormControl(this.initialFormValue.status),
    totalVol: new FormControl(this.initialFormValue.totalVol),
    imgUrl: new FormControl(this.initialFormValue.imgUrl),
    type: new FormControl(this.initialFormValue.type),
  });
  mangaList = signal<IManga[]>([]);
  selectedManga: IManga | null = null;
  isLoading = signal(false);

  constructor(private http: HttpClient, private mangaService: MangaService) {
    this.getManga();
  }

  getManga() {
    this.mangaService.getMangaList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.mangaList.set(data ?? []);
        },
        error: (error) => {
          console.error('HTTP request failed', error);
        },
      });
  }

  onSubmit() {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true)
    const formValue = this.listForm.getRawValue();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // withCredentials: true,
      // Add any other custom headers here
      // 'Access-Control-Allow-Origin': '*'
    });
    const options = { headers };
    const selectedManga = this.selectedManga;
    if (selectedManga && selectedManga.no) {
      this.http
        .put(
          `${API_URL}/manga/no/${selectedManga.no}`,
          this.listForm.value,
          { withCredentials: true }
        )
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe({
          next: (data) => {
            console.log('HTTP request successful', data);
            this.mangaList.update((list) =>
              list.map((item) =>
                item.no === selectedManga.no
                  ? this.mergeManga(item, formValue)
                  : item
              )
            );
            Swal.fire({
              title: 'Update Success!',
              text: '',
              icon: 'success',
            });
            this.listForm.reset(this.initialFormValue);
            this.collectionSearch()?.clear();
            this.selectedManga = null;
            // Handle the data or update component properties here
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: error,
            });
            // Handle the error here
          },
        });
    } else {
      this.http
        .post<any>(
          `${API_URL}/manga`,
          this.listForm.value,
          { withCredentials: true }
        )
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe({
          next: (data: IManga) => {
            this.mangaList.update((list) => [data, ...list]);
            Swal.fire({
              title: 'Update Success!',
              text: '',
              icon: 'success',
            });
            this.listForm.reset(this.initialFormValue);
            this.collectionSearch()?.clear();
            this.selectedManga = null;
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: 'Update Failed',
              text: error,
            });
            // Handle the error here
          },
        });
    }
  }

  onSelectManga(selectedManga: IManga | null) {

    if (!selectedManga) {
      this.selectedManga = null;
      return;
    }

    this.selectedManga = selectedManga;
    this.listForm.setValue({
      name: selectedManga.name,
      licence: selectedManga.licence,
      startDate: selectedManga.startDate,
      lastUpDate: selectedManga.lastUpDate,
      status: selectedManga.status,
      totalVol: selectedManga.totalVol,
      imgUrl: selectedManga.imgUrl,
      type: selectedManga.type,
    });
  }

  readonly collectionSearch = viewChild(CollectionSearchComponent);



  get isLoadingValue(): boolean {
    return this.isLoading();
  }

  private mergeManga(item: IManga, formValue: typeof this.listForm.value) {
    return {
      ...item,
      name: formValue.name ?? item.name,
      licence: formValue.licence ?? item.licence,
      startDate: formValue.startDate ?? item.startDate,
      lastUpDate: formValue.lastUpDate ?? item.lastUpDate,
      status: formValue.status ?? item.status,
      totalVol: formValue.totalVol ?? item.totalVol,
      imgUrl: formValue.imgUrl ?? item.imgUrl,
      type: formValue.type ?? item.type
    };
  }
}
