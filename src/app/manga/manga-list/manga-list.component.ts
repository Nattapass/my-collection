import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/pagination.component';
import { CollectionSearchComponent } from '../../shared/collection-search.component';
import { RouterLink } from '@angular/router';

import { MangaService } from '../service/manga.service';
import { IManga } from '../interface/manga.interface';
@Component({
  selector: 'app-manga-list',
  imports: [
    CommonModule,
    PaginationComponent,
    CollectionSearchComponent,
    FormsModule,
    RouterLink
  ],
  templateUrl: './manga-list.component.html',
  styleUrl: './manga-list.component.scss'
})
export class MangaListComponent {
  mangaList = this.mangaService.mangaList;
  isLoading = this.mangaService.isLoading;
  page = 1;
  model: IManga | null = null;

  constructor(private mangaService: MangaService) {
  }

  ngOnInit(): void {
    this.mangaService.loadOnce();
  }



  refresh() {
    this.mangaService.refresh();
  }

  sortBy(sortType: string) {
    this.page = 1;
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
