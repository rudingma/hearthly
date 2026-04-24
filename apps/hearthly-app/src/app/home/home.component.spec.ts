import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { AuthService } from '../auth/auth.service';
import { createMockAuthService } from '../auth/auth.service.test-helpers';

describe('HomeComponent', () => {
  let authMock: ReturnType<typeof createMockAuthService>;

  beforeEach(async () => {
    authMock = createMockAuthService({
      state: 'authenticated',
      user: {
        name: 'Matthias',
        email: 'dev@hearthly.dev',
        id: '1',
        picture: null,
      },
    });
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [{ provide: AuthService, useValue: authMock.service }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should say Good morning before noon', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['greeting']).toBe('Good morning');
  });

  it('should say Good afternoon between noon and 6pm', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['greeting']).toBe('Good afternoon');
  });

  it('should say Good evening after 6pm', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['greeting']).toBe('Good evening');
  });

  it('should display user name', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Matthias');
  });
});
