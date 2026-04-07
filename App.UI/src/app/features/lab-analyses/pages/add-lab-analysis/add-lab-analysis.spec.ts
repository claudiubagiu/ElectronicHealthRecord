import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLabAnalysis } from './add-lab-analysis';

describe('AddLabAnalysis', () => {
  let component: AddLabAnalysis;
  let fixture: ComponentFixture<AddLabAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLabAnalysis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLabAnalysis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
