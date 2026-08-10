import type { VisitReport } from './visitReport';

export function buildVisitReportHtml(
  report: VisitReport,
  babyName: string,
): string {
  const feedingMethods = report.feeding.methods.length > 0
    ? report.feeding.methods
        .map(
          ({ method, count }) =>
            `${count} ${escapeHtml(method.toLowerCase())}`,
        )
        .join(' | ')
    : 'No feeding methods recorded';

  const diaperTypes = report.diaper.types.length > 0
    ? report.diaper.types
        .map(
          ({ type, count }) =>
            `${count} ${escapeHtml(type.toLowerCase())}`,
        )
        .join(' | ')
    : 'No diaper types recorded';

  const dailyRows = report.days.length > 0
    ? report.days
        .map(
          (day) => `
            <tr>
              <td>${escapeHtml(formatDay(day.date))}</td>
              <td>${day.feedingCount}</td>
              <td>${
                day.recordedOunceCount > 0
                  ? `${formatNumber(day.recordedOunces)} oz`
                  : '-'
              }</td>
              <td>${day.diaperCount}</td>
              <td>${day.sleepSessionCount}</td>
              <td>${day.noteCount}</td>
            </tr>
          `,
        )
        .join('')
    : `
        <tr>
          <td class="empty-cell" colspan="6">No activities recorded in this range.</td>
        </tr>
      `;

  const noteRows = report.notes.length > 0
    ? report.notes
        .map(
          (note) => `
            <div class="note">
              <div class="note-date">${escapeHtml(formatNoteDate(note.occurredAt))}</div>
              <div class="note-text">${escapeHtml(note.text)}</div>
            </div>
          `,
        )
        .join('')
    : '<p class="empty-text">No notes recorded in this range.</p>';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { margin: 42px 44px 48px; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #304435;
        background: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        font-size: 11px;
        line-height: 1.45;
      }
      .document-footer {
        margin-top: 14px;
        color: #8b938c;
        font-size: 8px;
        text-align: center;
      }
      .brand {
        color: #657a68;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1.5px;
      }
      h1 {
        margin: 5px 0 2px;
        color: #263b2b;
        font-size: 27px;
        line-height: 1.15;
      }
      .range {
        color: #48684d;
        font-size: 11px;
        font-weight: 700;
      }
      .description {
        max-width: 510px;
        margin: 9px 0 0;
        color: #68736b;
        font-size: 10px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 20px;
      }
      .section {
        page-break-inside: avoid;
        border: 1px solid #dfe6dc;
        border-radius: 9px;
        padding: 12px 14px;
      }
      .section-title {
        margin: 0 0 8px;
        color: #344a39;
        font-size: 13px;
      }
      .metric {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid #edf0ea;
        padding: 5px 0;
      }
      .metric:first-of-type { border-top: 0; }
      .metric-label { color: #69746c; }
      .metric-value { color: #304435; font-weight: 700; text-align: right; }
      .context {
        margin: 7px 0 0;
        color: #758078;
        font-size: 9px;
      }
      .full-section { margin-top: 14px; }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      th {
        color: #657a68;
        background: #f3f6f0;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .3px;
        text-align: left;
        text-transform: uppercase;
      }
      th, td {
        border-bottom: 1px solid #e8ece5;
        padding: 6px 5px;
        vertical-align: top;
      }
      tr { page-break-inside: avoid; }
      th:first-child, td:first-child { width: 24%; }
      .empty-cell, .empty-text { color: #7c867e; font-style: italic; }
      .note {
        page-break-inside: avoid;
        border-top: 1px solid #e8ece5;
        padding: 8px 0;
      }
      .note:first-of-type { border-top: 0; }
      .note-date {
        color: #718075;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .3px;
        text-transform: uppercase;
      }
      .note-text {
        margin-top: 3px;
        color: #425348;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">OUR BABY LOG - VISIT REPORT</div>
      <h1>${escapeHtml(babyName)}</h1>
      <div class="range">${escapeHtml(formatReportRange(report))}</div>
      <p class="description">A descriptive summary of recorded care. This report does not provide medical interpretation, health scores, or normal/abnormal judgments.</p>
    </header>

    <div class="summary-grid">
      <section class="section">
        <h2 class="section-title">Feeding</h2>
        ${metric('Total feedings', String(report.feeding.totalCount))}
        ${metric('Recorded ounces', `${formatNumber(report.feeding.recordedOunces)} oz`)}
        ${metric('Average recorded ounces per day', `${formatNumber(report.feeding.averageRecordedOuncesPerDay)} oz`)}
        ${metric('Average per feeding with ounces', `${formatNumber(report.feeding.averageOuncesPerRecordedFeeding)} oz`)}
        <p class="context">${report.feeding.recordedOunceCount} with an ounce amount | ${report.feeding.withoutOuncesCount} without<br />${feedingMethods}</p>
      </section>

      <section class="section">
        <h2 class="section-title">Diapers</h2>
        ${metric('Total diapers', String(report.diaper.totalCount))}
        ${metric('Average per day', formatNumber(report.diaper.averagePerDay))}
        <p class="context">${diaperTypes}</p>
      </section>

      <section class="section">
        <h2 class="section-title">Completed sleep</h2>
        ${metric('Total duration', formatDuration(report.sleep.totalMinutes))}
        ${metric('Average per day', formatDuration(report.sleep.averageMinutesPerDay))}
        ${metric('Completed sessions', String(report.sleep.sessionCount))}
        ${metric('Average session length', formatDuration(report.sleep.averageSessionMinutes))}
      </section>

      <section class="section">
        <h2 class="section-title">Report details</h2>
        ${metric('Calendar days', String(report.dayCount))}
        ${metric('Recorded activities', String(report.activityCount))}
        ${metric('Notes', String(report.notes.length))}
      </section>
    </div>

    <section class="section full-section">
      <h2 class="section-title">Daily breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Feedings</th>
            <th>Recorded oz</th>
            <th>Diapers</th>
            <th>Sleep sessions</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${dailyRows}</tbody>
      </table>
    </section>

    <section class="section full-section">
      <h2 class="section-title">Notes (${report.notes.length})</h2>
      ${noteRows}
    </section>
    <div class="document-footer">Generated by Our Baby Log</div>
  </body>
</html>`;
}

function metric(label: string, value: string): string {
  return `
    <div class="metric">
      <span class="metric-label">${escapeHtml(label)}</span>
      <span class="metric-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function formatReportRange(report: VisitReport): string {
  return `${formatLongDate(report.startDate)} to ${formatLongDate(report.endDate)} - ${report.dayCount} ${report.dayCount === 1 ? 'day' : 'days'}`;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatNoteDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(1)));
}

function formatDuration(value: number): string {
  const minutes = Math.round(value);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0
    ? `${hours} hr`
    : `${hours} hr ${remainingMinutes} min`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
