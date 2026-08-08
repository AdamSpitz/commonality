import assert from 'assert';
import { enhanceCreateProjectError } from './actions.js';

describe('enhanceCreateProjectError', () => {
  it('adds a redeploy hint for opaque execution reverted errors', () => {
    const err = new Error(
      'The contract function "createERC1155AndAssuranceContract" reverted.\nDetails: execution reverted',
    );
    const enhanced = enhanceCreateProjectError(
      err,
      '0xfcDB4564c18A9134002b9771816092C9693622e3',
    );
    assert.match(enhanced.message, /legacy ABI/);
    assert.match(enhanced.message, /deploy-contracts\.sh localhost/);
    assert.match(enhanced.message, /check-local-config-sync/);
    assert.match(enhanced.message, /0xfcDB4564c18A9134002b9771816092C9693622e3/);
    assert.strictEqual(enhanced.cause, err);
  });

  it('leaves known custom errors unchanged', () => {
    const err = new Error(
      'The contract function reverted with the following reason:\nInvalidDeadline()',
    );
    const enhanced = enhanceCreateProjectError(err);
    assert.strictEqual(enhanced, err);
  });

  it('wraps non-Error throwables', () => {
    const enhanced = enhanceCreateProjectError('execution reverted');
    assert.ok(enhanced instanceof Error);
    assert.match(enhanced.message, /legacy ABI|createProject failed/);
  });
});
