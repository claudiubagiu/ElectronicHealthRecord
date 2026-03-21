import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMedications } from './patient-medications';

describe('PatientMedications', () => {
  let component: PatientMedications;
  let fixture: ComponentFixture<PatientMedications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMedications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientMedications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
