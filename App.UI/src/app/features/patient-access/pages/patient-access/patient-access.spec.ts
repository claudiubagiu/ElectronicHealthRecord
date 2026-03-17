import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientAccess } from './patient-access';

describe('PatientAccess', () => {
  let component: PatientAccess;
  let fixture: ComponentFixture<PatientAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientAccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientAccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
