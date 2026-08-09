import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { VisitReport } from './visitReport';
import { buildVisitReportHtml } from './visitReportPdfHtml';

export async function shareVisitReportPdf(
  report: VisitReport,
  babyName: string,
): Promise<void> {
  const sharingAvailable =
    await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error(
      'Sharing is unavailable on this device.',
    );
  }

  const html = buildVisitReportHtml(
    report,
    babyName,
  );
  const { uri } = await Print.printToFileAsync({
    html,
    width: 612,
    height: 792,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  });

  const generatedFile = new File(uri);
  const sharedFile = new File(
    Paths.cache,
    createReportFilename(
      babyName,
      report.startDate,
      report.endDate,
    ),
  );

  if (sharedFile.exists) {
    sharedFile.delete();
  }

  generatedFile.move(sharedFile);

  try {
    await Sharing.shareAsync(sharedFile.uri, {
      dialogTitle: 'Share visit report',
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
  } finally {
    if (sharedFile.exists) {
      sharedFile.delete();
    }
  }
}

export function createReportFilename(
  babyName: string,
  startDate: Date,
  endDate: Date,
): string {
  const safeName = babyName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'Baby';

  return [
    'Sprout-Report',
    safeName,
    formatFilenameDate(startDate),
    'to',
    formatFilenameDate(endDate),
  ].join('-') + '.pdf';
}

function formatFilenameDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
