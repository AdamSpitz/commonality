# LLMployees

If this project were being run as a startup company and I was the founder, I'd have employees - not just to implement the code (which is the main thing I've been using LLMs for), but also to test it and reassure me that the thing actually works. (Automated tests are fine and good and we've got lots of those, but the founder would still insist on humans actually using the software and thinking it through and so on.)

I don't want to hire any real human employees; I want to use LLMs instead. (Not necessarily running as long-running autonomous agents; I doubt that's necessary. I just mean: defining the "employees'" roles and using LLMs to carry out those roles.)

If you were the founder of this project, what kinds of roles would you want to see filled by intelligent employees, such that if they came to you and said "yup, the project works, it's doing what it's supposed to do", you'd be satisfied with that and you'd feel confident in going to the world and saying "come see this project, it's ready to be used"?

Vague thoughts:
  - For each of the eight [UI domains](specs/product/ui-domains.md):
    - Do we have conventional automated e2e tests that at least smoke-test all the functionality?
    - Do we have conventional automated unit tests that test each of the individual subcomponents more thoroughly?
    - (Perhaps: WITHOUT looking at what tests already exist, come up with a comprehensive test plan, THEN look at the actual tests and see whether we have them all.)
    - Does the site have documentation that explains what the site is for, how to get started, what APIs there are, etc.?
    - Is the site's landing page compelling and linked to all the important functionality and docs?
    - If the site has user-configurable settings, is it clear how to access those?
    - etc.
  - For each of the [AI services](specs/product/ai-assistance.md):
    - blah blah etc.
