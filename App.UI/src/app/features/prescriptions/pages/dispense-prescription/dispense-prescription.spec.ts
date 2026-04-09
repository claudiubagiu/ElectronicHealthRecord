import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispensePrescription } from './dispense-prescription';

describe('DispensePrescription', () => {
  let component: DispensePrescription;
  let fixture: ComponentFixture<DispensePrescription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispensePrescription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispensePrescription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
