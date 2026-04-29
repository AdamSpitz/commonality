# Big review before deploying to testnet

(Late April 2026.)

The goal here is to do a giant test run in which we review of all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

For now, let's also use the `interactive-assistant` skill; I want to watch this step-by-step and get a feel for how well the ecosystem of skills is working.

## How to use this file

This single file holds the **To Do**, **Continuity** notes, and accumulated **Findings** for the whole review. Each subtask LLM should:

  - Read the most recent few continuity notes before starting.
  - Append findings to "Findings" as it goes (organized by domain — see template).
  - Update the to-do checkbox + write a continuity note when finishing.

Each subtask LLM is also doing a `subtask-doer` role and should apply both lenses while reviewing:

  - **`intelligent-tester` lens:** does it actually work? Click through it. Are there blatantly broken pages, console errors, missing data, dead links, confusing flows?
  - **`cofounder` lens:** does this surface actually accomplish what it's *supposed* to accomplish for the project? What's missing entirely? What doesn't quite make sense given what we're trying to build?

Subtask LLMs should also use `interactive-assistant` so the human can watch step by step.
