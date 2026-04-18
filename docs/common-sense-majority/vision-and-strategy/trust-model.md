# The trust model: everything is choosable

All of the CSM mechanisms depend on people on both sides actually trusting the system. The trust model has three layers:

1. **Trustless infrastructure.** Money flows onchain (Ethereum, smart contracts). Nobody can capture the funding pipeline, cook the books, or freeze accounts. This layer genuinely requires no trust.
2. **Transparent subjectivity.** For the parts that are inherently subjective — evaluating whether content is noninflammatory, whether an implication holds, whether a nudge is fair — we use AI with open-source prompts. The AI posts its reasoning alongside its decisions, often including explicit pro and con arguments before reaching a conclusion. You can read the prompt, read the reasoning, and judge for yourself whether the output is biased. This doesn't eliminate the need for trust, but it makes the trust burden very low: you mainly need to trust that the prompt being run is the one that's published.
3. **Full configurability.** For anyone who doesn't trust even that, everything is choosable:

- **Attesters:** You choose which AI attesters you trust for evaluating noninflammatory content. Run your own if you prefer. The prompts are open-source.
- **Delegates:** You choose who handles your funding decisions. Revocable at any time.
- **Trust networks:** Your [trust graph](/docs/key-ideas/trust-networks.md) filters what you see. Projects and content are surfaced through people you (transitively) trust, not through some central editorial process.
- **Nudgers:** The bridge creator is a nudger you can choose to trust or ignore. Its suggestions appear in your feed only if you've opted in.

Nobody has to trust a central authority. Each person configures their own experience. The system discovers common ground *despite* people having different trusted sources — which is what makes the common ground genuine rather than an artifact of a particular attester's biases.
