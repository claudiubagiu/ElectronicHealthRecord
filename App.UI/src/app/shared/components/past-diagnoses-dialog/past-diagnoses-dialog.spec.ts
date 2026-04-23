import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastDiagnosesDialog } from './past-diagnoses-dialog';

describe('PastDiagnosesDialog', () => {
  let component: PastDiagnosesDialog;
  let fixture: ComponentFixture<PastDiagnosesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastDiagnosesDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastDiagnosesDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
