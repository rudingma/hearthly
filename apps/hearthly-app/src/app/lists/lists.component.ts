import { Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lists',
  imports: [IonContent, IonIcon],
  template: `
    <ion-content class="ion-padding">
      <div class="placeholder-page">
        <ion-icon name="list-outline" size="large"></ion-icon>
        <h2>Lists</h2>
        <p>Coming soon</p>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .placeholder-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
        color: var(--hearthly-text-muted);
      }
      h2 {
        margin: 16px 0 8px;
        color: var(--ion-text-color);
      }
    `,
  ],
})
export class ListsComponent {
  constructor() {
    addIcons({ listOutline });
  }
}
