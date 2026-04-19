import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  it('renders the image when pictureUrl is provided', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('pictureUrl', 'https://example.com/me.png');
    fixture.componentRef.setInput('initials', 'MR');
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('https://example.com/me.png');
  });

  it('falls back to initials when image errors', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('pictureUrl', 'bad');
    fixture.componentRef.setInput('initials', 'MR');
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('MR');
  });

  it('resets the image-error state when pictureUrl changes', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('pictureUrl', 'first');
    fixture.componentRef.setInput('initials', 'MR');
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('img') as HTMLImageElement
    ).dispatchEvent(new Event('error'));
    fixture.detectChanges();
    fixture.componentRef.setInput('pictureUrl', 'second');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
  });

  it('switches dimension based on size input', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('pictureUrl', 'u');
    fixture.componentRef.setInput('initials', 'X');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('64');
    expect(img.getAttribute('height')).toBe('64');
  });
});
