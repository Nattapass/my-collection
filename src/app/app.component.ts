
import { CommonModule } from '@angular/common';
import { Component, Inject, linkedSignal, signal, DOCUMENT } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'my-collection';
  data: any;
  isShow = false;
  shippingOptions = signal(['Dashboard', 'Books', 'Books']);
  selectedOption = linkedSignal(() => this.shippingOptions()[0]);
  currentTab = 'Dashboard';

  constructor(@Inject(DOCUMENT) private document: Document) {
    // localStorage
    const localStorage = document.defaultView?.localStorage;
    if (localStorage && localStorage.getItem('currentPage')) {
      this.selectedOption.set(localStorage.getItem('currentPage') || '')
      this.currentTab = localStorage.getItem('currentPage') || 'Dashboard';
    }
  }

  toggle() {
    this.isShow = !this.isShow;
    // ng build --output-path docs --base-href /my-collection/
  }

  selectTab(tabName: string) {
    this.selectedOption.set(tabName || '')
    this.currentTab = tabName;
    localStorage.setItem('currentPage', tabName);
  }
}
