import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbDropdownModule,
  NgbPaginationModule,
  NgbTypeaheadModule,
} from '@ng-bootstrap/ng-bootstrap';
import {
  OperatorFunction,
  Observable,
  debounceTime,
  map,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MangaService } from '../service/manga.service';
import { IManga } from '../interface/manga.interface';
@Component({
  selector: 'app-manga-list',
  imports: [
    CommonModule,
    NgbPaginationModule,
    NgbDropdownModule,
    NgbTypeaheadModule,
    FormsModule
  ],
  templateUrl: './manga-list.component.html',
  styleUrl: './manga-list.component.scss'
})
export class MangaListComponent {
  private destroyRef = inject(DestroyRef);
  mangaList = signal<IManga[]>([]);
  page = 1;
  model!: IManga;

  constructor(private mangaService: MangaService) {
  }

  ngOnInit(): void {
    this.getData();
  }

  search: OperatorFunction<string, readonly any[]> = (
    text$: Observable<string>
  ) =>
    text$.pipe(
      debounceTime(200),
      map((term) =>
        term === ''
          ? []
          : this.mangaList()
            .filter(
              (v) => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1
            )
            .slice(0, 10)
      )
    );

  formatter = (x: { name: string }) => x.name;

  getData() {
    this.mangaService.getMangaList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.mangaList.set(data ?? []);
        },
        error: (error) => {
          console.error(error);
        },
      });
  }

  sortBy(sortType: string) {
    const list = [...this.mangaList()];
    switch (sortType) {
      case 'New':
        this.mangaList.set(list.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ));
        break;
      case 'Old':
        this.mangaList.set(list.sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        ));
        break;
      case 'LastUpdated':
        this.mangaList.set(list
          .map((data) => {
            // data.filterDate = this.mapDate(data.lastUpDate);
            return { ...data, filterDate: this.mapDate(data.lastUpDate) };
          })
          .sort((a, b) => b.filterDate!.getTime() - a.filterDate!.getTime()));
        break;
      case 'startDated':
        this.mangaList.set(list
          .map((data) => {
            // data.filterDate = this.mapDate(data.startDate);
            return { ...data, filterDate: this.mapDate(data.lastUpDate) };
          })
          .sort((a, b) => a.filterDate!.getTime() - b.filterDate!.getTime()));
        break;
      default:
        this.mangaList.set(list.sort((a, b) => +a.no - +b.no));
        break;
    }
  }

  mapDate(date: string) {
    let filter = '';
    if (date.substring(0, 1) === '~') {
      filter = date.replace('~', '01/');
    } else {
      filter = date;
    }

    const [day, month, year] = filter.split('/').map(Number);
    return new Date(year, month - 1, day);
  }


}
