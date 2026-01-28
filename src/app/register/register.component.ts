import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import Swal from 'sweetalert2'
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { OperatorFunction, Observable, debounceTime, map } from 'rxjs';
import { IManga } from '../manga/interface/manga.interface';
import { Store } from '@ngrx/store';
import { addManga, loadManga, updateManga } from '../manga/ngrx/action/manga.action';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, NgbTypeaheadModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  listForm = new FormGroup({
    name: new FormControl(''),
    licence: new FormControl(''),
    startDate: new FormControl(''),
    lastUpDate: new FormControl(''),
    status: new FormControl(''),
    totalVol: new FormControl(''),
    imgUrl: new FormControl(''),
    type: new FormControl(''),
  });
  mangaList$ = this.store.select(state => state.manga);
  mangaList: Array<IManga> = [];
  selectedManga!: IManga;
  isLoading = false;

  constructor(private http: HttpClient, private store: Store<{ manga: IManga[] }>) {
    this.mangaList$.subscribe(
    {
      next: (response) => {
          if(response){
            this.mangaList = response
          }
      }
    }
      //   (data) => {
      
    //   this.mangaList = data
    // }
  )
  }

  getManga() {
    this.http
      .get<any>('https://service-collection.vercel.app/manga')
      .subscribe({
        next: (data) => {
          this.mangaList = data;
        },
        error: (error) => {
          console.error('HTTP request failed', error);
        },
      });
  }

  onSubmit() {
    this.isLoading = true
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // withCredentials: true,
      // Add any other custom headers here
      // 'Access-Control-Allow-Origin': '*'
    });
    const options = { headers };
    if (this.selectedManga && this.selectedManga.no) {
      this.http
        .put(
          `https://service-collection.vercel.app/manga/no/${this.selectedManga.no}`,
          this.listForm.value,
          { withCredentials: true }
        )
        .subscribe({
          next: (data) => {
            this.isLoading = false
            console.log('HTTP request successful', data);
            this.store.dispatch(updateManga({ mangaNo: this.selectedManga.no, mangaUpdate: this.selectedManga }))
            Swal.fire({
              title: 'Update Success!',
              text: '',
              icon: 'success',
            });
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
          'https://service-collection.vercel.app/manga',
          this.listForm.value,
          { withCredentials: true }
        )
        .subscribe({
          next: (data: IManga) => {
            this.isLoading = false
            this.store.dispatch(addManga({ manga: data }))
            Swal.fire({
              title: 'Update Success!',
              text: '',
              icon: 'success',
            });
            this.listForm.reset();
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

  onSelectManga(event: any) {
    const selectedIndex = event.item;
    this.selectedManga = selectedIndex;
    this.listForm.setValue({
      name: this.selectedManga.name,
      licence: this.selectedManga.licence,
      startDate: this.selectedManga.startDate,
      lastUpDate: this.selectedManga.lastUpDate,
      status: this.selectedManga.status,
      totalVol: this.selectedManga.totalVol,
      imgUrl: this.selectedManga.imgUrl,
      type: this.selectedManga.type,
    });
  }

  model!: IManga;

  search: OperatorFunction<string, readonly any[]> = (
    text$: Observable<string>
  ) =>
    text$.pipe(
      debounceTime(200),
      map((term) =>
        term === ''
          ? []
          : this.mangaList
            .filter(
              (v) => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1
            )
            .slice(0, 10)
      )
    );

  formatter = (x: { name: string }) => x.name;
}
