import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDiagnostic } from './add-diagnostic';

describe('AddDiagnostic', () => {
  let component: AddDiagnostic;
  let fixture: ComponentFixture<AddDiagnostic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDiagnostic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddDiagnostic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
