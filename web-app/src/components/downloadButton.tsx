import React from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

type InnerProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  downloadName?: string | null;
  downloadUrl?: string | null;
  onClickDownload: () => void;
};

function InnerDownloadButton({
  label,
  loading,
  disabled,
  downloadUrl,
  downloadName,
  onClickDownload,
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
    >
      {loading ? <CircularProgress /> : label}
    </Button>
  );
}

type Props = {
  label: string;
  downloadName: string;
  disabled?: boolean;
  getDownload: () => Promise<Uint8Array>;
};

export function DownloadButton({
  label,
  downloadName,
  disabled,
  getDownload,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  return (
    <InnerDownloadButton
      label={label}
      downloadName={downloadName}
      downloadUrl={downloadUrl}
      loading={loading}
      disabled={disabled}
      onClickDownload={async () => {
        setLoading(true);
        const download = await getDownload();
        setDownloadUrl(URL.createObjectURL(new Blob([download])));
        setLoading(false);
      }}
    />
  );
}
