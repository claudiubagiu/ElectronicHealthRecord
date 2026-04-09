import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePrescription } from './create-prescription';

describe('CreatePrescription', () => {
  let component: CreatePrescription;
  let fixture: ComponentFixture<CreatePrescription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePrescription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePrescription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
