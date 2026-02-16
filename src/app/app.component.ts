
import { CommonModule } from '@angular/common';
import { Component, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
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
  shippingOptions = signal(['Dashboard', 'Manga', 'Models', 'Review']);
  selectedOption = linkedSignal(() => this.shippingOptions()[0]);
  currentTab = 'Dashboard';

  constructor(private router: Router, public authService: AuthService) {}

  toggle() {
    this.isShow = !this.isShow;
    // ng build --output-path docs --base-href /my-collection/
  }

  selectTab(tabName: string) {
    this.selectedOption.set(tabName || '')
    this.currentTab = tabName;
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
