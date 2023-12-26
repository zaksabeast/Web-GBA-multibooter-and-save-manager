import { getRomName } from "./romName";
export { getRomName } from "./romName";

export function getRomAlignedGameLength(rom: Uint8Array): number {
  return rom.length & ~0xf;
}

export function getRomHeader(rom: Uint8Array): Uint8Array {
  return rom.slice(0, 0xc0);
}

export function getRomGame(rom: Uint8Array): Uint8Array {
  return rom.slice(0xc0, getRomAlignedGameLength(rom));
}

export type RomHeader = {
  gameName: string;
  gameId: string;
  companyId: string;
};

export function parseHeader(header: Uint8Array): RomHeader {
  const gameName = header.slice(0xa0, 0xac);
  const gameId = header.slice(0xac, 0xb0);
  const companyId = header.slice(0xb0, 0xb2);
  return {
    gameName: new TextDecoder().decode(gameName),
    gameId: new TextDecoder().decode(gameId),
    companyId: new TextDecoder().decode(companyId),
  };
}

export function getRomImage(gameId: string): string | null {
  const romName = getRomName(gameId);
  if (romName == null) {
    return null;
  }
  return `https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/17c74d9d2529bc79b7036417f3ee4794de964438/Named_Titles/${romName}.png`;
}
