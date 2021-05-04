import React from "react";
import { Board } from "./Board";
import { PieceReceiver } from "./PieceReceiver";
import styles from "./Piece.module.scss";
import cn from "classnames";

export function Piece({ dragImage, dragging, className, value, children }) {
  const receiverContext = React.useContext(PieceReceiver.Context);
  const [store, dispatch] = React.useContext(Board.Context);

  return (
    <div
      className={cn(className, styles.piece, {
        isDragImage: !!dragImage,
        isDragging: dragging
      })}
      onPointerDown={event => {
        dispatch.dragPiece({
          fromReceiver: receiverContext.id,
          pieceValue: String(value),
          clientX: event.clientX,
          clientY: event.clientY,
          el: event.currentTarget
        });
      }}
    >
      {children}
    </div>
  );
}
