import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientPrescriptions } from './patient-prescriptions';

describe('PatientPrescriptions', () => {
  let component: PatientPrescriptions;
  let fixture: ComponentFixture<PatientPrescriptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientPrescriptions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientPrescriptions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
