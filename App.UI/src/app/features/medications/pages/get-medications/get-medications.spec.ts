import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetMedications } from './get-medications';

describe('GetMedications', () => {
  let component: GetMedications;
  let fixture: ComponentFixture<GetMedications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetMedications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetMedications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
