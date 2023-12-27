import React from "react";
import * as tst from "ts-toolbelt";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import UsbIcon from "@mui/icons-material/Usb";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import * as gba from "./gba";
import { DownloadButton } from "./components/downloadButton";
import { InputFileUpload } from "./components/fileUpload";
import { getRomImage, getRomName } from "./gba/rom";
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

type SaveContainerProps = {
  children: React.ReactNode;
};

function SaveContainer({ children }: SaveContainerProps) {
  const theme = useTheme();
  const isXsScreen = useMediaQuery(theme.breakpoints.down("sm"));

  if (isXsScreen) {
    return children;
  }

  return (
    <Grid item container xs={12} sm={6} md={8} spacing={2}>
      {children}
    </Grid>
  );
}

type Save = {
  gameId: string;
  save: Uint8Array;
};

export function App() {
  const [multibootCustom, setMultibootCustom] = React.useState(false);
  const [gba, setGba] = React.useState<USBDevice | null>(null);
  const [backupRom, setBackupRom] = React.useState<Uint8Array | null>(null);
  const [customRom, setCustomRom] = React.useState<Uint8Array | null>(null);
  const [gameInfo, setGameInfo] = React.useState<GameInfo | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [saves, setSaves] = React.useState<Save[]>([]);
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
        <Grid item spacing={2} direction="column" xs={12} sm={6} md={4}>
          <Card sx={{ p: 2 }}>
            <TextField
              multiline
              fullWidth
              minRows={14}
              value={log.join("\n")}
              disabled
            />
            <Grid container spacing={2}>
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

        <SaveContainer>
          {saves.length === 0 && (
            <Grid item>
              <Typography>
                No saves found. Make a backup to see it here!
              </Typography>
            </Grid>
          )}
          {saves.map(({ gameId }) => {
            const title = getRomName(gameId) ?? "";

            return (
              <Grid item xs={12} md={6} lg={4}>
                <Card sx={{ width: "100%" }}>
                  <img
                    src={getRomImage(gameId) ?? undefined}
                    width="100%"
                    title={title}
                  />
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Maybe make the title and this description editable?
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small">Download Save</Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </SaveContainer>
      </Grid>
    </Box>
  );
}
