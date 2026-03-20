# Old notes on how I used AI to build the initial phases of this project

The intention here is to leverage AI to help build this project quickly.

Motivation: I'm doing this to try to address problems that I've had when trying to build projects with AI assistance in the past. I want to see if I can find a sweet spot in between "progress is very slow because I'm insisting on grokking the actual code" and "the AI is producing tons of code but it's kinda messy and broken and doesn't really do what I want".

Here are some techniques that I think I'm finding useful.

## Rambling, then consolidating

I've had some success doing this little dance:

  - Writing (in this file) vague hand-wavy thoughts along the lines of "we should flesh out such-and-such in more detail; we'll ask an AI to do that and put the results in arglebargle.md."
  - Then asking the AI, "Please read specs/README.md and anything else relevant, then write up arglebargle.md for me."
  - And *then* immediately asking the AI, "Can you read through specs/README.md, then read through arglebargle.md, and then if there's anything in the latter that isn't obvious from the former, *concisely* add it to the former? (The point is that I'd like to delete the latter if I can; I just want to make sure that all the stuff in there will be obvious to a future AI implementer.)"

Doing it in two separate steps like that (first generate a big long verbose file with whatever the AI can think of, then analyze it and retain a concise summary in the spec) lets me keep this top-level spec as the single official "source code" of the project, while leveraging AI to help me think through various aspects of the project and flesh out the spec.

(It's not even that weird, now that I think about it. It's a perfectly normal thing that I do in my own thinking too: first I let myself ramble a bunch and write up whatever thoughts I have, and then I look at that and say "okay but are there *actually* any new insights in there?" The long-winded rambling isn't actually useful to keep around.)

## Multi-level specs

When we do eventually reach the point of wanting to build the actual code, I'm not sure whether we'll be able to just do it in one fell swoop ("please read specs/README.md and then implement the entire thing") or whether it'll make more sense to ask it to build a piece at a time, or maybe feed this top-level spec through an AI to generate the medium-detail specs *again* and then feed those mid-level specs through an AI to generate actual runnable code, or whatever. We can experiment.

Useful question to ask the AI occasionally: "Please read specs/README.md and anything else relevant, then let me know whether you think you could write up mid-level specs for each subcomponent, in such a way that AIs reading those mid-level specs could build their subcomponent without needing to understand the entire project. Are there clear integration points (like interfaces and data formats and event schemas and so on), so that rebuilding one subcomponent won't unnecessarily require rebuilding other subcomponents?"

If you're an AI who's reading this top-level spec and generating a mid-level spec:
  - Make sure to include concrete examples and edge cases, not just abstract requirements (especially when that will help to clarify things for an AI that doesn't have as much understanding of the overall wider system).
  - Also make sure to include concrete code examples for integration points, like APIs intended to be called by other modules (because when we regenerate one module, we don't want to need to regenerate all the other modules that call it).
  - Put in a comment mentioning that the file is AI-generated.

At the end of the day, I don't want to be afraid to blow away anything that's AI-generated (or at least anything that I haven't grokked) and regenerate it.


## Generating, then blessing

To some extent I would actually be happy to ask AI to generate some useful mid-level artifacts, so that I can check them for myself and make sure they make sense to me and then "bless" them by considering them part of the top-level spec (i.e. *not* blow them away in the future, but treat them as "source code").

That's roughly what I'm doing with the smart contracts - they're simple enough and important enough that I feel like it's better for me to make sure that I grok them and then include them in the "source code".

But also this might be useful with things other than code artifacts. e.g. It might be useful if AI could write up English descriptions of some things and then I can bless them.
