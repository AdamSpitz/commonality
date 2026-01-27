# What we've been working on lately

We're in the middle of a couple of big things:
  - Writing the integration-tests. (Much is done; I'm not sure what exactly is left to implement.)
  - Writing the UI. (Not much done, and not really tested, even manually; I don't trust the UI at all yet.)
  - Decoupling and generalizing some pieces of the system. See [specs/decoupling.md](specs/decoupling.md).

Other big things to do soon:
  - Generative testing. There's an early attempt at fake-data generation in hardhat/fake-data-generation, but I don't know how well it works or how complete it is; it'd be reasonable to blow it away and start over.
    - Once we have this, it'd be cool to generate a bunch of user actions and run them through the sdk (using the same setup we're currently using for the integration-tests), just as a smoke test to see if anything catches fire.
  - Implement the Implication Attester AI service.
  - Set up deployment for testnet and mainnet.

Also, here are some meta-level tasks that would be good to do before we do any more work on the actual code base:
  - Make sure the project has good documentation, all reachable transitively from this top-level README.md file.
  - Flesh out specs/reviews.md. I'd like to have a good checklist for doing overall reviews of the code base.

## Miscellaneous TODO.md files

- [ui/TODO.md](ui/TODO.md)
