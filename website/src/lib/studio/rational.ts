/**
 * Exact rational arithmetic on BigInt (always normalised: gcd(num, den) = 1, den > 0).
 * Used for input parsing, exact objective verification, and the AutoCut port.
 */
export class Q {
  readonly num: bigint;
  readonly den: bigint;

  private constructor(num: bigint, den: bigint) {
    this.num = num;
    this.den = den;
  }

  static of(num: bigint | number, den: bigint | number = 1n): Q {
    let p = BigInt(num);
    let q = BigInt(den);
    if (q === 0n) throw new RangeError("division by zero");
    if (q < 0n) {
      p = -p;
      q = -q;
    }
    const g = gcd(p < 0n ? -p : p, q);
    return new Q(g === 0n ? 0n : p / g, g === 0n ? 1n : q / g);
  }

  static readonly ZERO = Q.of(0n);
  static readonly ONE = Q.of(1n);

  add(o: Q): Q {
    return Q.of(this.num * o.den + o.num * this.den, this.den * o.den);
  }
  sub(o: Q): Q {
    return Q.of(this.num * o.den - o.num * this.den, this.den * o.den);
  }
  mul(o: Q): Q {
    return Q.of(this.num * o.num, this.den * o.den);
  }
  div(o: Q): Q {
    if (o.num === 0n) throw new RangeError("division by zero");
    return Q.of(this.num * o.den, this.den * o.num);
  }
  neg(): Q {
    return new Q(-this.num, this.den);
  }
  abs(): Q {
    return this.num < 0n ? this.neg() : this;
  }
  cmp(o: Q): number {
    const l = this.num * o.den;
    const r = o.num * this.den;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  eq(o: Q): boolean {
    return this.num === o.num && this.den === o.den;
  }
  isZero(): boolean {
    return this.num === 0n;
  }
  sign(): number {
    return this.num < 0n ? -1 : this.num > 0n ? 1 : 0;
  }
  /** ⌊x⌋ for any sign. */
  floor(): bigint {
    const q = this.num / this.den;
    return this.num < 0n && q * this.den !== this.num ? q - 1n : q;
  }
  toNumber(): number {
    return Number(this.num) / Number(this.den);
  }
  /** Same format as Lean's `toString` on ℚ: "3", "-7/4". */
  toString(): string {
    return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`;
  }
  /** Decimal rendering with up to `digits` fractional digits (exact when the expansion terminates). */
  toDecimal(digits = 6): string {
    if (this.den === 1n) return this.num.toString();
    const neg = this.num < 0n;
    const a = neg ? -this.num : this.num;
    const ip = a / this.den;
    let r = a % this.den;
    let frac = "";
    for (let i = 0; i < digits && r !== 0n; i++) {
      r *= 10n;
      frac += (r / this.den).toString();
      r %= this.den;
    }
    const s = `${ip}${frac ? "." + frac : ""}${r !== 0n ? "…" : ""}`;
    return neg ? "-" + s : s;
  }
}

export function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: bigint, b: bigint): bigint {
  return (a / gcd(a, b)) * b;
}

const NUM_RE = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$|^([+-]?)\.(\d+)(?:[eE]([+-]?\d+))?$/;
const FRAC_RE = /^([+-]?\d+)\s*\/\s*(\d+)$/;

/** Maximum number of significant digits accepted for one entry (resource guard). */
export const MAX_DIGITS = 30;

/**
 * Parse an exact rational from a decimal ("-1.25", "3e-2", ".5") or fraction ("7/4") string.
 * Returns null when the text is not a finite number in one of these forms.
 */
export function parseQ(text: string): Q | null {
  const s = text.trim();
  if (s.length === 0 || s.length > 64) return null;
  const f = FRAC_RE.exec(s);
  if (f) {
    if (f[1].replace(/^[+-]/, "").length > MAX_DIGITS || f[2].length > MAX_DIGITS) return null;
    const den = BigInt(f[2]);
    if (den === 0n) return null;
    return Q.of(BigInt(f[1]), den);
  }
  const m = NUM_RE.exec(s);
  if (!m) return null;
  const sign = (m[1] ?? m[5] ?? "") === "-" ? -1n : 1n;
  const intPart = m[2] ?? "0";
  const fracPart = m[3] ?? m[6] ?? "";
  const expPart = m[4] ?? m[7];
  if ((intPart + fracPart).replace(/^0+/, "").length > MAX_DIGITS) return null;
  const exp = expPart ? Number(expPart) : 0;
  if (!Number.isInteger(exp) || Math.abs(exp) > 30) return null;
  let num = BigInt(intPart + fracPart) * sign;
  let den = 10n ** BigInt(fracPart.length);
  if (exp > 0) num *= 10n ** BigInt(exp);
  else if (exp < 0) den *= 10n ** BigInt(-exp);
  return Q.of(num, den);
}
