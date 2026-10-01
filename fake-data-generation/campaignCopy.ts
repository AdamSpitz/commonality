export const FAKE_DATA_NOTE = '(This is fake data created for testing.)';

function supporting(title: string): string {
  const trimmed = title.trim();
  const sentence = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `Cause board supporting ${sentence}.`;
}

/** Friend-facing board summary. The parenthetical is the synthetic-data disclosure. */
export function causeBoardSummary(title: string, role?: string): string {
  const subject = title.trim();
  const body = role === 'commonality'
    ? `Common-ground board for ${subject}. It holds only the settlement statement the two sides can share.`
    : role === 'natural-left' || role === 'natural-right'
      ? `One side’s own wording for ${subject}. The other side and the common-ground board are separate pages.`
      : role === 'modified-left' || role === 'modified-right'
        ? `A narrowed wording for ${subject}, written so it implies the common-ground statement.`
        : supporting(subject);
  return `${body} ${FAKE_DATA_NOTE}`;
}

export function bridgeMediatorNote(title: string): string {
  return `A mediator assembled this bridge for ${title.trim()}. The modified wordings are meant to imply the common-ground statement, and each natural board stays on its own side. ${FAKE_DATA_NOTE}`;
}

export function projectOutcome(causeTitle: string, topics: string): string {
  return `A project for ${causeTitle.trim().toLowerCase()}, working on ${topics}. ${FAKE_DATA_NOTE}`;
}
