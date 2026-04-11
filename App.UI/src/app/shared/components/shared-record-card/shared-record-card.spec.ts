import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedRecordCard } from './shared-record-card';

describe('SharedRecordCard', () => {
  let component: SharedRecordCard;
  let fixture: ComponentFixture<SharedRecordCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedRecordCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedRecordCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
