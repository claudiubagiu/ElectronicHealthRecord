import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalRecordsPanelComponent } from './medical-records-panel';

describe('MedicalRecordsPanel', () => {
  let component: MedicalRecordsPanelComponent;
  let fixture: ComponentFixture<MedicalRecordsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalRecordsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalRecordsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
