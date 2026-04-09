import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { PrescriptionPayload } from '../models/prescription.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionPdfService {
  private readonly PW = 210;
  private readonly PH = 297;
  private readonly ML = 18;
  private readonly MR = 18;
  private readonly MT = 18;
  private readonly MB = 22;

  private readonly C = {
    navy: [17, 35, 90] as [number, number, number],
    blue: [37, 99, 206] as [number, number, number],
    green: [46, 125, 50] as [number, number, number],
    greenBg: [232, 245, 233] as [number, number, number],
    greenPale: [241, 248, 241] as [number, number, number],
    accent: [0, 180, 140] as [number, number, number],
    accentBg: [230, 252, 246] as [number, number, number],
    text: [30, 30, 40] as [number, number, number],
    textMid: [80, 85, 100] as [number, number, number],
    textLight: [130, 135, 150] as [number, number, number],
    border: [210, 218, 235] as [number, number, number],
    row: [247, 250, 255] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    codeBg: [232, 234, 246] as [number, number, number],
    codeText: [26, 35, 126] as [number, number, number],
  };

  private y = 0;
  private doc!: jsPDF;

  async generatePrescriptionPdf(data: PrescriptionPayload): Promise<Blob> {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.y = this.MT;

    this.drawSideStripe();
    this.drawHeader(data);
    this.drawPatientCard(data);
    this.drawMedicationsSection(data);
    if (data.prescription.notes?.trim()) {
      this.drawNotesSection(data.prescription.notes);
    }
    this.drawShortCodeSection(data.shortCode);
    this.drawSignatureArea(data);

    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      if (i > 1) this.drawSideStripe();
      this.drawFooter(i, total);
    }

    return this.doc.output('blob');
  }

  // ── Sidebar stripe ───────────────────────────────────────────────────────

  private drawSideStripe(): void {
    this.doc.setFillColor(...this.C.blue);
    this.doc.rect(0, 0, 5, this.PH, 'F');
    this.doc.setFillColor(...this.C.navy);
    this.doc.rect(0, 0, 5, 60, 'F');
  }

  // ── Header ───────────────────────────────────────────────────────────────

  private drawHeader(data: PrescriptionPayload): void {
    const headerH = 32;
    const startX = 9;
    const w = this.PW - startX - this.MR;

    this.doc.setFillColor(...this.C.navy);
    this.doc.roundedRect(startX, this.y, w, headerH, 3, 3, 'F');

    // Green cross icon
    const iconX = startX + 8;
    const iconY = this.y + headerH / 2;
    this.doc.setFillColor(...this.C.green);
    this.doc.roundedRect(iconX - 4.5, iconY - 4.5, 9, 9, 1.5, 1.5, 'F');
    this.doc.setFillColor(...this.C.white);
    this.doc.rect(iconX - 0.8, iconY - 3, 1.6, 6, 'F');
    this.doc.rect(iconX - 3, iconY - 0.8, 6, 1.6, 'F');

    // Title
    this.doc.setTextColor(...this.C.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text('ELECTRONIC PRESCRIPTION', startX + 20, this.y + 13);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(180, 200, 240);
    this.doc.text('Encrypted · Stored on IPFS · Verified on Blockchain', startX + 20, this.y + 20);

    // Date top-right
    this.doc.setTextColor(...this.C.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    const dateStr = new Date(data.timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    this.doc.text(dateStr, startX + w - 5, this.y + 10, { align: 'right' });

    this.y += headerH + 6;
  }

  // ── Patient card ─────────────────────────────────────────────────────────

  private drawPatientCard(data: PrescriptionPayload): void {
    const startX = 9;
    const cardW = this.PW - startX - this.MR;
    const cardH = 22;

    this.doc.setFillColor(...this.C.greenPale);
    this.doc.roundedRect(startX, this.y, cardW, cardH, 2, 2, 'F');
    this.doc.setDrawColor(...this.C.green);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(startX, this.y, cardW, cardH, 2, 2, 'S');

    // Patient
    this.doc.setTextColor(...this.C.green);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.text('PATIENT', startX + 8, this.y + 7.5);
    this.doc.setTextColor(...this.C.navy);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.doc.text(data.patientName, startX + 8, this.y + 14);

    // Doctor
    this.doc.setTextColor(...this.C.green);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.text('PRESCRIBING DOCTOR', startX + cardW - 8, this.y + 7.5, { align: 'right' });
    this.doc.setTextColor(...this.C.navy);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.doc.text(data.doctorName, startX + cardW - 8, this.y + 14, { align: 'right' });

    this.y += cardH + 8;
  }

  // ── Medications section ──────────────────────────────────────────────────

  private drawMedicationsSection(data: PrescriptionPayload): void {
    const startX = 9;
    const w = this.PW - startX - this.MR;

    // Section heading
    this.doc.setFillColor(...this.C.blue);
    this.doc.circle(startX + 5, this.y + 4, 4.5, 'F');
    this.doc.setTextColor(...this.C.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.text('01', startX + 5, this.y + 5.3, { align: 'center' });

    this.doc.setTextColor(...this.C.navy);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11.5);
    this.doc.text('PRESCRIBED MEDICATIONS', startX + 14, this.y + 5.5);
    this.doc.setDrawColor(...this.C.blue);
    this.doc.setLineWidth(0.6);
    this.doc.line(startX + 14, this.y + 8, startX + 14 + 68, this.y + 8);
    this.y += 14;

    // Table header
    const colX = [startX, startX + 65, startX + 100, startX + 135];
    const colW = [55, 35, 35, w - 135];
    const headers = ['Medication', 'Dose', 'Frequency', 'Duration'];

    this.doc.setFillColor(...this.C.navy);
    this.doc.rect(startX, this.y, w, 8, 'F');
    this.doc.setTextColor(...this.C.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    headers.forEach((h, i) => {
      this.doc.text(h, colX[i] + 3, this.y + 5.5);
    });
    this.y += 8;

    // Table rows
    data.prescription.medications.forEach((med, idx) => {
      const rowH = 10;
      this.ensureSpace(rowH);

      if (idx % 2 === 1) {
        this.doc.setFillColor(...this.C.row);
        this.doc.rect(startX, this.y, w, rowH, 'F');
      }

      this.doc.setTextColor(...this.C.text);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.5);
      this.doc.text(med.name, colX[0] + 3, this.y + 6.5);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.5);
      this.doc.text(med.dose, colX[1] + 3, this.y + 6.5);
      this.doc.text(med.frequency, colX[2] + 3, this.y + 6.5);
      this.doc.text(med.duration, colX[3] + 3, this.y + 6.5);

      // Row border
      this.doc.setDrawColor(...this.C.border);
      this.doc.setLineWidth(0.1);
      this.doc.line(startX, this.y + rowH, startX + w, this.y + rowH);

      this.y += rowH;
    });

    this.y += 6;
  }

  // ── Notes section ────────────────────────────────────────────────────────

  private drawNotesSection(notes: string): void {
    const startX = 9;
    const w = this.PW - startX - this.MR;

    this.ensureSpace(20);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    const lines = this.doc.splitTextToSize(notes, w - 10);
    const boxH = Math.max(14, lines.length * 5 + 10);

    this.ensureSpace(boxH + 4);

    this.doc.setFillColor(...this.C.accentBg);
    this.doc.roundedRect(startX, this.y, w, boxH, 2, 2, 'F');
    this.doc.setDrawColor(...this.C.accent);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(startX, this.y, w, boxH, 2, 2, 'S');

    this.doc.setTextColor(...this.C.green);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.text('NOTES', startX + 5, this.y + 6);

    this.doc.setTextColor(...this.C.text);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.text(lines, startX + 5, this.y + 11);

    this.y += boxH + 6;
  }

  // ── Short code section ───────────────────────────────────────────────────

  private drawShortCodeSection(shortCode: string): void {
    const startX = 9;
    const w = this.PW - startX - this.MR;

    this.ensureSpace(32);

    this.doc.setFillColor(...this.C.codeBg);
    this.doc.roundedRect(startX, this.y, w, 28, 3, 3, 'F');
    this.doc.setDrawColor(...this.C.codeText);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(startX, this.y, w, 28, 3, 3, 'S');

    this.doc.setTextColor(...this.C.codeText);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.text('PHARMACY CODE — PRESENT TO PHARMACIST', startX + w / 2, this.y + 7, {
      align: 'center',
    });

    // Spaced characters for the code
    const spaced = shortCode.split('').join('   ');
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(22);
    this.doc.text(spaced, startX + w / 2, this.y + 21, { align: 'center' });

    this.y += 34;
  }

  // ── Signature area ───────────────────────────────────────────────────────

  private drawSignatureArea(data: PrescriptionPayload): void {
    const startX = 9;
    const boxW = this.PW - startX - this.MR;

    this.ensureSpace(38);

    this.doc.setDrawColor(...this.C.border);
    this.doc.setLineWidth(0.2);
    this.doc.line(startX, this.y, startX + boxW, this.y);
    this.y += 8;

    const sigX = startX + boxW - 70;
    this.doc.setDrawColor(...this.C.navy);
    this.doc.setLineWidth(0.4);
    this.doc.line(sigX, this.y + 12, sigX + 60, this.y + 12);

    this.doc.setTextColor(...this.C.navy);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.text(data.doctorName, sigX + 30, this.y + 18, { align: 'center' });

    this.doc.setTextColor(...this.C.textMid);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.text('Prescribing Physician', sigX + 30, this.y + 22, { align: 'center' });
    this.doc.text(
      `Date: ${new Date(data.timestamp).toLocaleDateString('en-GB')}`,
      sigX + 30,
      this.y + 26,
      { align: 'center' }
    );

    // Stamp placeholder
    this.doc.setDrawColor(...this.C.border);
    this.doc.setLineWidth(0.3);
    const stampX = startX + 15;
    const stampY = this.y;
    this.doc.roundedRect(stampX, stampY, 30, 26, 2, 2, 'S');
    this.doc.setTextColor(...this.C.textLight);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(7);
    this.doc.text('Medical', stampX + 15, stampY + 11, { align: 'center' });
    this.doc.text('Stamp', stampX + 15, stampY + 15, { align: 'center' });

    this.y += 30;
  }

  // ── Footer ───────────────────────────────────────────────────────────────

  private drawFooter(page: number, total: number): void {
    const footY = this.PH - 14;

    this.doc.setDrawColor(...this.C.border);
    this.doc.setLineWidth(0.2);
    this.doc.line(9, footY, this.PW - this.MR, footY);

    this.doc.setTextColor(...this.C.textLight);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(6.5);
    this.doc.text(
      'This document is an encrypted electronic prescription. Valid only when dispensed through the EHR system.',
      9,
      footY + 5
    );

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Page ${page} / ${total}`, this.PW - this.MR, footY + 5, { align: 'right' });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private ensureSpace(needed: number): void {
    if (this.y + needed > this.PH - this.MB) {
      this.doc.addPage();
      this.y = this.MT;
      this.drawSideStripe();
    }
  }
}
