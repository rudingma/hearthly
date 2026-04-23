import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../ui/page-container/page-container.component';
import { ButtonDirective } from '../../ui/button.directive';

@Component({
  selector: 'app-household-join-stub',
  standalone: true,
  imports: [RouterLink, PageContainerComponent, ButtonDirective],
  templateUrl: './join-stub.component.html',
  styleUrl: './join-stub.component.scss',
})
export class JoinStubComponent {}
