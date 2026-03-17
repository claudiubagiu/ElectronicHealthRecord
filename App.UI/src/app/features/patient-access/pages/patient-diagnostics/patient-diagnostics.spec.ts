import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientDiagnostics } from './patient-diagnostics';

describe('PatientDiagnostics', () => {
  let component: PatientDiagnostics;
  let fixture: ComponentFixture<PatientDiagnostics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientDiagnostics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientDiagnostics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
