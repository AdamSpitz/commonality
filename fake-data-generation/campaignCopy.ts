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

/**
 * Why the two sides of a network-societies bridge can meet.
 * Keyed by cause id so the next campaign run stores the sentence as the bridge description.
 */
const BRIDGE_POINTS: Record<string, string> = {
  'checkout-trial-bridge': 'Blockchain-based payments would be a great fit both for people who don\'t want to be vulnerable to censorship from banks and for people who don\'t like paying high fees to credit-card companies.',
  'grey-assimilation': 'Practical-English sessions can suit both people who want newcomers to keep their own customs and people who want township business to stay in English.',
  'opinion-employment': 'An ordinary political opinion, by itself, need not make someone unemployable. That can suit both people who don\'t want a livelihood lost over an unpopular remark and people who are tired of institutions ending careers over ordinary opinions.',
  'canada-us-ties': 'Keeping ordinary purchases and family visits can suit both people who dislike the current US administration and people who think there is nothing wrong with ordinary Canada–US ties.',
  abortion: 'A time limit that settles the fight can suit both people who want abortion available early in a pregnancy and people who find late-term abortion horrific.',
  schools: 'An actual push of kids toward LGBT identities can be wrong to both people who think schools are only being supportive and people who think that push is already happening.',
  voting: 'Trying something other than first-past-the-post can suit both people who prefer ranked choice and people who prefer approval voting.',
};

export function bridgeMediatorNote(title: string, causeId?: string): string {
  const point = causeId ? BRIDGE_POINTS[causeId] : undefined;
  if (point) return `${point} ${FAKE_DATA_NOTE}`;
  return `A mediator assembled this bridge for ${title.trim()}. The modified wordings are meant to imply the common-ground statement, and each natural board stays on its own side. ${FAKE_DATA_NOTE}`;
}

export function projectOutcome(causeTitle: string, topics: string): string {
  return `A project for ${causeTitle.trim().toLowerCase()}, working on ${topics}. ${FAKE_DATA_NOTE}`;
}
