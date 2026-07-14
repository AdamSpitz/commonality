# Decoupling the pieces

I'm wondering to what degree I can decouple the various pieces of this system, and make each thing stand on its own (while still being usable together to accomplish the vision of the project).

Stuff that's pretty nicely decoupled:
  - Statements are simply displayable-documents.
  - Our system should work okay with any ERC-1155 token; we provide a couple of basic ones like PremintingERC1155 and FreeERC1155 as an easy way to make something (and I imagine we'll have a UI for creating those once I get around to implementing the UI), but I don't think anything else in our system depends on it being those specific contracts. I think we can make an ERC1155PrimaryMarket and ERC1155SecondaryMarket for any ERC1155.
  - Project alignment attestations are done using the more-general AlignmentAttestations contract.

Stuff that's not as good as I'd like:
  - The DelegatableNotes contract is more coupled to the other stuff than I'd like. The only terminal actions it can do involve ERC1155PrimaryMarket and ERC1155SecondaryMarket. Maybe we could generalize that somehow (but gotta be careful not to leave it too open-ended: at the very least it needs to be possible for the initial creator of a note to know what kinds of actions can be done with it).

The goal of the decoupling is kinda twofold:
  - First, I kinda feel like these systems really *should* exist independently because they'd be useful for other purposes.
  - But also I kinda want to try to minimize the potential legal issues. A lot of the system (statements, alignment attestations) seems like it could be published completely independently and not have anything to do with tokens in particular. I'm hoping I can pare down the actual token contract code to something very generic and innocuous. See [specs/product/legal/](/specs/product/legal/README.md).
