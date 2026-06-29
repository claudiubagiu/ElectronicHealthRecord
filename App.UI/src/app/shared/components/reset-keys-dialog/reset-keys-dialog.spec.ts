import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetKeysDialogComponent } from './reset-keys-dialog';

describe('ResetKeysDialog', () => {
  let component: ResetKeysDialogComponent;
  let fixture: ComponentFixture<ResetKeysDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetKeysDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetKeysDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
