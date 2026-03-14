import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetProposedDiagnostics } from './get-proposed-diagnostics';

describe('GetProposedDiagnostics', () => {
  let component: GetProposedDiagnostics;
  let fixture: ComponentFixture<GetProposedDiagnostics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetProposedDiagnostics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetProposedDiagnostics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
