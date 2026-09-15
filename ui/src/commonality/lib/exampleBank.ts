/**
 * Curated example content for the start-a-cause wizard.
 * "Regenerate" rotates / composes new suggestions from these pools so the UI
 * works without a network AI key. Context from other fields is used when present.
 */

export interface CauseExample {
  name: string
  audience: string
  statement: string
}

export const CAUSE_EXAMPLES: CauseExample[] = [
  {
    name: 'Neighbors for a safer street',
    audience: 'Residents of Ward 4 who want safer night walks',
    statement:
      'We believe our neighborhood should be safe to walk at night, and we will fund the lighting, watches, and civic pressure that make that real.',
  },
  {
    name: 'Clean creek collective',
    audience: 'Families and anglers who use the local watershed',
    statement:
      'We will keep our creek clean enough for kids to play and fish to return — starting with cleanup days, pollution reports, and lasting bank restoration.',
  },
  {
    name: 'After-school makers',
    audience: 'Parents and teachers of middle-schoolers without free STEM clubs',
    statement:
      'Every middle-schooler nearby should have a free place to build, code, and invent after school — and we will staff it, equip it, and keep it open.',
  },
  {
    name: 'Bridge the divide media',
    audience: 'People tired of contempt-driven political news',
    statement:
      'We will fund reporting and videos that explain hard issues without contempt, so neighbors who disagree can still hear each other.',
  },
  {
    name: 'Library hours for all',
    audience: 'Workers who only get free time after 6pm',
    statement:
      'Our public library should stay open evenings so working people can learn, job-search, and borrow books — we will fund the hours and the staff to match.',
  },
  {
    name: 'Heat-safe porches',
    audience: 'Older adults in unshaded apartment blocks',
    statement:
      'No elder on our block should face extreme heat alone. We will fund cooling kits, porch shade, and check-in volunteers before the next heat wave.',
  },
  {
    name: 'Playground rebuild crew',
    audience: 'Parents and kids using the worn downtown park',
    statement:
      'The downtown playground will be safe, inclusive, and fun again. We will raise the funds, pick equipment kids can use, and open it together.',
  },
  {
    name: 'Farm-to-pantry network',
    audience: 'Local growers and food-insecure households',
    statement:
      'Surplus from nearby farms should feed nearby tables. We will coordinate pickups, cold storage, and weekly pantry drops with transparent receipts.',
  },
]

const nameSeeds = [
  'Neighbors for a safer street',
  'Clean creek collective',
  'After-school makers',
  'Bridge the divide media',
  'Library hours for all',
  'Heat-safe porches',
  'Playground rebuild crew',
  'Farm-to-pantry network',
  'Quiet majority project',
  'Main Street murals',
  'Bike lane advocates',
  'Senior tech helpers',
]

const audienceSeeds = [
  'Residents who walk home after dark',
  'Families who use the local park every week',
  'Parents of kids without free after-school options',
  'People who want media that does not feed contempt',
  'Workers who only have free time in the evening',
  'Older adults in multi-unit housing',
  'Neighbors who care about the watershed',
  'Local growers and pantry volunteers',
  'Commuters who want safer bike routes',
  'Small businesses on the main street corridor',
]

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function pick<T>(items: T[], salt: number): T {
  return items[salt % items.length]!
}

function titleCaseFromWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Next example for a field, optionally grounded in other wizard fields. */
export function regenerateField(
  field: 'name' | 'audience' | 'statement',
  context: { name: string; audience: string; statement: string },
  attempt = 0,
): string {
  const seed = hashSeed(`${field}|${context.name}|${context.audience}|${context.statement}|${attempt}|${Date.now()}`)

  if (field === 'name') {
    if (context.audience.trim()) {
      const topic = context.audience.trim().split(/\s+/).slice(0, 4).join(' ')
      const prefixes = ['Neighbors for', 'Coalition for', 'Friends of', 'Action for', 'Project']
      return `${pick(prefixes, seed)} ${titleCaseFromWords(topic)}`.slice(0, 72)
    }
    return pick(nameSeeds, seed)
  }

  if (field === 'audience') {
    if (context.name.trim()) {
      const cause = context.name.trim()
      const templates = [
        `People who care about ${cause.toLowerCase()}`,
        `Neighbors ready to back ${cause}`,
        `Anyone who wants ${cause.toLowerCase()} to succeed`,
        `Local volunteers drawn to ${cause}`,
      ]
      return pick(templates, seed)
    }
    return pick(audienceSeeds, seed)
  }

  // statement
  const cause = context.name.trim() || pick(nameSeeds, seed)
  const who = context.audience.trim() || pick(audienceSeeds, seed + 3)
  const templates = [
    `We believe ${who.toLowerCase()} deserve real progress on this. With ${cause}, we will organize people, raise support, and show public results.`,
    `${cause}: a clear public commitment. We will rally ${who.toLowerCase()}, fund what works, and keep score in the open.`,
    `We stand for practical change that ${who.toLowerCase()} can feel. Through ${cause}, we will enroll supporters and deliver visible wins.`,
    `This is our public pledge: ${cause} will bring ${who.toLowerCase()} together to fund solutions and hold the line until they land.`,
  ]
  return pick(templates, seed)
}

export function initialExampleIndex(): number {
  return Math.floor(Math.random() * CAUSE_EXAMPLES.length)
}

export function exampleAt(index: number): CauseExample {
  return CAUSE_EXAMPLES[((index % CAUSE_EXAMPLES.length) + CAUSE_EXAMPLES.length) % CAUSE_EXAMPLES.length]!
}
