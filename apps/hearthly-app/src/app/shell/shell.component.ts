import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
  IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonMenuToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, walletOutline, listOutline, calendarOutline, personOutline, settingsOutline } from 'ionicons/icons';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-shell',
  imports: [
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
    IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonMenuToggle,
    HeaderComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  constructor() {
    addIcons({ homeOutline, walletOutline, listOutline, calendarOutline, personOutline, settingsOutline });
  }
}
