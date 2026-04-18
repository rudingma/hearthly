import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);

  readonly initials = this.authService.initials;
  readonly pictureUrl = this.authService.pictureUrl;
  readonly imageError = signal(false);

  constructor() {
    addIcons({ notificationsOutline });
    effect(() => {
      this.pictureUrl();
      this.imageError.set(false);
    });
  }

  onImageError(): void {
    this.imageError.set(true);
  }
}
