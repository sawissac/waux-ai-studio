/**
 * Synthetic-data generation for the Tool Builder's Identity node — pure,
 * framework-agnostic, built on faker.js.
 *
 * The author writes a JSON `template` whose string values may embed `@token`
 * modifiers (e.g. `"@firstName"`, `"@email"`, or a mixed `"@firstName @lastName"`).
 * {@link generateIdentities} parses the template once, seeds faker
 * deterministically, then materialises `count` records — replacing every
 * recognised `@token` with a fresh faker value per record. Generation is stable
 * for a given `(template, count, seed)`, so the live preview never flickers and
 * the same record set is reproducible.
 *
 * Uses the single-locale faker entry (`/locale/en`) to keep the bundle small.
 */
import { faker } from "@faker-js/faker/locale/en";

import { IDENTITY_MAX_COUNT } from "@/constants/tool-builder";
import type { IdentityNode } from "@/types/tool-builder";

/**
 * Map of `@token` (lower-cased, without the leading `@`) → faker generator.
 *
 * Keep the keys in lockstep with `FAKER_MODIFIERS` in
 * `@/constants/tool-builder` (that catalog drives the editor's reference list
 * and the docs; this map does the actual generating). Dates are returned as ISO
 * strings so they survive JSON serialisation.
 */
const GENERATORS: Record<string, () => unknown> = {
  // Person
  firstname: () => faker.person.firstName(),
  lastname: () => faker.person.lastName(),
  fullname: () => faker.person.fullName(),
  sex: () => faker.person.sex(),
  jobtitle: () => faker.person.jobTitle(),
  bio: () => faker.person.bio(),
  avatar: () => faker.image.avatar(),
  phone: () => faker.phone.number(),

  // Internet
  username: () => faker.internet.username(),
  email: () => faker.internet.email(),
  password: () => faker.internet.password(),
  url: () => faker.internet.url(),
  ip: () => faker.internet.ip(),
  ipv6: () => faker.internet.ipv6(),
  mac: () => faker.internet.mac(),
  domainname: () => faker.internet.domainName(),
  useragent: () => faker.internet.userAgent(),
  emoji: () => faker.internet.emoji(),

  // Location
  city: () => faker.location.city(),
  country: () => faker.location.country(),
  countrycode: () => faker.location.countryCode(),
  state: () => faker.location.state(),
  street: () => faker.location.streetAddress(),
  zipcode: () => faker.location.zipCode(),
  latitude: () => faker.location.latitude(),
  longitude: () => faker.location.longitude(),
  timezone: () => faker.location.timeZone(),

  // Company & commerce
  company: () => faker.company.name(),
  catchphrase: () => faker.company.catchPhrase(),
  product: () => faker.commerce.productName(),
  productdescription: () => faker.commerce.productDescription(),
  price: () => faker.commerce.price(),

  // Finance
  currency: () => faker.finance.currencyCode(),
  creditcard: () => faker.finance.creditCardNumber(),
  iban: () => faker.finance.iban(),
  accountnumber: () => faker.finance.accountNumber(),
  amount: () => faker.finance.amount(),

  // Numbers, ids & types
  uuid: () => faker.string.uuid(),
  int: () => faker.number.int({ min: 1, max: 1000 }),
  float: () => faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
  boolean: () => faker.datatype.boolean(),
  color: () => faker.color.rgb(),

  // Dates (ISO strings)
  pastdate: () => faker.date.past().toISOString(),
  futuredate: () => faker.date.future().toISOString(),
  recentdate: () => faker.date.recent().toISOString(),
  birthdate: () => faker.date.birthdate().toISOString(),

  // Lorem
  word: () => faker.lorem.word(),
  words: () => faker.lorem.words(),
  sentence: () => faker.lorem.sentence(),
  paragraph: () => faker.lorem.paragraph(),
  slug: () => faker.lorem.slug(),
};

/** Matches a token anywhere in a string (e.g. `@firstName`). */
const TOKEN_RE = /@([a-zA-Z][a-zA-Z0-9_]*)/g;
/** Matches a string that is exactly one token and nothing else. */
const EXACT_TOKEN_RE = /^@([a-zA-Z][a-zA-Z0-9_]*)$/;

/** Resolve a single token name to a generated value, or `undefined` if unknown. */
function runToken(name: string): unknown {
  const gen = GENERATORS[name.toLowerCase()];
  return gen ? gen() : undefined;
}

/**
 * Resolve all `@token` modifiers in a string value. A string that is exactly
 * one known token returns the generated value with its native type preserved
 * (so `"@int"` yields a number, not `"42"`); otherwise every known token is
 * interpolated as text and unknown tokens are left verbatim.
 */
function resolveString(value: string): unknown {
  const exact = value.match(EXACT_TOKEN_RE);
  if (exact) {
    const result = runToken(exact[1]);
    // Unknown token → keep the literal so the typo is visible to the author.
    return result === undefined ? value : result;
  }
  return value.replace(TOKEN_RE, (match, name: string) => {
    const result = runToken(name);
    return result === undefined ? match : String(result);
  });
}

/** Deep-resolve every string in a parsed template node, per record. */
function resolveTemplate(node: unknown): unknown {
  if (typeof node === "string") {
    return resolveString(node);
  }
  if (Array.isArray(node)) {
    return node.map(resolveTemplate);
  }
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      out[key] = resolveTemplate(val);
    }
    return out;
  }
  // Numbers, booleans, null — pass through unchanged.
  return node;
}

/**
 * Generate the Identity node's record array from its config.
 *
 * @param node - The Identity node (template, count, seed).
 * @returns An array of `count` generated records. Returns `[]` when the
 *   template is not valid JSON or `count` is non-positive. Deterministic for a
 *   given `(template, count, seed)`.
 */
export function generateIdentities(node: IdentityNode): unknown[] {
  const count = Math.max(
    0,
    Math.min(Math.floor(node.count) || 0, IDENTITY_MAX_COUNT),
  );
  if (count === 0) {
    return [];
  }
  let template: unknown;
  try {
    template = JSON.parse(node.template);
  } catch {
    return [];
  }
  // Seed once so the whole batch is reproducible for this config.
  faker.seed(node.seed || 0);
  const records: unknown[] = [];
  for (let i = 0; i < count; i++) {
    records.push(resolveTemplate(template));
  }
  return records;
}
