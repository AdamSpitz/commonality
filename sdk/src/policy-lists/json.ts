import { sha256 } from 'viem';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export class StrictJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StrictJsonError';
  }
}

const JSON_WHITESPACE = /[\t\n\r ]/;

class StrictJsonParser {
  private position = 0;

  constructor(private readonly source: string) {}

  parse(): JsonValue {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.position !== this.source.length) this.fail('Trailing data');
    return value;
  }

  private parseValue(): JsonValue {
    const character = this.source[this.position];
    if (character === '{') return this.parseObject();
    if (character === '[') return this.parseArray();
    if (character === '"') return this.parseString();
    if (character === '-' || (character !== undefined && character >= '0' && character <= '9')) {
      return this.parseNumber();
    }
    if (this.consumeLiteral('true')) return true;
    if (this.consumeLiteral('false')) return false;
    if (this.consumeLiteral('null')) return null;
    this.fail('Expected a JSON value');
  }

  private parseObject(): { [key: string]: JsonValue } {
    this.position++;
    const result: { [key: string]: JsonValue } = {};
    const keys = new Set<string>();
    this.skipWhitespace();
    if (this.source[this.position] === '}') {
      this.position++;
      return result;
    }
    while (true) {
      if (this.source[this.position] !== '"') this.fail('Expected an object key');
      const key = this.parseString();
      if (keys.has(key)) this.fail(`Duplicate object key ${JSON.stringify(key)}`);
      keys.add(key);
      this.skipWhitespace();
      if (this.source[this.position] !== ':') this.fail('Expected a colon after object key');
      this.position++;
      this.skipWhitespace();
      Object.defineProperty(result, key, {
        value: this.parseValue(),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      this.skipWhitespace();
      const separator = this.source[this.position++];
      if (separator === '}') return result;
      if (separator !== ',') this.fail('Expected a comma or closing brace');
      this.skipWhitespace();
    }
  }

  private parseArray(): JsonValue[] {
    this.position++;
    const result: JsonValue[] = [];
    this.skipWhitespace();
    if (this.source[this.position] === ']') {
      this.position++;
      return result;
    }
    while (true) {
      result.push(this.parseValue());
      this.skipWhitespace();
      const separator = this.source[this.position++];
      if (separator === ']') return result;
      if (separator !== ',') this.fail('Expected a comma or closing bracket');
      this.skipWhitespace();
    }
  }

  private parseString(): string {
    const start = this.position;
    this.position++;
    while (this.position < this.source.length) {
      const character = this.source[this.position++];
      if (character === '"') {
        const encoded = this.source.slice(start, this.position);
        let value: string;
        try {
          value = JSON.parse(encoded) as string;
        } catch {
          this.fail('Invalid JSON string');
        }
        if (/\p{Surrogate}/u.test(value)) this.fail('JSON strings must contain valid Unicode');
        return value;
      }
      if (character === '\\') this.position++;
      else if (character !== undefined && character.charCodeAt(0) < 0x20) this.fail('Unescaped control character');
    }
    this.fail('Unterminated JSON string');
  }

  private parseNumber(): number {
    const remainder = this.source.slice(this.position);
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(remainder);
    if (!match) this.fail('Invalid JSON number');
    this.position += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) this.fail('JSON number is outside the finite IEEE-754 range');
    return value;
  }

  private consumeLiteral(literal: string): boolean {
    if (!this.source.startsWith(literal, this.position)) return false;
    this.position += literal.length;
    return true;
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length && JSON_WHITESPACE.test(this.source[this.position]!)) {
      this.position++;
    }
  }

  private fail(message: string): never {
    throw new StrictJsonError(`${message} at character ${this.position}`);
  }
}

/** Parse UTF-8 JSON without permissive duplicate-key or trailing-data behavior. */
export function parseStrictJson(bytes: Uint8Array): JsonValue {
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (error) {
    throw new StrictJsonError(`Input is not valid UTF-8: ${error instanceof Error ? error.message : String(error)}`);
  }
  return new StrictJsonParser(source).parse();
}

function canonicalize(value: JsonValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new StrictJsonError('Canonical JSON numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key]!)}`);
  return `{${entries.join(',')}}`;
}

/** Serialize a JSON value using RFC 8785 JSON Canonicalization Scheme. */
export function canonicalizeJson(value: JsonValue): string {
  return canonicalize(value);
}

export function canonicalJsonBytes(value: JsonValue): Uint8Array {
  return new TextEncoder().encode(canonicalizeJson(value));
}

/** Return the lowercase 0x-prefixed sha256 of an RFC 8785 canonical JSON value. */
export function canonicalJsonSha256(value: JsonValue): `0x${string}` {
  return sha256(canonicalJsonBytes(value));
}
