import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface CustomField {
  label: string;
  value: string;
}

export interface DiagnosticPdfData {
  title: string;
  consultationDate: string;
  patient: string;
  patientCNP: string;
  doctor: string;

  chiefComplaint: string;
  personalHistory: string;
  familyHistory?: string;
  allergies?: string;

  bloodPressure: string;
  pulse: string;
  temperature?: string;
  weightHeight?: string;
  clinicalNotes?: string;

  primaryDiagnosis: string;
  icdCode?: string;
  secondaryDiagnosis?: string;
  recommendedInvestigations?: string;
  treatment: string;
  generalRecommendations?: string;
  followUpDate?: string;
  finalNotes?: string;

  customGeneralInfo: CustomField[];
  customAnamnesis: CustomField[];
  customClinicalExam: CustomField[];
  customDiagnosis: CustomField[];
}

@Injectable({ providedIn: 'root' })
export class DiagnosticPdfService {
  // ── Page geometry ───────────────────────────────────────────────────
  private readonly PW = 210;
  private readonly PH = 297;
  private readonly ML = 18;
  private readonly MR = 18;
  private readonly MT = 18;
  private readonly MB = 22;
  private readonly CW = 210 - 18 - 18;

  // ── Palette ─────────────────────────────────────────────────────────
  private readonly C = {
    navy: [17, 35, 90] as [number, number, number],
    blue: [37, 99, 206] as [number, number, number],
    blueMid: [66, 133, 244] as [number, number, number],
    blueLight: [225, 237, 255] as [number, number, number],
    bluePale: [241, 246, 255] as [number, number, number],
    accent: [0, 180, 140] as [number, number, number],
    accentBg: [230, 252, 246] as [number, number, number],
    text: [30, 30, 40] as [number, number, number],
    textMid: [80, 85, 100] as [number, number, number],
    textLight: [130, 135, 150] as [number, number, number],
    border: [210, 218, 235] as [number, number, number],
    row: [247, 250, 255] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    red: [220, 50, 50] as [number, number, number],
  };

  // track current y
  private y = 0;

  async generateDiagnosticPdf(data: DiagnosticPdfData): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.y = this.MT;

    // ── Decorative sidebar stripe ───────────────────────────────────
    this.drawSideStripe(doc);

    // ── Header ──────────────────────────────────────────────────────
    this.drawHeader(doc, data);

    // ── Patient card ────────────────────────────────────────────────
    this.drawPatientCard(doc, data);

    // ── 1. General Information ──────────────────────────────────────
    this.drawSectionHeading(doc, '01', 'General Information');
    this.drawTableRow(doc, 'Diagnosis Title', data.title, false);
    this.drawTableRow(doc, 'Consultation Date', this.fmtDate(data.consultationDate), true);
    this.drawTableRow(doc, 'Attending Doctor', data.doctor, false);
    this.drawCustomRows(doc, data.customGeneralInfo, 1);
    this.y += 4;

    // ── 2. Anamnesis ────────────────────────────────────────────────
    this.ensureSpace(doc, 28);
    this.drawSectionHeading(doc, '02', 'Anamnesis');
    this.drawTableRow(doc, 'Chief Complaint', data.chiefComplaint, false);
    this.drawTableRow(doc, 'Personal Medical History', data.personalHistory, true);
    if (data.familyHistory) this.drawTableRow(doc, 'Family History', data.familyHistory, false);
    if (data.allergies) this.drawAllergyRow(doc, data.allergies);
    this.drawCustomRows(
      doc,
      data.customAnamnesis,
      (data.familyHistory ? 2 : 1) + (data.allergies ? 1 : 0)
    );
    this.y += 4;

    // ── 3. Clinical Examination ─────────────────────────────────────
    this.ensureSpace(doc, 28);
    this.drawSectionHeading(doc, '03', 'Clinical Examination');
    this.drawVitalsGrid(doc, data);
    if (data.clinicalNotes) this.drawTableRow(doc, 'Clinical Notes', data.clinicalNotes, false);
    this.drawCustomRows(doc, data.customClinicalExam, data.clinicalNotes ? 1 : 0);
    this.y += 4;

    // ── 4. Diagnosis & Treatment ────────────────────────────────────
    this.ensureSpace(doc, 28);
    this.drawSectionHeading(doc, '04', 'Diagnosis & Treatment');
    this.drawDiagnosisHighlight(doc, data);
    this.drawTableRow(doc, 'Prescribed Treatment', data.treatment, false);
    if (data.recommendedInvestigations)
      this.drawTableRow(doc, 'Recommended Investigations', data.recommendedInvestigations, true);
    if (data.generalRecommendations)
      this.drawTableRow(doc, 'General Recommendations', data.generalRecommendations, false);
    if (data.followUpDate)
      this.drawTableRow(doc, 'Follow-up Date', this.fmtDate(data.followUpDate), true);
    if (data.finalNotes) this.drawTableRow(doc, 'Final Notes', data.finalNotes, false);
    this.drawCustomRows(doc, data.customDiagnosis, 2);
    this.y += 6;

    // ── Signature area ──────────────────────────────────────────────
    this.ensureSpace(doc, 35);
    this.drawSignatureArea(doc, data);

    // ── Footer on every page ────────────────────────────────────────
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      if (i > 1) this.drawSideStripe(doc);
      this.drawFooter(doc, i, total);
    }

    return doc.output('blob');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HEADER
  // ═══════════════════════════════════════════════════════════════════

  private drawSideStripe(doc: jsPDF): void {
    // Thin accent stripe on the left
    doc.setFillColor(...this.C.blue);
    doc.rect(0, 0, 5, this.PH, 'F');

    // Darker overlay at top
    doc.setFillColor(...this.C.navy);
    doc.rect(0, 0, 5, 60, 'F');
  }

  private drawHeader(doc: jsPDF, data: DiagnosticPdfData): void {
    const headerH = 32;
    const startX = 9;

    // Background
    doc.setFillColor(...this.C.navy);
    doc.roundedRect(startX, this.y, this.PW - startX - this.MR, headerH, 3, 3, 'F');

    // Medical cross icon
    const iconX = startX + 8;
    const iconY = this.y + headerH / 2;
    doc.setFillColor(...this.C.accent);
    doc.roundedRect(iconX - 4.5, iconY - 4.5, 9, 9, 1.5, 1.5, 'F');
    doc.setFillColor(...this.C.white);
    doc.rect(iconX - 0.8, iconY - 3, 1.6, 6, 'F');
    doc.rect(iconX - 3, iconY - 0.8, 6, 1.6, 'F');

    // Title
    doc.setTextColor(...this.C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MEDICAL DIAGNOSTIC REPORT', startX + 22, this.y + 13);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 255);
    doc.text(data.title.toUpperCase(), startX + 22, this.y + 20);

    // Confidential badge
    doc.setFillColor(...this.C.accent);
    const badgeW = 28;
    const badgeX = this.PW - this.MR - badgeW - 5;
    doc.roundedRect(badgeX, this.y + 5, badgeW, 6, 1, 1, 'F');
    doc.setTextColor(...this.C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('CONFIDENTIAL', badgeX + badgeW / 2, this.y + 9.2, { align: 'center' });

    // Date
    doc.setTextColor(160, 180, 230);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(this.fmtDate(data.consultationDate), this.PW - this.MR - 5, this.y + 26, {
      align: 'right',
    });

    this.y += headerH + 7;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PATIENT CARD
  // ═══════════════════════════════════════════════════════════════════

  private drawPatientCard(doc: jsPDF, data: DiagnosticPdfData): void {
    const cardH = 20;
    const startX = 9;
    const cardW = this.PW - startX - this.MR;

    // Card background
    doc.setFillColor(...this.C.blueLight);
    doc.roundedRect(startX, this.y, cardW, cardH, 2.5, 2.5, 'F');

    // Left accent bar
    doc.setFillColor(...this.C.blue);
    doc.roundedRect(startX, this.y, 3, cardH, 1.5, 1.5, 'F');

    // Person icon circle
    const circX = startX + 14;
    const circY = this.y + cardH / 2;
    doc.setFillColor(...this.C.blue);
    doc.circle(circX, circY, 5, 'F');
    // Simple person silhouette
    doc.setFillColor(...this.C.white);
    doc.circle(circX, circY - 1.5, 1.6, 'F');
    doc.ellipse(circX, circY + 2.5, 2.8, 1.8, 'F');

    // Patient name
    doc.setTextColor(...this.C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(data.patient, startX + 24, this.y + 8.5);

    // CNP
    doc.setTextColor(...this.C.textMid);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`CNP: ${data.patientCNP}`, startX + 24, this.y + 14.5);

    // Doctor on right
    doc.setTextColor(...this.C.blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ATTENDING DOCTOR', startX + cardW - 8, this.y + 7.5, { align: 'right' });
    doc.setTextColor(...this.C.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(data.doctor, startX + cardW - 8, this.y + 13.5, { align: 'right' });

    this.y += cardH + 8;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SECTION HEADING
  // ═══════════════════════════════════════════════════════════════════

  private drawSectionHeading(doc: jsPDF, num: string, title: string): void {
    const startX = 9;

    // Number circle
    doc.setFillColor(...this.C.blue);
    doc.circle(startX + 5, this.y + 4, 4.5, 'F');
    doc.setTextColor(...this.C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(num, startX + 5, this.y + 5.3, { align: 'center' });

    // Title
    doc.setTextColor(...this.C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(title.toUpperCase(), startX + 14, this.y + 5.5);

    // Underline
    doc.setDrawColor(...this.C.blue);
    doc.setLineWidth(0.6);
    doc.line(
      startX + 14,
      this.y + 8,
      startX + 14 + doc.getTextWidth(title.toUpperCase()) + 2,
      this.y + 8
    );

    this.y += 14;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TABLE ROWS
  // ═══════════════════════════════════════════════════════════════════

  private drawTableRow(doc: jsPDF, label: string, value: string, alternate: boolean): void {
    const startX = 9;
    const rowW = this.PW - startX - this.MR;
    const labelW = 52;
    const valueW = rowW - labelW;
    const padding = 3.5;

    // Wrap value text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(value, valueW - padding * 2);
    const lineH = 4.2;
    const rowH = Math.max(9, lines.length * lineH + padding * 2);

    this.ensureSpace(doc, rowH);

    // Row background
    if (alternate) {
      doc.setFillColor(...this.C.row);
      doc.rect(startX, this.y, rowW, rowH, 'F');
    }

    // Label column background
    doc.setFillColor(...this.C.bluePale);
    doc.rect(startX, this.y, labelW, rowH, 'F');

    // Borders
    doc.setDrawColor(...this.C.border);
    doc.setLineWidth(0.15);
    doc.rect(startX, this.y, rowW, rowH, 'S');
    doc.line(startX + labelW, this.y, startX + labelW, this.y + rowH);

    // Label text
    doc.setTextColor(...this.C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const labelLines = doc.splitTextToSize(label, labelW - padding * 2);
    const labelStartY = this.y + (rowH - labelLines.length * 4) / 2 + 3;
    labelLines.forEach((line: string, i: number) => {
      doc.text(line, startX + padding, labelStartY + i * 4);
    });

    // Value text
    doc.setTextColor(...this.C.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const valueStartY = this.y + (rowH - lines.length * lineH) / 2 + 3;
    lines.forEach((line: string, i: number) => {
      doc.text(line, startX + labelW + padding, valueStartY + i * lineH);
    });

    this.y += rowH;
  }

  private drawAllergyRow(doc: jsPDF, allergies: string): void {
    const startX = 9;
    const rowW = this.PW - startX - this.MR;
    const labelW = 52;
    const padding = 3.5;
    const rowH = 10;

    this.ensureSpace(doc, rowH);

    // Light red background for allergies
    doc.setFillColor(255, 240, 240);
    doc.rect(startX, this.y, rowW, rowH, 'F');

    // Label
    doc.setFillColor(255, 225, 225);
    doc.rect(startX, this.y, labelW, rowH, 'F');

    doc.setDrawColor(...this.C.border);
    doc.setLineWidth(0.15);
    doc.rect(startX, this.y, rowW, rowH, 'S');
    doc.line(startX + labelW, this.y, startX + labelW, this.y + rowH);

    // Warning icon (triangle)
    doc.setFillColor(...this.C.red);
    const triX = startX + padding;
    const triY = this.y + rowH / 2;
    doc.triangle(triX + 1.5, triY - 2, triX, triY + 1.5, triX + 3, triY + 1.5, 'F');
    doc.setFillColor(...this.C.white);
    doc.rect(triX + 1.2, triY - 0.8, 0.6, 1.2, 'F');
    doc.circle(triX + 1.5, triY + 0.9, 0.3, 'F');

    doc.setTextColor(...this.C.red);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Known Allergies', startX + padding + 5, this.y + rowH / 2 + 1);

    // Value
    doc.setTextColor(180, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(allergies, startX + labelW + padding, this.y + rowH / 2 + 1);

    this.y += rowH;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  VITALS GRID
  // ═══════════════════════════════════════════════════════════════════

  private drawVitalsGrid(doc: jsPDF, data: DiagnosticPdfData): void {
    const startX = 9;
    const gridW = this.PW - startX - this.MR;

    const vitals: { label: string; value: string; icon: string }[] = [
      { label: 'Blood Pressure', value: data.bloodPressure, icon: 'BP' },
      { label: 'Pulse', value: data.pulse, icon: 'HR' },
    ];
    if (data.temperature)
      vitals.push({ label: 'Temperature', value: data.temperature, icon: 'T\u00B0' });
    if (data.weightHeight)
      vitals.push({ label: 'Weight / Height', value: data.weightHeight, icon: 'BM' });

    const cols = vitals.length;
    const cellW = gridW / cols;
    const cellH = 22;

    this.ensureSpace(doc, cellH + 4);

    vitals.forEach((v, i) => {
      const x = startX + i * cellW;

      // Cell background
      doc.setFillColor(...this.C.accentBg);
      doc.roundedRect(x + 1, this.y, cellW - 2, cellH, 2, 2, 'F');

      // Border
      doc.setDrawColor(...this.C.accent);
      doc.setLineWidth(0.3);
      doc.roundedRect(x + 1, this.y, cellW - 2, cellH, 2, 2, 'S');

      // Icon badge
      doc.setFillColor(...this.C.accent);
      doc.roundedRect(x + 4, this.y + 3, 9, 5, 1, 1, 'F');
      doc.setTextColor(...this.C.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(v.icon, x + 8.5, this.y + 6.5, { align: 'center' });

      // Label
      doc.setTextColor(...this.C.textMid);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(v.label, x + 15, this.y + 7);

      // Value
      doc.setTextColor(...this.C.navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(v.value, x + cellW / 2, this.y + 17.5, { align: 'center' });
    });

    this.y += cellH + 5;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DIAGNOSIS HIGHLIGHT
  // ═══════════════════════════════════════════════════════════════════

  private drawDiagnosisHighlight(doc: jsPDF, data: DiagnosticPdfData): void {
    const startX = 9;
    const boxW = this.PW - startX - this.MR;
    const padding = 5;

    // Measure height needed
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const diagLines = doc.splitTextToSize(data.primaryDiagnosis, boxW - padding * 2 - 10);
    let boxH = 14 + diagLines.length * 5;

    if (data.icdCode) boxH += 7;
    if (data.secondaryDiagnosis) boxH += 7;

    this.ensureSpace(doc, boxH + 4);

    // Box
    doc.setFillColor(...this.C.blueLight);
    doc.roundedRect(startX, this.y, boxW, boxH, 3, 3, 'F');

    // Left accent
    doc.setFillColor(...this.C.blue);
    doc.roundedRect(startX, this.y, 4, boxH, 2, 2, 'F');
    doc.rect(startX + 2, this.y, 2, boxH, 'F');

    let innerY = this.y + 6;

    // "Primary Diagnosis" label
    doc.setTextColor(...this.C.blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('PRIMARY DIAGNOSIS', startX + padding + 5, innerY);
    innerY += 5;

    // Diagnosis text
    doc.setTextColor(...this.C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    diagLines.forEach((line: string, i: number) => {
      doc.text(line, startX + padding + 5, innerY + i * 5);
    });
    innerY += diagLines.length * 5 + 2;

    // ICD code badge
    if (data.icdCode) {
      doc.setFillColor(...this.C.blue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      const icdText = `ICD-10: ${data.icdCode}`;
      const icdW = Math.max(doc.getTextWidth(icdText) + 8, 22);
      doc.roundedRect(startX + padding + 5, innerY - 3.5, icdW, 6, 1, 1, 'F');
      doc.setTextColor(...this.C.white);
      doc.text(icdText, startX + padding + 8, innerY);
      innerY += 7;
    }

    // Secondary diagnosis
    if (data.secondaryDiagnosis) {
      doc.setTextColor(...this.C.textMid);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text(`Secondary: ${data.secondaryDiagnosis}`, startX + padding + 5, innerY);
    }

    this.y += boxH + 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SIGNATURE AREA
  // ═══════════════════════════════════════════════════════════════════

  private drawSignatureArea(doc: jsPDF, data: DiagnosticPdfData): void {
    const startX = 9;
    const boxW = this.PW - startX - this.MR;

    // Thin separator
    doc.setDrawColor(...this.C.border);
    doc.setLineWidth(0.2);
    doc.line(startX, this.y, startX + boxW, this.y);
    this.y += 8;

    // Signature line on the right
    const sigX = startX + boxW - 70;
    doc.setDrawColor(...this.C.navy);
    doc.setLineWidth(0.4);
    doc.line(sigX, this.y + 12, sigX + 60, this.y + 12);

    doc.setTextColor(...this.C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(data.doctor, sigX + 30, this.y + 18, { align: 'center' });

    doc.setTextColor(...this.C.textMid);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Attending Physician', sigX + 30, this.y + 22, { align: 'center' });
    doc.text(`Date: ${this.fmtDate(data.consultationDate)}`, sigX + 30, this.y + 26, {
      align: 'center',
    });

    // Stamp placeholder on left
    doc.setDrawColor(...this.C.border);
    doc.setLineWidth(0.3);
    const stampX = startX + 15;
    const stampY = this.y;
    doc.roundedRect(stampX, stampY, 30, 26, 2, 2, 'S');
    doc.setTextColor(...this.C.textLight);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Medical', stampX + 15, stampY + 11, { align: 'center' });
    doc.text('Stamp', stampX + 15, stampY + 15, { align: 'center' });

    this.y += 30;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CUSTOM FIELDS
  // ═══════════════════════════════════════════════════════════════════

  private drawCustomRows(doc: jsPDF, fields: CustomField[], startIdx: number): void {
    if (!fields || fields.length === 0) return;
    fields.forEach((f, i) => {
      this.drawTableRow(doc, f.label, f.value, (startIdx + i) % 2 === 1);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FOOTER
  // ═══════════════════════════════════════════════════════════════════

  private drawFooter(doc: jsPDF, page: number, total: number): void {
    const footY = this.PH - 14;

    // Line
    doc.setDrawColor(...this.C.border);
    doc.setLineWidth(0.2);
    doc.line(9, footY, this.PW - this.MR, footY);

    // Left text
    doc.setTextColor(...this.C.textLight);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.text(
      'This document contains confidential medical information protected by applicable privacy laws.',
      12,
      footY + 4
    );

    // Page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...this.C.blue);
    doc.text(`${page} / ${total}`, this.PW - this.MR, footY + 4, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  private ensureSpace(doc: jsPDF, needed: number): void {
    if (this.y + needed > this.PH - this.MB) {
      doc.addPage();
      this.y = this.MT + 5;
      this.drawSideStripe(doc);
    }
  }

  private fmtDate(s: string): string {
    if (!s) return '\u2014';
    try {
      const d = new Date(s + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return s;
    }
  }
}
