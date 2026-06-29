import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastDiagnosesDialogComponent } from './past-diagnoses-dialog';

describe('PastDiagnosesDialog', () => {
  let component: PastDiagnosesDialogComponent;
  let fixture: ComponentFixture<PastDiagnosesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastDiagnosesDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PastDiagnosesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
