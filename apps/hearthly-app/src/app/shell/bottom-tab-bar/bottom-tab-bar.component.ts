import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { LucideIconData } from 'lucide-angular';
import { LucideAngularModule, House } from 'lucide-angular';

interface Tab {
  readonly path: string;
  readonly icon: LucideIconData;
  readonly label: string;
}

@Component({
  selector: 'app-bottom-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './bottom-tab-bar.component.html',
  styleUrl: './bottom-tab-bar.component.scss',
})
export class BottomTabBarComponent {
  protected readonly tabs: readonly Tab[] = [
    { path: '/app/home', icon: House, label: 'Home' },
  ];
}
