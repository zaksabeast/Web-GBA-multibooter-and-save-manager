export class Crc {
  private crc: number;
  private digest_step: number;
  private mask: number;

  constructor(hh: number, rr: number) {
    this.digest_step = this.getDigestStep(hh, rr);
    this.mask = 0xc37b;
    this.crc = 0xc387;
  }

  private getDigestStep(finalA: number, finalB: number): number {
    return 0xffff0000 | ((finalB & 0xffff) << 8) | (finalA & 0xffff);
  }

  step(value: number): void {
    for (let i = 0; i < 32; i++) {
      const bit = (this.crc ^ value) & 1;

      this.crc = this.crc >> 1;
      if (bit !== 0) {
        this.crc = this.crc ^ this.mask;
      }

      value = value >> 1;
    }
  }

  digest(): number {
    this.step(this.digest_step);
    return this.crc & 0xffff;
  }
}

export class EncryptState {
  private seed: number;
  private mask: number;

  constructor(seed: number) {
    this.seed = seed;
    this.mask = 0x43202f2f;
  }

  step(value: number, i: number): number {
    this.seed = Number((BigInt(this.seed) * 0x6f646573n + 1n) & 0xffffffffn);
    return this.seed ^ value ^ (0xfe000000 - i) ^ this.mask;
  }
}
