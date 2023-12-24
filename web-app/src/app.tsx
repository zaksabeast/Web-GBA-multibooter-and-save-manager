import React from "react";
import * as tst from "ts-toolbelt";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import JirachiImg from "./jirachi.png";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import UsbIcon from "@mui/icons-material/Usb";
import * as gba from "./gba";
import { DownloadButton } from "./components/downloadButton";
import { PixelatedImage } from "./components/pixelatedImage";
import { InputFileUpload } from "./components/fileUpload";
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

async function downloadSaveFromGba(device?: USBDevice): Promise<Uint8Array> {
  if (device != null) {
    return gba.read_save(device);
  }

  return new Uint8Array(0);
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
  const [multibootCustom, setMultibootCustom] = React.useState(false);
  const [gba, setGba] = React.useState<USBDevice | null>(null);
  const [backupRom, setBackupRom] = React.useState<Uint8Array | null>(null);
  const [customRom, setCustomRom] = React.useState<Uint8Array | null>(null);
  const [gameInfo, setGameInfo] = React.useState<GameInfo | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const rom = multibootCustom ? customRom : backupRom;

  React.useEffect(() => {
    fetch(gbaBackupMultibootUrl)
      .then((res) => res.arrayBuffer())
      .then((buf) => setBackupRom(new Uint8Array(buf)));
  }, []);

  const multibootGba = React.useCallback(async () => {
    const addLog = (newLog: string) =>
      setLog((currentLog) => [...currentLog, newLog]);

    const device = await handleDevice();
    if (device != null && rom != null) {
      await boot(device, rom, addLog);
      setGameInfo(await getGameInfo(device, addLog));
      setGba(device);
    }
  }, []);

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
            <Card>
              <Grid container spacing={2} p={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch />}
                    label="Multiboot custom rom"
                    onChange={() => setMultibootCustom(!multibootCustom)}
                  />
                </Grid>
                {!multibootCustom && (
                  <>
                    <Grid item xs={12}>
                      <Button
                        disabled={backupRom == null}
                        variant="contained"
                        onClick={multibootGba}
                        startIcon={<UsbIcon />}
                        fullWidth
                      >
                        Multiboot GBA
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <DownloadButton
                        label="Download save"
                        downloadName={`${gameInfo?.gameName ?? "save"}.sav`}
                        disabled={gba == null}
                        getDownload={downloadSaveFromGba}
                        fullWidth
                      />
                    </Grid>
                  </>
                )}
                {multibootCustom && (
                  <>
                    <Grid item xs={12}>
                      <InputFileUpload
                        label="Select Multiboot"
                        onFileRead={setCustomRom}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        disabled={customRom == null}
                        variant="outlined"
                        onClick={multibootGba}
                        startIcon={<UsbIcon />}
                        fullWidth
                      >
                        Multiboot GBA
                      </Button>
                    </Grid>
                  </>
                )}
              </Grid>
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
