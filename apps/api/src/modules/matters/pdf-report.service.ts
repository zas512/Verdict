import {Injectable} from "@nestjs/common";

@Injectable()
export class PdfReportService {
  generateMatterSummaryPdf(matter: any, timeline: any[]): Buffer {
    const lines: string[] = [];
    lines.push(`LGA MATTER SUMMARY REPORT`);
    lines.push(`=========================`);
    lines.push(`Client Name: ${matter.clientName}`);
    lines.push(`Internal Case Reference: ${matter.firmCaseNumber}`);
    lines.push(`Court Case Number: ${matter.courtCaseNumber ?? "N/A"}`);
    lines.push(`CNR: ${matter.cnr ?? "N/A"}`);
    lines.push(`Case Type: ${matter.caseType}`);
    lines.push(`Court: ${matter.court ?? "N/A"}`);
    lines.push(`Bench: ${matter.bench ?? "N/A"}`);
    lines.push(`Judge: ${matter.presidingJudge ?? "N/A"}`);
    lines.push(`Status: ${matter.status}`);
    if (matter.currentStage) {
      lines.push(`Current Stage: ${matter.currentStage.name}`);
    }
    lines.push(`Filing Date: ${matter.filingDate ? new Date(matter.filingDate).toLocaleDateString() : "N/A"}`);
    lines.push(``);
    lines.push(`Timeline Events:`);
    lines.push(`----------------`);
    for (const event of timeline) {
      const dateStr = new Date(event.date).toLocaleDateString();
      if (event.type === "HEARING") {
        lines.push(`[${dateStr}] HEARING: Purpose: ${event.data.purpose}, Next Date: ${event.data.nextDate ? new Date(event.data.nextDate).toLocaleDateString() : "None"}`);
      } else if (event.type === "TASK_COMPLETED") {
        lines.push(`[${dateStr}] TASK COMPLETED: Title: ${event.data.title}`);
      } else if (event.type === "DOCUMENT_UPLOADED") {
        lines.push(`[${dateStr}] DOCUMENT UPLOADED: Version #${event.data.versionNumber}, Notes: ${event.data.changeNotes ?? "None"}`);
      } else if (event.type === "STAGE_CHANGE") {
        lines.push(`[${dateStr}] STAGE CHANGED: ${event.data.action}`);
      }
    }

    const streamContent = `BT\n/F1 10 Tf\n14 TL\n50 780 Td\n`;
    const escapedLines = lines.map(line => {
      const escaped = line.replace(/[()]/g, '\\$&');
      return `(${escaped}) Tj T*`;
    }).join("\n");
    const stream = `${streamContent}${escapedLines}\nET`;

    const fontObj = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`;
    const pageContentsObj = `5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj`;
    const pageObj = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595.27 841.89] /Contents 5 0 R >>\nendobj`;
    const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`;
    const catalogObj = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`;

    let offset = 9; // length of "%PDF-1.4\n"
    const offsets: number[] = [];
    const objStrings = [catalogObj, pagesObj, pageObj, fontObj, pageContentsObj];
    for (let i = 0; i < objStrings.length; i++) {
      offsets.push(offset);
      offset += Buffer.byteLength(objStrings[i]) + 1; // plus newline
    }

    const xrefLines = offsets.map(off => {
      return off.toString().padStart(10, '0') + " 00000 n ";
    });

    const xrefStr = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n` + xrefLines.join("\n") + "\n";
    const startXref = offset;
    const trailer = `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.concat([
        Buffer.from(`%PDF-1.4\n`),
        Buffer.from(catalogObj + `\n`),
        Buffer.from(pagesObj + `\n`),
        Buffer.from(pageObj + `\n`),
        Buffer.from(fontObj + `\n`),
        Buffer.from(pageContentsObj + `\n`),
        Buffer.from(xrefStr),
        Buffer.from(trailer)
    ]);
  }
}
