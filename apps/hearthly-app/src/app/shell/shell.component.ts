import { Component } from '@angular/core';
import { RouterLinkActive } from '@angular/router';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonMenuToggle,
  IonRouterLink,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  walletOutline,
  listOutline,
  calendarOutline,
  personOutline,
} from 'ionicons/icons';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-shell',
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonMenuToggle,
    IonRouterLink,
    RouterLinkActive,
    HeaderComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  constructor() {
    addIcons({
      homeOutline,
      walletOutline,
      listOutline,
      calendarOutline,
      personOutline,
    });
  }
}
