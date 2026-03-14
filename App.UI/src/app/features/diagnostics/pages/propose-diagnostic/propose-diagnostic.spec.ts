import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProposeDiagnostic } from './propose-diagnostic';

describe('ProposeDiagnostic', () => {
  let component: ProposeDiagnostic;
  let fixture: ComponentFixture<ProposeDiagnostic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProposeDiagnostic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProposeDiagnostic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
