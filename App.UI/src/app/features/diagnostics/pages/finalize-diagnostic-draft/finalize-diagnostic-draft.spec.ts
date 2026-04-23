import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalizeDiagnosticDraft } from './finalize-diagnostic-draft';

describe('FinalizeDiagnosticDraft', () => {
  let component: FinalizeDiagnosticDraft;
  let fixture: ComponentFixture<FinalizeDiagnosticDraft>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalizeDiagnosticDraft]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinalizeDiagnosticDraft);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
