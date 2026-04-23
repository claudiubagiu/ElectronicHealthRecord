import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssistantPatientProfile } from './assistant-patient-profile';

describe('AssistantPatientProfile', () => {
  let component: AssistantPatientProfile;
  let fixture: ComponentFixture<AssistantPatientProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantPatientProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssistantPatientProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
