import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMedicalData } from './add-medical-data';

describe('AddMedicalData', () => {
  let component: AddMedicalData;
  let fixture: ComponentFixture<AddMedicalData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMedicalData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMedicalData);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
