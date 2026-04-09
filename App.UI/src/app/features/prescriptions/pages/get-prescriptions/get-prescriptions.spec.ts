import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetPrescriptions } from './get-prescriptions';

describe('GetPrescriptions', () => {
  let component: GetPrescriptions;
  let fixture: ComponentFixture<GetPrescriptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetPrescriptions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetPrescriptions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
