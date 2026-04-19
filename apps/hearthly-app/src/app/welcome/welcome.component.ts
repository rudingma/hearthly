import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { ButtonDirective } from '../ui/button.directive';
import { PageContainerComponent } from '../ui/page-container/page-container.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [ButtonDirective, PageContainerComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPasswordAuth = environment.enablePasswordAuth;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/app/home']);
    }
  }

  signInWithGoogle(): void {
    this.authService.login('google');
  }

  signIn(): void {
    this.authService.login();
  }
}
