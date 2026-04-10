import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomField {
  label: string;
  value: string;
}

export interface DiagnosticPdfData {
  // General
  title: string;
  consultationDate: string;
  patient: string;
  patientCNP: string;
  doctor: string;

  // Anamnesis
  chiefComplaint: string;
  personalHistory: string;
  familyHistory?: string;
  allergies?: string;

  // Clinical examination
  bloodPressure: string;
  pulse: string;
  temperature?: string;
  weightHeight?: string;
  clinicalNotes?: string;

  // Diagnosis & Treatment
  primaryDiagnosis: string;
  icdCode?: string;
  secondaryDiagnosis?: string;
  recommendedInvestigations?: string;
  treatment: string;
  generalRecommendations?: string;
  followUpDate?: string;
  finalNotes?: string;

  // Custom fields per section
  customGeneralInfo?: CustomField[];
  customAnamnesis?: CustomField[];
  customClinicalExam?: CustomField[];
  customDiagnosis?: CustomField[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_W = 210; // A4 mm width
const PAGE_H = 297; // A4 mm height
const MARGIN_L = 18;
const MARGIN_R = 18;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const LINE_H = 5.5; // base line height
const SECTION_GAP = 6; // space before a new section header
const LABEL_W = 52; // fixed width for inline labels

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DiagnosticPdfService {
  async generateDiagnosticPdf(data: DiagnosticPdfData): Promise<Blob> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const ctx = new RenderContext(doc);

    this.renderHeader(ctx, data);
    this.renderPatientInfo(ctx, data);
    this.renderSection(ctx, 'ANAMNESIS', () => this.renderAnamnesis(ctx, data));
    this.renderSection(ctx, 'CLINICAL EXAMINATION', () => this.renderClinicalExam(ctx, data));
    this.renderSection(ctx, 'DIAGNOSIS & TREATMENT', () =>
      this.renderDiagnosisTreatment(ctx, data)
    );
    this.renderFooter(ctx, data);

    return doc.output('blob');
  }

  // ── Header ──────────────────────────────────────────────────────────────────

  private renderHeader(ctx: RenderContext, data: DiagnosticPdfData): void {
    const doc = ctx.doc;

    // Top rule
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_L, 14, PAGE_W - MARGIN_R, 14);

    // Document type label — small caps feel
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('MEDICAL CONSULTATION REPORT', MARGIN_L, 11);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text(data.title.toUpperCase(), MARGIN_L, 24);

    // Thin rule under title
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, 27, PAGE_W - MARGIN_R, 27);

    // Date & doctor — right-aligned block
    const dateLabel = this.formatDate(data.consultationDate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`Date: ${dateLabel}`, PAGE_W - MARGIN_R, 18, { align: 'right' });
    doc.text(`Doctor: ${data.doctor}`, PAGE_W - MARGIN_R, 23, { align: 'right' });

    ctx.y = 33;
  }

  // ── Patient info block ───────────────────────────────────────────────────────

  private renderPatientInfo(ctx: RenderContext, data: DiagnosticPdfData): void {
    const doc = ctx.doc;

    // Light grey background band
    doc.setFillColor(245, 245, 245);
    doc.rect(MARGIN_L, ctx.y, CONTENT_W, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('PATIENT', MARGIN_L + 4, ctx.y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(data.patient, MARGIN_L + 4, ctx.y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`CNP: ${data.patientCNP}`, MARGIN_L + 4, ctx.y + 16);

    // Custom general info fields
    if (data.customGeneralInfo?.length) {
      const extras = data.customGeneralInfo.map((f) => `${f.label}: ${f.value}`).join('   ·   ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(extras, PAGE_W - MARGIN_R - 4, ctx.y + 16, { align: 'right' });
    }

    ctx.y += 23;
  }

  // ── Generic section wrapper ──────────────────────────────────────────────────

  private renderSection(ctx: RenderContext, title: string, content: () => void): void {
    ctx.ensureSpace(20);

    // Section header rule + label
    ctx.doc.setDrawColor(30, 30, 30);
    ctx.doc.setLineWidth(0.5);
    ctx.doc.line(MARGIN_L, ctx.y, PAGE_W - MARGIN_R, ctx.y);

    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(30, 30, 30);
    ctx.y += 4.5;
    ctx.doc.text(title, MARGIN_L, ctx.y);
    ctx.y += 5;

    content();
  }

  // ── Anamnesis ────────────────────────────────────────────────────────────────

  private renderAnamnesis(ctx: RenderContext, data: DiagnosticPdfData): void {
    this.field(ctx, 'Chief Complaint', data.chiefComplaint);
    this.field(ctx, 'Personal History', data.personalHistory);
    if (data.familyHistory) this.field(ctx, 'Family History', data.familyHistory);
    if (data.allergies) this.field(ctx, 'Allergies', data.allergies);
    this.renderCustomFields(ctx, data.customAnamnesis);
    ctx.y += 2;
  }

  // ── Clinical Examination ─────────────────────────────────────────────────────

  private renderClinicalExam(ctx: RenderContext, data: DiagnosticPdfData): void {
    // Vital signs inline row
    const vitals: string[] = [
      `BP: ${data.bloodPressure}`,
      `Pulse: ${data.pulse}`,
      ...(data.temperature ? [`Temp: ${data.temperature}`] : []),
      ...(data.weightHeight ? [`W/H: ${data.weightHeight}`] : []),
    ];
    this.inlineRow(ctx, vitals);

    if (data.clinicalNotes) this.field(ctx, 'Notes', data.clinicalNotes);
    this.renderCustomFields(ctx, data.customClinicalExam);
    ctx.y += 2;
  }

  // ── Diagnosis & Treatment ────────────────────────────────────────────────────

  private renderDiagnosisTreatment(ctx: RenderContext, data: DiagnosticPdfData): void {
    this.field(
      ctx,
      'Primary Diagnosis',
      data.primaryDiagnosis + (data.icdCode ? `  [${data.icdCode}]` : '')
    );

    if (data.secondaryDiagnosis) this.field(ctx, 'Secondary Diagnosis', data.secondaryDiagnosis);
    if (data.recommendedInvestigations)
      this.field(ctx, 'Investigations', data.recommendedInvestigations);

    this.field(ctx, 'Treatment', data.treatment);

    if (data.generalRecommendations)
      this.field(ctx, 'Recommendations', data.generalRecommendations);
    if (data.followUpDate) this.field(ctx, 'Follow-up', this.formatDate(data.followUpDate));
    if (data.finalNotes) this.field(ctx, 'Notes', data.finalNotes);
    this.renderCustomFields(ctx, data.customDiagnosis);
    ctx.y += 2;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────

  private renderFooter(ctx: RenderContext, data: DiagnosticPdfData): void {
    const doc = ctx.doc;
    const pageCount = (doc as any).internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_L, PAGE_H - 14, PAGE_W - MARGIN_R, PAGE_H - 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);

      // Left: doctor
      doc.text(`Doctor: ${data.doctor}`, MARGIN_L, PAGE_H - 10);

      // Center: page number
      doc.text(`Page ${i} of ${pageCount}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });

      // Right: confidential notice
      doc.text('Confidential medical document', PAGE_W - MARGIN_R, PAGE_H - 10, { align: 'right' });

      // Signature line on last page
      if (i === pageCount) {
        const sigY = PAGE_H - 22;
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.3);
        doc.line(PAGE_W - MARGIN_R - 44, sigY, PAGE_W - MARGIN_R, sigY);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text("Doctor's signature", PAGE_W - MARGIN_R - 22, sigY + 3.5, { align: 'center' });
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Renders a label + multiline value pair.
   */
  private field(ctx: RenderContext, label: string, value: string): void {
    const doc = ctx.doc;
    const valueX = MARGIN_L + LABEL_W;
    const valueW = CONTENT_W - LABEL_W;

    // Wrap value text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(value, valueW);
    const blockH = lines.length * LINE_H + 2;

    ctx.ensureSpace(blockH + 2);

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(label, MARGIN_L, ctx.y + LINE_H - 1);

    // Value
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(lines, valueX, ctx.y + LINE_H - 1);

    // Subtle separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_L, ctx.y + blockH + 0.5, PAGE_W - MARGIN_R, ctx.y + blockH + 0.5);

    ctx.y += blockH + 2.5;
  }

  /**
   * Renders compact vital-sign pills in a single row.
   */
  private inlineRow(ctx: RenderContext, items: string[]): void {
    const doc = ctx.doc;
    ctx.ensureSpace(10);

    let x = MARGIN_L;
    items.forEach((item) => {
      const parts = item.split(': ');
      const lbl = parts[0] + ': ';
      const val = parts.slice(1).join(': ');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const lblW = doc.getTextWidth(lbl);
      doc.text(lbl, x, ctx.y + LINE_H - 1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      const valW = doc.getTextWidth(val);
      doc.text(val, x + lblW, ctx.y + LINE_H - 1);

      x += lblW + valW + 10;
    });

    ctx.y += LINE_H + 3;
  }

  /**
   * Renders an array of custom fields.
   */
  private renderCustomFields(ctx: RenderContext, fields?: CustomField[]): void {
    if (!fields?.length) return;
    fields.forEach((f) => this.field(ctx, f.label, f.value));
  }

  /**
   * Formats a YYYY-MM-DD date string to a readable format.
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}

// ─── Render Context ───────────────────────────────────────────────────────────

/**
 * Tracks the current Y cursor and handles automatic page breaks.
 */
class RenderContext {
  y = 0;

  constructor(public doc: jsPDF) {}

  /**
   * Ensures there is enough vertical space remaining on the page.
   * If not, a new page is added and the cursor is reset.
   */
  ensureSpace(neededMm: number): void {
    if (this.y + neededMm > PAGE_H - 22) {
      this.doc.addPage();
      this.y = 18;
    }
  }
}
