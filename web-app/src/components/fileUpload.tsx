import * as React from "react";
import { styled } from "@mui/material/styles";
import Button, { ButtonProps } from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

type Props = {
  label: string;
  onFileRead: (buf: Uint8Array) => void;
} & ButtonProps;

export function InputFileUpload({ label, onFileRead, ...props }: Props) {
  return (
    <Button
      component="label"
      variant="contained"
      startIcon={<CloudUploadIcon />}
      {...props}
    >
      {label}
      <VisuallyHiddenInput
        type="file"
        onChange={({ target }) => {
          const file = (target.files ?? [])[0];
          if (file != null) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result;
              if (result != null && typeof result !== "string") {
                onFileRead(new Uint8Array(result));
              }
            };
            reader.readAsArrayBuffer(file);
          }
        }}
      />
    </Button>
  );
}
