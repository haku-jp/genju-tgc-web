import type { CSSProperties } from "react";

export const screenStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  background: "#0b0e14",
  color: "#e8e0d0",
};

export const buttonStyle: CSSProperties = {
  minWidth: 150,
  minHeight: 44,
  border: "1px solid #3da9fc",
  background: "#141a24",
  color: "#e8e0d0",
  font: "700 16px system-ui, sans-serif",
  cursor: "pointer",
};
