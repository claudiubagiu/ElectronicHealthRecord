import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetLabAnalyses } from './get-lab-analyses';

describe('GetLabAnalyses', () => {
  let component: GetLabAnalyses;
  let fixture: ComponentFixture<GetLabAnalyses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetLabAnalyses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetLabAnalyses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
