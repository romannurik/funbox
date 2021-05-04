import React from "react";
import { PieceReceiver } from "./PieceReceiver";

export function Tray({ infinite, ...props }) {
  return (
    <PieceReceiver
      onReceive={(newPiece, currentPieces) => [
        ...new Set([...currentPieces, newPiece])
      ]}
      onSend={(piece, currentPieces) =>
        infinite ? currentPieces : currentPieces.filter(p => p !== piece)
      }
      {...props}
      autoFill
    />
  );
}
