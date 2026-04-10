import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewAllCard } from './view-all-card';

describe('ViewAllCard', () => {
  let component: ViewAllCard;
  let fixture: ComponentFixture<ViewAllCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewAllCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewAllCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
