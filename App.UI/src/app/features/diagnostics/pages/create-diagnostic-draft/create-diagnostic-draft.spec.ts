import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDiagnosticDraft } from './create-diagnostic-draft';

describe('CreateDiagnosticDraft', () => {
  let component: CreateDiagnosticDraft;
  let fixture: ComponentFixture<CreateDiagnosticDraft>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateDiagnosticDraft]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDiagnosticDraft);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
