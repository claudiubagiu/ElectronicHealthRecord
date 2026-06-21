import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetKeysDialog } from './reset-keys-dialog';

describe('ResetKeysDialog', () => {
  let component: ResetKeysDialog;
  let fixture: ComponentFixture<ResetKeysDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetKeysDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetKeysDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
