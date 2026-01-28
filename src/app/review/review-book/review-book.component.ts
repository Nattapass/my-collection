import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-review-book',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-book.component.html',
  styleUrl: './review-book.component.scss'
})
export class ReviewBookComponent {}
