import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientLabAnalyses } from './patient-lab-analyses';

describe('PatientLabAnalyses', () => {
  let component: PatientLabAnalyses;
  let fixture: ComponentFixture<PatientLabAnalyses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientLabAnalyses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientLabAnalyses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
