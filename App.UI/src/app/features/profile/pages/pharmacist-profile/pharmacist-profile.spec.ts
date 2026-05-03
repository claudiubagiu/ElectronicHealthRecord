import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PharmacistProfile } from './pharmacist-profile';

describe('PharmacistProfile', () => {
  let component: PharmacistProfile;
  let fixture: ComponentFixture<PharmacistProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PharmacistProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PharmacistProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
