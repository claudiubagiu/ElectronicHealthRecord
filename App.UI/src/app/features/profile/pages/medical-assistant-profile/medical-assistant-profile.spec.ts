import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalAssistantProfile } from './medical-assistant-profile';

describe('MedicalAssistantProfile', () => {
  let component: MedicalAssistantProfile;
  let fixture: ComponentFixture<MedicalAssistantProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalAssistantProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalAssistantProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
