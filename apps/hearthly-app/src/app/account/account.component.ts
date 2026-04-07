import { Component, computed, inject } from '@angular/core';
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

  readonly userName = computed(() => this.authService.currentUser()?.name ?? '');
  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  readonly initials = this.authService.initials;

  constructor() {
    addIcons({ peopleOutline, settingsOutline, helpCircleOutline, logOutOutline });
  }

  signOut(): void {
    this.authService.logout();
  }
}
