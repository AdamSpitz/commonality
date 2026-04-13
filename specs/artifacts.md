# Artifacts

The system is divided into several independent subsystems, each with its own domain, smart contracts, and SDK query/fold logic. They all share a single thin event cache indexer.

The four foundational subsystems (Concept Space, Pubstarter, Marketplace, Delegation) are independent of each other. The Funding Portal subsystem's SDK orchestrates cross-cutting queries by calling the other subsystems' SDK query functions.

See each subsystem's directory for details:
  - [subsystems/conceptspace/](subsystems/conceptspace/README.md)
  - [subsystems/pubstarter/](subsystems/pubstarter/README.md) (includes secondary market/marketplace)
  - [subsystems/delegation/](subsystems/delegation/README.md)
  - [subsystems/fundingportals/](subsystems/fundingportals/README.md)

## Services

There are various services deployed separately:
  - implication attester
  - implication finder (explores and submits potential implications to the attester)
  - content attesters
  - content finders
  - platform API service
