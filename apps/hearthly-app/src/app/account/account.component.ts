import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  IonContent, IonList, IonItem, IonLabel, IonIcon, IonButton,
  IonBackButton, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, settingsOutline, helpCircleOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-account',
  imports: [
    IonContent, IonList, IonItem, IonLabel, IonIcon, IonButton,
    IonBackButton, IonHeader, IonToolbar, IonTitle, IonButtons,
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  private readonly authService = inject(AuthService);

  readonly userName = this.authService.displayName;
  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  readonly initials = this.authService.initials;
  readonly pictureUrl = this.authService.pictureUrl;
  readonly imageError = signal(false);

  constructor() {
    addIcons({ peopleOutline, settingsOutline, helpCircleOutline, logOutOutline });
    effect(() => {
      this.pictureUrl();
      this.imageError.set(false);
    });
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  signOut(): void {
    this.authService.logout();
  }
}
