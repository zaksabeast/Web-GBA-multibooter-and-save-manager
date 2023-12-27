import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import DownloadIcon from "@mui/icons-material/Download";

type InnerProps = {
  label: string;
  loading?: boolean;
  downloadName?: string | null;
  downloadUrl?: string | null;
  onClickDownload: () => void;
} & ButtonProps;

function InnerDownloadButton({
  label,
  loading,
  disabled,
  downloadUrl,
  downloadName,
  onClickDownload,
  ...props
}: InnerProps) {
  if (downloadUrl != null) {
    return (
      <Button
        component="a"
        variant="outlined"
        download={downloadName}
        href={downloadUrl}
      >
        {downloadName ?? "Ready!"}
      </Button>
    );
  }

  return (
    <Button
      disabled={disabled || loading}
      variant="outlined"
      onClick={onClickDownload}
      startIcon={<DownloadIcon />}
      {...props}
    >
      {loading ? <CircularProgress /> : label}
    </Button>
  );
}

type Props = {
  label: string;
  downloadName: string;
  download: Uint8Array;
} & ButtonProps;

export function DownloadButton({
  label,
  downloadName,
  disabled,
  download,
  ...props
}: Props) {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  return (
    <InnerDownloadButton
      label={label}
      downloadName={downloadName}
      downloadUrl={downloadUrl}
      disabled={disabled}
      onClickDownload={() => {
        setDownloadUrl(URL.createObjectURL(new Blob([download])));
      }}
      {...props}
    />
  );
}
