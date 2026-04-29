import assert from 'assert';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionMetadata,
  type ActionTestingMachinery,
} from './action-framework.js';

describe('Action Framework unit tests', () => {
  function createContext(): ActionContext {
    return {
      machinery: {} as ActionTestingMachinery,
      entities: { userAddress: '0x0000000000000000000000000000000000000001' },
    };
  }

  function createMetadata(readState: () => unknown): ActionMetadata {
    return {
      name: 'testAction',
      category: 'other',
      stateTransitionProperties: [
        {
          name: 'state snapshot',
          captureState: async () => readState(),
          check: async () => undefined,
        },
      ],
    };
  }

  it('returns undefined when an expected-failure action fails and state is unchanged', async () => {
    const metadata = createMetadata(() => ({ count: 1n }));

    const result = await runActionAndCheckProperties(
      async () => {
        throw new Error('execution reverted: not owner');
      },
      metadata,
      createContext(),
      { expectFailure: true }
    );

    assert.strictEqual(result, undefined);
  });

  it('checks expected-failure error substrings and regexes', async () => {
    const metadata = createMetadata(() => ({ count: 1n }));

    await runActionAndCheckProperties(
      async () => {
        throw new Error('execution reverted: not owner');
      },
      metadata,
      createContext(),
      { expectFailure: true, expectedError: 'reverted' }
    );

    await runActionAndCheckProperties(
      async () => {
        throw new Error('custom error 0x1234');
      },
      metadata,
      createContext(),
      { expectFailure: true, expectedError: /0x[0-9a-f]+/i }
    );
  });

  it('fails when an expected-failure action fails with the wrong error', async () => {
    const metadata = createMetadata(() => ({ count: 1n }));

    await assert.rejects(
      () => runActionAndCheckProperties(
        async () => {
          throw new Error('execution reverted: not owner');
        },
        metadata,
        createContext(),
        { expectFailure: true, expectedError: 'insufficient funds' }
      ),
      /failed as expected, but with wrong error message/
    );
  });

  it('fails when an expected-failure action changes state', async () => {
    let count = 1n;
    const metadata = createMetadata(() => ({ count }));

    await assert.rejects(
      () => runActionAndCheckProperties(
        async () => {
          count = 2n;
          throw new Error('execution reverted after side effect');
        },
        metadata,
        createContext(),
        { expectFailure: true }
      ),
      /State changed after failed action/
    );
  });

  it('fails when an expected-failure action succeeds', async () => {
    const metadata = createMetadata(() => ({ count: 1n }));

    await assert.rejects(
      () => runActionAndCheckProperties(
        async () => 'success',
        metadata,
        createContext(),
        { expectFailure: true }
      ),
      /Expected action 'testAction' to fail, but it succeeded/
    );
  });
});
