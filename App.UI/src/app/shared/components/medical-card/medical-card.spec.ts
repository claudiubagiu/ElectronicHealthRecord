import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalCard } from './medical-card';

describe('MedicalCard', () => {
  let component: MedicalCard;
  let fixture: ComponentFixture<MedicalCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
