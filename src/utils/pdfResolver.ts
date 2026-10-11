// src/utils/pdfResolver.ts
import { textbookPdfs } from '../database/seeders/textbookPdfsData';

export interface ResolvedPdf {
  title: string;
  driveId: string;
  downloadUrl: string;
  cacheFileName: string;
}

export function resolvePdfSource(pdfUrl: string, title?: string): ResolvedPdf | null {
  if (!pdfUrl && !title) return null;

  // 1. Try finding by title
  let match = textbookPdfs.find(
    (b) =>
      (title && (b.titleEnglish.toLowerCase() === title.toLowerCase() || b.titleMarathi === title)) ||
      (pdfUrl && (b.titleEnglish.toLowerCase() === pdfUrl.toLowerCase()))
  );

  // 2. Try finding by fileName or relativePath inside pdfUrl
  if (!match && pdfUrl) {
    match = textbookPdfs.find((b) => {
      const cleanFileName = b.fileName.toLowerCase();
      const cleanRelPath = b.relativePath.toLowerCase();
      const lowerUrl = pdfUrl.toLowerCase();
      return (
        lowerUrl.includes(cleanFileName) ||
        lowerUrl.includes(cleanRelPath) ||
        (b.driveId && lowerUrl.includes(b.driveId))
      );
    });
  }

  // 3. Try finding by Google Drive ID in URL
  if (!match && pdfUrl) {
    const driveMatch = pdfUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || pdfUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const dId = driveMatch[1];
      const byDrive = textbookPdfs.find((b) => b.driveId === dId);
      if (byDrive) {
        match = byDrive;
      } else {
        const safeName = (title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');
        return {
          title: title || 'Textbook',
          driveId: dId,
          downloadUrl: `https://drive.usercontent.google.com/download?id=${dId}&export=download`,
          cacheFileName: `${safeName}_${dId}.pdf`,
        };
      }
    }
  }

  if (match) {
    const safeName = match.titleEnglish.replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      title: match.titleEnglish,
      driveId: match.driveId,
      downloadUrl: `https://drive.usercontent.google.com/download?id=${match.driveId}&export=download`,
      cacheFileName: `${safeName}_${match.driveId}.pdf`,
    };
  }

  // Fallback if URL is already a direct http/https url
  if (pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'))) {
    const safeName = (title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      title: title || 'Textbook',
      driveId: '',
      downloadUrl: pdfUrl,
      cacheFileName: `${safeName}.pdf`,
    };
  }

  return null;
}
