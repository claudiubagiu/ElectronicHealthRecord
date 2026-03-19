import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface CustomField {
  label: string;
  value: string;
}

export interface DiagnosticData {
  // General info
  title: string;
  consultationDate: string;
  // Patient & Doctor
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
  // Custom fields per category
  customGeneralInfo: CustomField[];
  customAnamnesis: CustomField[];
  customClinicalExam: CustomField[];
  customDiagnosis: CustomField[];
}

@Injectable({ providedIn: 'root' })
export class DiagnosticPdfService {
  async generateDiagnosticPdf(data: DiagnosticData): Promise<Blob> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const checkPage = (needed: number) => {
      if (y + needed > pageH - 18) {
        doc.addPage();
        y = 18;
      }
    };

    const addSection = (title: string) => {
      checkPage(14);
      y += 4;
      doc.setFillColor(21, 101, 192);
      doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 4, y + 5.5);
      doc.setTextColor(30, 30, 30);
      y += 12;
    };

    const addField = (label: string, value: string | undefined | null) => {
      if (!value || !value.trim()) return;
      checkPage(14);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), margin, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(value, contentW);
      checkPage(lines.length * 5 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 5;
    };

    // ── Header ────────────────────────────────────────────────────────────────

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 38, 'F');

    doc.setFillColor(21, 101, 192);
    doc.rect(0, 38, pageW, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MedChain', margin, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Digital Health Platform · Confidential Document', margin, 21);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(data.title, contentW);
    doc.text(titleLines, margin, 31);

    y = 48;

    // ── Info box ──────────────────────────────────────────────────────────────

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentW, 26, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PATIENT', margin + 5, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(data.patient, margin + 5, y + 13);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`CNP: ${data.patientCNP}`, margin + 5, y + 19);

    const mid = pageW / 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(mid, y + 4, mid, y + 22);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PHYSICIAN', mid + 5, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(data.doctor, mid + 5, y + 13);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date(data.consultationDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Date: ${dateStr}`, mid + 5, y + 19);

    y += 32;

    // ── 1. General Information ────────────────────────────────────────────────

    addSection('1. General Information');
    addField('Diagnosis Title', data.title);
    addField('Consultation Date', dateStr);
    data.customGeneralInfo.forEach((f) => addField(f.label, f.value));

    // ── 2. Anamnesis ──────────────────────────────────────────────────────────

    addSection('2. Anamnesis');
    addField('Chief Complaint', data.chiefComplaint);
    addField('Personal Medical History', data.personalHistory);
    addField('Family History', data.familyHistory);
    addField('Known Allergies', data.allergies);
    data.customAnamnesis.forEach((f) => addField(f.label, f.value));

    // ── 3. Clinical Examination ───────────────────────────────────────────────

    addSection('3. Clinical Examination');

    const vitals: { label: string; val: string | undefined }[] = [
      { label: 'Blood Pressure', val: data.bloodPressure },
      { label: 'Pulse', val: data.pulse },
      { label: 'Temperature', val: data.temperature },
      { label: 'Weight / Height', val: data.weightHeight },
    ].filter((v) => !!v.val);

    if (vitals.length > 0) {
      checkPage(18);
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(147, 197, 253);
      const cellW = contentW / Math.min(vitals.length, 4);
      vitals.forEach((v, i) => {
        const cx = margin + i * cellW;
        doc.roundedRect(cx, y, cellW - 3, 14, 1, 1, 'FD');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(v.label.toUpperCase(), cx + 3, y + 5);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(v.val!, cx + 3, y + 11);
      });
      y += 18;
    }

    addField('Clinical Notes', data.clinicalNotes);
    data.customClinicalExam.forEach((f) => addField(f.label, f.value));

    // ── 4. Diagnosis & Treatment ──────────────────────────────────────────────

    addSection('4. Diagnosis & Treatment');

    if (data.primaryDiagnosis) {
      checkPage(18);
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(21, 101, 192);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentW, 16, 2, 2, 'FD');
      doc.setLineWidth(0.2);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('PRIMARY DIAGNOSIS', margin + 4, y + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 101, 192);
      const dxLines = doc.splitTextToSize(data.primaryDiagnosis, contentW - 8);
      doc.text(dxLines, margin + 4, y + 12);
      y += 20;
    }

    addField('ICD-10 Code', data.icdCode);
    addField('Secondary Diagnosis', data.secondaryDiagnosis);
    addField('Recommended Investigations', data.recommendedInvestigations);
    addField('Prescribed Treatment', data.treatment);
    addField('General Recommendations', data.generalRecommendations);
    addField('Follow-up Date', data.followUpDate);
    addField('Final Notes', data.finalNotes);
    data.customDiagnosis.forEach((f) => addField(f.label, f.value));

    // ── Footer on each page ───────────────────────────────────────────────────

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(15, 23, 42);
      doc.rect(0, pageH - 10, pageW, 10, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('MedChain · Auto-generated document · Confidential', margin, pageH - 4);
      doc.text(`Page ${i} / ${totalPages}`, pageW - margin - 15, pageH - 4);
    }

    return doc.output('blob');
  }
}
