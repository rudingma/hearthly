import { Component, computed, inject } from '@angular/core';
import {
  IonContent, IonList, IonItem, IonLabel, IonIcon, IonButton,
  IonBackButton, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, settingsOutline, helpCircleOutline, logOutOutline, chevronForward } from 'ionicons/icons';
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

  readonly userName = computed(() => this.authService.currentUser()?.name ?? '');
  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  readonly initials = computed(() => {
    const name = this.authService.currentUser()?.name;
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  constructor() {
    addIcons({ peopleOutline, settingsOutline, helpCircleOutline, logOutOutline, chevronForward });
  }

  signOut(): void {
    this.authService.logout();
  }
}
