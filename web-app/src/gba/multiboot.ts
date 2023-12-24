import { getRomAlignedGameLength, getRomGame, getRomHeader } from "./rom";
import { Crc, EncryptState } from "./crc";

const P_COLOR = 0;
const P_DIR = 0;
const P_SPEED = 0;

async function send32(device: USBDevice, data: number): Promise<number> {
  // send
  const u32 = new Uint8Array([data >> 24, data >> 16, data >> 8, data]);
  await device.transferOut(1, u32);
  // read
  const read = await device.transferIn(2, 4);
  if (read.data != null) {
    return read.data.getUint32(0, false);
  }
  return 0;
}

async function send16(device: USBDevice, data: number): Promise<number> {
  const recv = await send32(device, data);
  return recv >>> 16;
}

async function isReady(device: USBDevice): Promise<boolean> {
  const recv = await send16(device, 0x6202);
  return recv === 0x7202;
}

export async function waitReady(device: USBDevice): Promise<void> {
  while (!(await isReady(device))) {}
}

async function sendHeader(device: USBDevice, rom: Uint8Array): Promise<void> {
  await send16(device, 0x6100);

  const chunks = new Uint16Array(getRomHeader(rom).buffer);

  for (let i = 0; i < chunks.length; i++) {
    await send16(device, chunks[i]);
  }

  await send16(device, 0x6200);
}

async function getKeys(
  device: USBDevice,
  rom: Uint8Array
): Promise<{ crc: Crc; enc: EncryptState }> {
  const pp = 0x81 + P_COLOR * 0x10 + P_DIR * 0x8 + P_SPEED * 0x2;

  await send16(device, 0x6202);

  // Send enc key
  await send16(device, 0x6300 | pp);

  // Get enc key
  const token = await send16(device, 0x6300 | pp);

  if (token >>> 8 != 0x73) {
    throw new Error("Failed handshake");
  }

  const lastTokenByte = token & 0xff;
  const seed = 0xffff0000 | (lastTokenByte << 8) | pp;
  const crcFinalA = (lastTokenByte + 0xf) & 0xff;

  await send16(device, 0x6400 | crcFinalA);
  const token2 = await send16(
    device,
    (getRomAlignedGameLength(rom) - 0xc0) / 4 - 0x34
  );
  const crcFinalB = token2 & 0xff;

  const crc = new Crc(crcFinalA, crcFinalB);
  const enc = new EncryptState(seed);

  return { crc, enc };
}

async function sendRom(
  device: USBDevice,
  rom: Uint8Array,
  crc: Crc,
  enc: EncryptState
): Promise<void> {
  const game = getRomGame(rom);
  const view = new DataView(game.buffer);

  for (let i = 0; i < game.length; i = i + 4) {
    const word = view.getUint32(i, true);
    const gameIndex = i + 0xc0;
    crc.step(word);
    const encWord = enc.step(word, gameIndex);
    const check = (await send32(device, encWord)) >>> 16;
    const expected = gameIndex & 0xffff;

    if (check !== expected) {
      throw new Error(
        `Transmission error ${check.toString(16)} !== ${expected.toString(16)}`
      );
    }
  }
}

async function validateChecksum(
  device: USBDevice,
  checksum: number
): Promise<void> {
  while ((await send16(device, 0x0065)) != 0x0075) {}

  await send16(device, 0x0066);
  const consoleCrc = await send16(device, checksum);

  if (consoleCrc !== checksum) {
    throw new Error(
      `Invalid checksum: ${consoleCrc.toString(16)} !== ${checksum.toString(
        16
      )}`
    );
  }
}

export async function multiboot(
  device: USBDevice,
  rom: Uint8Array
): Promise<void> {
  await sendHeader(device, rom);
  const { crc, enc } = await getKeys(device, rom);
  await sendRom(device, rom, crc, enc);
  const checksum = crc.digest();
  await validateChecksum(device, checksum);
}
