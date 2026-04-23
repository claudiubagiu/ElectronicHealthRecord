import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalRecordsPanel } from './medical-records-panel';

describe('MedicalRecordsPanel', () => {
  let component: MedicalRecordsPanel;
  let fixture: ComponentFixture<MedicalRecordsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalRecordsPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalRecordsPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
