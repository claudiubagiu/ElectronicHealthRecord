import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetDiagnostics } from './get-diagnostics';

describe('GetDiagnostics', () => {
  let component: GetDiagnostics;
  let fixture: ComponentFixture<GetDiagnostics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetDiagnostics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetDiagnostics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
