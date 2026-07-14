# Sanctions / terrorist financing / "the cause is Bad"

Original worry, from the early notes: "Here are some projects that have been attested to be aligned with this cause." What if the cause is Bad? Now our site is helping fund Bad stuff.

That worry has a concrete legal edge: sanctions liability is strict-liability-ish and applies to facilitating value transfer to listed persons. Canadian sanctions law (SEMA, the Criminal Code terrorist-financing provisions) applies to Adam personally. The on-ramp screens its side, but our UI displaying and routing donations to arbitrary projects is our exposure.

**What to do:** wallet-screening (Chainalysis/TRM-style API) at the UI layer before displaying or facilitating contributions to a project address; a documented takedown/delisting process for the sites we operate; and a report-abuse mechanism. Configure the screening/reporting posture for sanctions **and** broader platform-abuse indicators (mixer exposure, fraud-cluster proximity, self-funded fake-project laundering patterns, stolen-card cash-out complaints), not sanctions lists only. These are cheap and they're also what turns "our site is helping fund Bad stuff" into "we had reasonable procedures and acted on notice."

On whether takedowns are even architecturally possible (they are — no rearchitecting needed, and the *inability* to take things down on-chain is a feature to preserve, not a gap): see [Takedown ability, by layer](operator-posture.md#takedown-ability-by-layer-jul-2026). The one takedown-shaped item needing real design work is the unclaimed-channel escrow (screening at channel-creation/display time, since a trustless verifier removes the human choke point at release).

Note: this is one of the risks the community-run-UI model genuinely helps with — whoever runs a UI owns the display-and-routing exposure and has the moderation tools to manage it. See [operator-posture.md](operator-posture.md).
