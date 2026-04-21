# Anti-Evil-Nudger Immune System

*This is a sketch spec — a rough design note, not a complete implementation plan.*

## The problem

Anyone can run a nudger. That's a feature, not a bug — it means users and communities can run nudgers that reflect their own values, and no single actor controls the statement-suggestion pipeline. But it also means a bad actor could run a nudger that tries to manipulate users: surface politically convenient statements, push a hidden agenda, create a feedback loop toward extremism, etc.

The system's first line of defense is already in place: users configure which nudgers they trust, and each nudger is identified by an Ethereum address. You can't trick someone into trusting your nudger without their consent.

But that assumes users can evaluate nudgers they're considering trusting. Right now there's no good way to do that. The immune system addresses this gap.

## The key insight

The nudger infrastructure already solves the *nonrepudiability* problem: every nudge batch is published to IPFS and the CID is recorded on-chain via the `NudgePublications` contract. A nudger can revoke bad suggestions (that's intentional — nudgers should be able to correct mistakes), but revoking a suggestion doesn't erase the fact that the suggestion was made; the event log is permanent.

So the receipts already exist. The immune system is just a service that reads the receipts, evaluates them, and publishes its conclusions.

## What it is

An immune system service is an off-chain monitoring service that:
1. Subscribes to `NudgesPublished` events for one or more nudger addresses it wants to monitor.
2. Fetches and evaluates the published batches — assessing whether the nudges look manipulative, biased, or harmful by whatever criteria the immune system operator considers important.
3. Publishes its assessments on-chain (same `NudgePublications` contract, same trust/discovery infrastructure) as a new publication kind.
4. Optionally suggests alternative nudgers when it flags one as problematic.

## The publication kind: `nudger-assessment`

```typescript
type NudgeAssessmentEntry = {
  nudgerAddress: string;           // The nudger being assessed
  publicationCid: string;          // The specific publication being critiqued (or null for overall)
  assessment: 'concern' | 'warning' | 'flagged';
  reasoning: string;               // Human-readable explanation, shown to user
  evidence: string[];              // Specific (target, suggested) pairs or other receipts
  suggestedAlternative?: string;   // Ethereum address of a recommended nudger instead
};

type NudgerAssessmentPublication = {
  kind: 'nudger-assessment';
  schemaVersion: 1;
  nudger: string;                  // The immune-system service's own address
  publishedAt: number;
  assessments: NudgeAssessmentEntry[];
};
```

The immune system service *is itself a nudger* (it publishes via `NudgePublications`, uses the same trust/discovery model). Users who want to subscribe to its assessments add it to their trusted nudgers in Settings — exactly the same flow as any other nudger.

This is deliberately consistent with the rest of the system: everything is subjective, and it's up to each user which immune system they trust. Commonality might run a default one; other communities might run their own.

## How users see it

In the Settings UI, the "Trusted Nudgers" section shows a nudger's name, description, and `sourceType` from its `.well-known/nudger.json`. For a nudger-assessment service, `sourceType: "nudger-assessment"` lets the UI display it differently — e.g., in a separate "Watchdog Services" section with a brief explanation.

When a nudger assessment service publishes a `concern` or `warning` about a nudger the user has trusted, the UI should surface it somewhere visible — probably near the nudger settings, or in a notification. The user can then review the evidence and decide whether to keep trusting the nudger or not.

## Evaluation methodology

What counts as a "bad" nudge? That's up to the immune system operator. Some ideas:
- **Statistical signals**: does the nudger consistently push statements with a particular political valence? Does it avoid suggesting statements that would give a balanced view?
- **Contradiction patterns**: does the nudger suggest pairs (A, B) where A and B are mutually exclusive, hoping users don't notice?
- **Gradient bias**: does the nudger systematically suggest statements that are more extreme versions of what users already believe, gradually shifting them?
- **Adversarial evaluation**: the "pro argues with con, then judge decides" idea from TODO.md fits well here. For a flagged nudge batch, the immune system could run:
  1. An AI arguing *the nudge is legitimate*
  2. An AI arguing *the nudge is manipulative*
  3. A judge AI reading both arguments and deciding
  ... then publish the transcript as part of the evidence, so users can see the reasoning.

The adversarial approach is probably too expensive to apply to every nudge, but a good use for cases where a simpler heuristic already flagged something as suspicious.

## Relationship to revocations

A nudger revoking a bad suggestion is *good behavior* — that's what the revocation mechanism is for. An immune system should probably treat a revocation as a positive signal (the nudger noticed the problem and corrected it), not negative. The concern is nudgers that consistently publish bad suggestions and *don't* revoke them, or nudgers that publish suggestions the operator judges harmful even if the nudger doesn't revoke them.

## What this doesn't solve

This system doesn't prevent manipulation. It makes manipulation *transparent* — which is probably the best we can do in a system built around subjective trust. A sufficiently sophisticated bad actor could game assessments; a sufficiently lazy user might ignore them. The goal is to make it easy for users who *want* to know to find out, and to make it costly for bad actors by creating a public paper trail.

It also doesn't help new users who haven't configured any nudgers yet — they're not seeing nudges from untrusted sources in the first place.

## Build priority

Low. The critical path for making nudges work at all is:
1. SDK: fetch + fold typed nudger publications from the indexer
2. UI: display nudge-batch suggestions

The immune system is only useful once there are nudgers running and enough user adoption that manipulation is a plausible concern. It's worth designing now so the architecture accommodates it, but there's no need to build it until the nudger ecosystem has real traction.

For now, the relevant architectural decision is already in place: the `NudgePublications` contract creates a permanent public log, and the trust/discovery model can accommodate a `nudger-assessment` publication kind without any changes to the infrastructure.
