import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface MedicationEntry {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionFormData {
  title: string;
  medications: MedicationEntry[];
  notes: string;
}

export interface PrescriptionPayload {
  prescription: PrescriptionFormData;
  shortCode: string;
  patientName: string;
  doctorName: string;
  timestamp: number;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 18;
const MARGIN_R = 18;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const LINE_H = 5.5;
const LABEL_W = 52;

@Injectable({ providedIn: 'root' })
export class PrescriptionPdfService {
  async generatePrescriptionPdf(payload: PrescriptionPayload): Promise<Blob> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const ctx = new RenderContext(doc);

    this.renderHeader(ctx, payload);
    this.renderPatientBlock(ctx, payload);
    this.renderMedications(ctx, payload);
    if (payload.prescription.notes?.trim()) {
      this.renderNotes(ctx, payload.prescription.notes);
    }
    this.renderShortCode(ctx, payload.shortCode);
    this.renderFooter(ctx, payload);

    return doc.output('blob');
  }

  private renderHeader(ctx: RenderContext, payload: PrescriptionPayload): void {
    const doc = ctx.doc;

    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_L, 14, PAGE_W - MARGIN_R, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('MEDICAL PRESCRIPTION', MARGIN_L, 11);

    const dateLabel = this.formatDate(new Date(payload.timestamp).toISOString().split('T')[0]);
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`Date: ${dateLabel}`, PAGE_W - MARGIN_R, 18, { align: 'right' });
    doc.text(`Doctor: ${payload.doctorName}`, PAGE_W - MARGIN_R, 23, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('PRESCRIPTION', MARGIN_L, 24);

    if (payload.prescription.title?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(payload.prescription.title, MARGIN_L, 30);

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_L, 33, PAGE_W - MARGIN_R, 33);

      ctx.y = 39;
    } else {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_L, 27, PAGE_W - MARGIN_R, 27);

      ctx.y = 33;
    }
  }

  private renderPatientBlock(ctx: RenderContext, payload: PrescriptionPayload): void {
    const doc = ctx.doc;

    doc.setFillColor(245, 245, 245);
    doc.rect(MARGIN_L, ctx.y, CONTENT_W, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('PATIENT', MARGIN_L + 4, ctx.y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(payload.patientName, MARGIN_L + 4, ctx.y + 11.5);

    ctx.y += 19;
  }

  private renderMedications(ctx: RenderContext, payload: PrescriptionPayload): void {
    const doc = ctx.doc;
    const meds = payload.prescription.medications;

    ctx.ensureSpace(20);
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, ctx.y, PAGE_W - MARGIN_R, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    ctx.y += 4.5;
    doc.text('MEDICATIONS', MARGIN_L, ctx.y);
    ctx.y += 6;

    meds.forEach((med, index) => {
      ctx.ensureSpace(28);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`${index + 1}.`, MARGIN_L, ctx.y + LINE_H - 1);

      const col = MARGIN_L + 7;
      const colW = CONTENT_W - 7;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(20, 20, 20);
      doc.text(med.name, col, ctx.y + LINE_H - 1);
      ctx.y += LINE_H + 1;

      const details: Array<{ label: string; value: string }> = [
        { label: 'Dose', value: med.dose },
        { label: 'Frequency', value: med.frequency },
        { label: 'Duration', value: med.duration },
      ];

      let x = col;
      details.forEach(({ label, value }) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const lblW = doc.getTextWidth(`${label}: `);
        doc.text(`${label}: `, x, ctx.y + LINE_H - 1);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        const valW = doc.getTextWidth(value);
        doc.text(value, x + lblW, ctx.y + LINE_H - 1);

        x += lblW + valW + 10;
      });

      ctx.y += LINE_H + 1;

      if (index < meds.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(col, ctx.y + 1, PAGE_W - MARGIN_R, ctx.y + 1);
        ctx.y += 4;
      } else {
        ctx.y += 2;
      }
    });
  }

  private renderNotes(ctx: RenderContext, notes: string): void {
    const doc = ctx.doc;

    ctx.ensureSpace(20);
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, ctx.y, PAGE_W - MARGIN_R, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    ctx.y += 4.5;
    doc.text('NOTES', MARGIN_L, ctx.y);
    ctx.y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(notes, CONTENT_W);
    ctx.ensureSpace(lines.length * LINE_H + 4);
    doc.text(lines, MARGIN_L, ctx.y + LINE_H - 1);
    ctx.y += lines.length * LINE_H + 4;
  }

  private renderShortCode(ctx: RenderContext, shortCode: string): void {
    const doc = ctx.doc;

    ctx.ensureSpace(28);

    ctx.y += 4;

    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, ctx.y, PAGE_W - MARGIN_R, ctx.y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    ctx.y += 4.5;
    doc.text('DISPENSING CODE', MARGIN_L, ctx.y);
    ctx.y += 6;

    const boxW = 60;
    const boxH = 14;
    const boxX = MARGIN_L;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.5);
    doc.rect(boxX, ctx.y, boxW, boxH);

    doc.setFont('courier', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text(shortCode, boxX + boxW / 2, ctx.y + boxH / 2 + 3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    const hintX = boxX + boxW + 6;
    const hintW = CONTENT_W - boxW - 6;
    const hint =
      'Present this code to the pharmacist. ' +
      'The pharmacist will use it to decrypt and access the prescription.';
    const hintLines = doc.splitTextToSize(hint, hintW);
    doc.text(hintLines, hintX, ctx.y + 5);

    ctx.y += boxH + 6;
  }

  private renderFooter(ctx: RenderContext, payload: PrescriptionPayload): void {
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

      doc.text(`Doctor: ${payload.doctorName}`, MARGIN_L, PAGE_H - 10);
      doc.text(`Page ${i} of ${pageCount}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });
      doc.text('Confidential medical document', PAGE_W - MARGIN_R, PAGE_H - 10, { align: 'right' });

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

class RenderContext {
  y = 0;

  constructor(public doc: jsPDF) {}

  ensureSpace(neededMm: number): void {
    if (this.y + neededMm > PAGE_H - 22) {
      this.doc.addPage();
      this.y = 18;
    }
  }
}
