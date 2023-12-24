import React from "react";
import * as tst from "ts-toolbelt";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import JirachiImg from "./jirachi.png";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import * as gba from "./gba";
import { DownloadButton } from "./components/downloadButton";
import { PixelatedImage } from "./components/pixelatedImage";
import gbaBackupMultibootUrl from "data-url:../../gba/gba_mb.gba";

// Fix navigator global types
const navigator: tst.O.Overwrite<Navigator, { usb: USB | null }> =
  window.navigator;

async function handleDevice() {
  if (navigator.usb == null) {
    return null;
  }

  const device = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x1234 }],
  });

  await device.open();
  await device.claimInterface(1);

  return device;
}

type Log = (str: string) => void;

async function boot(device: USBDevice, rom: Uint8Array, log: Log) {
  log("Waiting for gba...");
  await gba.waitReady(device);
  log("Multibooting...");
  await gba.multiboot(device, rom);
  log("Success!");
}

async function getSave(device: USBDevice): Promise<Uint8Array> {
  return gba.read_save(device);
}

type GameInfo = {
  gameSize: number;
  saveSize: number;
  gameName: string;
  gameId: string;
  companyId: string;
};

async function getGameInfo(device: USBDevice, log: Log): Promise<GameInfo> {
  log("Waiting for cartridge...");
  await gba.wait(device);
  log("Getting game info");
  const gameSize = await gba.game_size(device);
  const saveSize = await gba.save_size(device);
  const { gameName, gameId, companyId } = await gba.read_header(device);
  return {
    gameSize,
    saveSize,
    gameName,
    gameId,
    companyId,
  };
}

export function App() {
  const [gba, setGba] = React.useState<USBDevice | null>(null);
  const [rom, setRom] = React.useState<Uint8Array | null>(null);
  const [gameInfo, setGameInfo] = React.useState<GameInfo | null>(null);
  const [log, setLog] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetch(gbaBackupMultibootUrl)
      .then((res) => res.arrayBuffer())
      .then((buf) => setRom(new Uint8Array(buf)));
  }, []);

  const addLog = (newLog: string) =>
    setLog((currentLog) => [...currentLog, newLog]);

  return (
    <Box>
      <Grid spacing={2} container direction="row">
        <Grid item container spacing={2} direction="column" sm={4}>
          <Grid item>
            <Card sx={{ p: 2 }}>
              <TextField
                multiline
                fullWidth
                minRows={14}
                value={log.join("\n")}
                disabled
              />
            </Card>
          </Grid>
          <Grid item>
            <Card sx={{ p: 2, display: "flex", flexDirection: "column" }}>
              <Button
                sx={{ mb: 2 }}
                disabled={rom == null}
                variant="contained"
                onClick={async () => {
                  const device = await handleDevice();
                  if (device != null && rom != null) {
                    await boot(device, rom, addLog);
                    setGameInfo(await getGameInfo(device, addLog));
                    setGba(device);
                  }
                }}
              >
                Multiboot GBA
              </Button>
              <DownloadButton
                label="Download save"
                downloadName={`${gameInfo?.gameName ?? "save"}.sav`}
                disabled={gba == null}
                getDownload={async () => {
                  if (gba) {
                    return getSave(gba);
                  }

                  return new Uint8Array(0);
                }}
              />
            </Card>
          </Grid>
        </Grid>

        <Grid item sm={8}>
          <Card
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              maxHeight: 1000,
            }}
          >
            <Box
              sx={{
                overflow: "hidden",
                height: 233,
                width: 258,
              }}
            >
              <PixelatedImage
                src={JirachiImg}
                sx={{ width: 800, position: "relative", top: -389, left: -283 }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
