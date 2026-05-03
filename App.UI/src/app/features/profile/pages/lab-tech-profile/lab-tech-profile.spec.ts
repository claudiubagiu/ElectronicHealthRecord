import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabTechProfile } from './lab-tech-profile';

describe('LabTechProfile', () => {
  let component: LabTechProfile;
  let fixture: ComponentFixture<LabTechProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabTechProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabTechProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
