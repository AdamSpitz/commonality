import assert from 'assert';
import { buildWorkPledgeDocument, parseVolunteerDiscoveryDocument } from './documents.js';

describe('volunteer discovery documents', () => {
  const input = { statementCid: 'bafystatement', skills: ['design'], note: 'I can help' };

  it('normalizes imported skill tags so duplicate tags cannot inflate matches', () => {
    const document = buildWorkPledgeDocument(input);
    document.extras = { ...document.extras, skills: [' Design ', 'design', 'Grant   Writing'] };
    assert.deepEqual(parseVolunteerDiscoveryDocument(document)?.skills, ['design', 'grant writing']);
  });

  it('rejects malformed and oversized imported records', () => {
    for (const fields of [
      { skills: ['design', 42] },
      { skills: ['x'.repeat(41)] },
      { skills: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { note: 'x'.repeat(281) },
    ]) {
      const document = buildWorkPledgeDocument(input);
      document.extras = { ...document.extras, ...fields };
      assert.equal(parseVolunteerDiscoveryDocument(document), null);
    }
  });
});
