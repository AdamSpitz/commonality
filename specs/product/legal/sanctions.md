# Sanctions / terrorist financing / "the cause is Bad"

Original worry, from the early notes: "Here are some projects that have been attested to be aligned with this cause." What if the cause is Bad? Now our site is helping fund Bad stuff.

That worry has a concrete legal edge: sanctions liability is strict-liability-ish and applies to facilitating value transfer to listed persons. Canadian sanctions law (SEMA, the Criminal Code terrorist-financing provisions) applies to Adam personally. The on-ramp screens its side, but our UI displaying and routing donations to arbitrary projects is our exposure.

**What to do:** wallet-screening (Chainalysis/TRM-style API) at the UI layer before displaying or facilitating contributions to a project address; a documented takedown/delisting process for the sites we operate; and a report-abuse mechanism. These are cheap and they're also what turns "our site is helping fund Bad stuff" into "we had reasonable procedures and acted on notice."

Note: this is one of the risks the community-run-UI model genuinely helps with — whoever runs a UI owns the display-and-routing exposure and has the moderation tools to manage it. See [operator-posture.md](operator-posture.md).
