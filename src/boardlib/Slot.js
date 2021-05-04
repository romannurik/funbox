import React from "react";
import { PieceReceiver } from "./PieceReceiver";

export function Slot(props) {
  return (
    <PieceReceiver
      onReceive={(newPiece, currentPieces) => [newPiece]}
      {...props}
    />
  );
}
