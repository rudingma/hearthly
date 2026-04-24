import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, House } from 'lucide-angular';
import { PageContainerComponent } from '../../ui/page-container/page-container.component';
import { ButtonDirective } from '../../ui/button.directive';

@Component({
  selector: 'app-household-start',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    PageContainerComponent,
    ButtonDirective,
  ],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss',
})
export class StartComponent {
  protected readonly HouseIcon = House;
}
