import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetMedicalData } from './get-medical-data';

describe('GetMedicalData', () => {
  let component: GetMedicalData;
  let fixture: ComponentFixture<GetMedicalData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetMedicalData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetMedicalData);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
