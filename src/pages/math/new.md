# New API

Low-level interaction components

- Draggable
- DropTarget

Low-level design components

- Piece
  - wraps a draggable
  - has some basic props for color, shape, etc.
- Slot
  - wraps DropTarget
  - dashed border

Higher-level components

- PieceList (e.g. for a list of statements)
  - allows reordering, scrolling, etc.

Math game components

- NumberPiece, OperatorPiece
  - question: do we make NumberPiece and NumberSlot together?

Programming game components

- FunctionCallPiece
  - higher-level versions like Round(), Cos(), etc.?
- StatementBlockSlot
  - A piecelist of statements
- IfStatementPiece
  - includes a StatementBlockSlot
  - TODO: what kinds of expressions do we allow?
- LoopStatementPiece
  - includes a StatementBlockSlot for the block

## `Draggable`

## `DropTarget`

## `Slot`

## `Piece`

