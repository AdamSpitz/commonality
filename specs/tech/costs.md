# Costs

Breaking down the costs of the various components of this project:
  - blockchain transaction fees (Base)
  - blockchain node fees (Alchemy). On Base Sepolia these scale with block rate, not wall clock: the chain moved to 200ms blocks at block 48953176 (2026-10-22). Caught-up indexing fetches about one `eth_getBlockByNumber` per block, so that change is about a 10x CU increase versus 2s blocks. See `indexer/README.md` (RPC budget).
  - IPFS pinning fees (Pinata)
  - AI service hosting fees (Render)
  - AI service LLM fees (OpenRouter)
  - social-media API fees (X/YouTube/etc)
  - and my time spent on development

Is that all the categories? Have I missed any?

## What am I paying for?

  - If people run the blockchain transactions themselves and we don't subsidize, they'll be paying those tx costs directly, without our system needing to get involved. (But even that is something we probably want to subsidize, at least up to a limit per user or something?, for better UX.)

Apart from that, for now I'm paying for everything on that list out of pocket. The Alchemy app has a monthly CU cap (about $30 as of 2026-11). A 200ms Base Sepolia head can project the indexer alone past that cap even when workers are quiet.

## Where does our system take money in?

  - Did we ever get around to actually setting up the AI services with x402?
