
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
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
  currentTab = 'Dashboard';

  constructor(@Inject(DOCUMENT) private document: Document) {
    const localStorage = document.defaultView?.localStorage;
    if (localStorage) {
      this.currentTab = localStorage.getItem('currentPage') || 'Dashboard';
    }
  }

  toggle() {
    this.isShow = !this.isShow;
    // ng build --output-path docs --base-href /my-collection/
  }

  selectTab(tabName: string) {
    this.currentTab = tabName;
    localStorage.setItem('currentPage', tabName);
  }
}
