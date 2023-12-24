export function getRomAlignedGameLength(rom: Uint8Array): number {
  return rom.length & ~0xf;
}

export function getRomHeader(rom: Uint8Array): Uint8Array {
  return rom.slice(0, 0xc0);
}

export function getRomGame(rom: Uint8Array): Uint8Array {
  return rom.slice(0xc0, getRomAlignedGameLength(rom));
}
