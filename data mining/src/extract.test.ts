import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyText, extractFromText, stripHtml } from './extract.js'

describe('classifyText', () => {
  it('treats I-want lines as goals when that type is allowed', () => {
    assert.equal(
      classifyText('I want 285,000 homes in Toronto by 2031.', ['goal', 'plank']),
      'goal',
    )
  })

  it('treats should-claims as beliefs', () => {
    assert.equal(
      classifyText('Everyone should have a quality place to call home.', ['belief', 'plank']),
      'belief',
    )
  })
})

describe('extractFromText', () => {
  it('skips questionnaire stems and ALL-CAPS slogans', () => {
    const examples = extractFromText(
      [
        'How much do you think human activity contributes to climate change?',
        'END INFLATION AND MAKE AMERICA AFFORDABLE AGAIN',
        'I want Bowling Green to still feel like a safe place to raise a family in 2050.',
      ].join('\n'),
      { types: ['goal', 'plank'], sourceId: 'test', sourceName: 'test' },
    )
    assert.equal(examples.length, 1)
    assert.match(examples[0]!.text, /Bowling Green/)
  })
})

describe('stripHtml', () => {
  it('drops tags and scripts', () => {
    assert.equal(
      stripHtml('<p>Hello <script>alert(1)</script><b>world</b></p>'),
      'Hello world',
    )
  })
})
