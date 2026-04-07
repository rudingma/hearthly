import { Component, computed, inject } from '@angular/core';
import { IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly authService = inject(AuthService);

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  readonly userName = computed(() => this.authService.currentUser()?.name ?? '');
}
