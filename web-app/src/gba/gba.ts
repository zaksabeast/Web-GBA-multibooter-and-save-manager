import { parseHeader, RomHeader } from "./rom";

export function to_le_bytes(num: number): Uint8Array {
  return Uint8Array.from([num >> 0, num >> 8, num >> 16, num >> 24]);
}

export function to_be_bytes(num: number): Uint8Array {
  return Uint8Array.from([num >> 24, num >> 16, num >> 8, num >> 0]);
}

async function send32(data: number, device: USBDevice): Promise<number> {
  const u32 = to_be_bytes(data);
  await device.transferOut(1, u32);
  const read = await device.transferIn(2, 4);
  if (read.data != null) {
    return read.data.getUint32(0, false);
  }
  return 0xffffffff;
}

function u8_array_to_u32_array(data: Uint8Array): Uint32Array {
  const aligned = Uint8Array.from([
    ...data,
    ...new Uint8Array(data.length % 4),
  ]);
  return new Uint32Array(aligned.buffer);
}

function serialize_payload(command: number, payload: Uint8Array): Uint32Array {
  const original_len = payload.length;
  const aligned_payload_len = (original_len % 4) + original_len;
  const payload_len = aligned_payload_len / 4;
  return new Uint32Array([
    command,
    payload_len,
    ...u8_array_to_u32_array(payload),
  ]);
}

async function send_command(
  command: number,
  payload: Uint8Array,
  device: USBDevice
): Promise<void> {
  const serialized = serialize_payload(command, payload);
  for (let i = 0; i < serialized.length; i++) {
    await send32(serialized[i], device);
  }
}

async function recv_data(
  count: number,
  device: USBDevice
): Promise<Uint8Array> {
  const result = new Uint8Array(count);
  for (let i = 0; i < count; i += 4) {
    const chunk = await send32(0, device);
    const bytes = to_le_bytes(chunk);
    result.set(bytes, i);
  }

  return result;
}

export async function check(device: USBDevice): Promise<number> {
  return await send32(0, device);
}

export async function wait(device: USBDevice) {
  while ((await check(device)) != 0xc0de) {}
}

export async function game_size(device: USBDevice): Promise<number> {
  await send_command(0x01, Uint8Array.from([]), device);
  return send32(0x00, device);
}

export async function save_size(device: USBDevice): Promise<number> {
  await send_command(0x02, Uint8Array.from([]), device);
  return send32(0x00, device);
}

async function read(
  addr: number,
  count: number,
  device: USBDevice
): Promise<Uint8Array> {
  const payload = Uint8Array.from([
    ...to_le_bytes(addr),
    ...to_le_bytes(count / 4),
  ]);
  await send_command(0x03, payload, device);
  return recv_data(count, device);
}

export async function read_header(device: USBDevice): Promise<
  RomHeader & {
    header: Uint8Array;
  }
> {
  const header = await read(0x8000000, 0xc0, device);
  const parsed = parseHeader(header);
  return {
    ...parsed,
    header,
  };
}

export async function read_rom(device: USBDevice): Promise<Uint8Array> {
  const size = await game_size(device);
  return read(0x8000000, size, device);
}

export async function read_save(device: USBDevice): Promise<Uint8Array> {
  const size = await save_size(device);
  return read(0x7000000, size, device);
}

export async function write_save(
  data: Uint8Array,
  device: USBDevice
): Promise<void> {
  const size = await save_size(device);
  if (data.length !== size) {
    throw new Error("The provided save has the wrong size!");
  }
  return send_command(0x04, data, device);
}

export async function clear_save(device: USBDevice): Promise<void> {
  const size = await save_size(device);
  const blank_save = new Uint8Array(size);
  return send_command(0x04, blank_save, device);
}

export async function echo(
  nums: number[],
  device: USBDevice
): Promise<number[]> {
  const payload = Uint8Array.from(nums.flatMap((num) => [...to_le_bytes(num)]));
  await send_command(0x05, payload, device);
  const result = await recv_data(payload.length, device);
  return [...u8_array_to_u32_array(result)];
}
