import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessHistoryList } from './access-history-list';

describe('AccessHistoryList', () => {
  let component: AccessHistoryList;
  let fixture: ComponentFixture<AccessHistoryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessHistoryList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessHistoryList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
