# What we've been working on lately

Main thing I want to work on next:
  - (DONE) Fix the bug in the dev.sh stuff - Fixed contract API mismatches:
    - attestImplication: Added missing `explanationCid` parameter (3rd param)
    - attestProjectAlignment: Changed `projectAlignment` to `alignmentAttestations` and added missing `topicStatementId` parameter

Other big things to do soon:
  - Honestly, it kinda seems like we might be ready to deploy the conceptspace stuff? (We don't have UIs yet for the other major subsystems.) But I'm uneasy, because this whole project was built mostly by LLMs, and I don't quite feel confident that I understand what's in it or whether it works or not.
    - Can I try out conceptspace manually? e.g. Start up docker-compose locally, maybe do some fake-data generation to populate the system with a bunch of data, and then look at the UI through my web browser?
  - ?

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
