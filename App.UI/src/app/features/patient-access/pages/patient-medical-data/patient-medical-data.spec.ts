import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMedicalData } from './patient-medical-data';

describe('PatientMedicalData', () => {
  let component: PatientMedicalData;
  let fixture: ComponentFixture<PatientMedicalData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMedicalData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientMedicalData);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
