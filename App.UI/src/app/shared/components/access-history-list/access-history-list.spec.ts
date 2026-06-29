import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessHistoryListComponent } from './access-history-list';

describe('AccessHistoryList', () => {
  let component: AccessHistoryListComponent;
  let fixture: ComponentFixture<AccessHistoryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessHistoryListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessHistoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
