export default `
KidLang {
  Program = newline* Statement*
  Statement
    = (BlockStatement | SingleLineStatement) (comment | eol) -- withComment
    | comment  -- justComment

  End = caseInsensitive<"END">
  BlockStatement = RepeatStatement | IfStatement | FunctionStatement | TimerStatement
  RepeatStatement = caseInsensitive<"REPEAT"> Expr newline Statement* End
  TimerStatement = caseInsensitive<"TIMER"> Expr newline Statement* End
  IfStatement = caseInsensitive<"IF"> Expr newline Statement*
    ElseIfStatement*
    ElseStatement?
    End
  ElseIfStatement = caseInsensitive<"ELSE"> caseInsensitive<"IF"> Expr newline Statement*
  ElseStatement = caseInsensitive<"ELSE"> newline Statement*
  FunctionStatement = caseInsensitive<"FUNCTION"> ident ident* newline Statement* End

  SingleLineStatement = SetStatement | CallStatement | CommandStatement
  SetStatement = caseInsensitive<"SET"> ident "=" Expr
  CallStatement = caseInsensitive<"CALL"> ident Expr*
  CommandStatement = command Arg*
  
  Arg = Expr
  Expr
    = Expr "+" MulExpr  -- plus
    | Expr "-" MulExpr  -- minus
    | MulExpr
  MulExpr
    = MulExpr "*" BoolExpr  -- mult
    | MulExpr "/" BoolExpr  -- div
    | BoolExpr
  BoolExpr
    = BoolExpr caseInsensitive<"AND"> PrimExpr  -- and
    | BoolExpr caseInsensitive<"OR"> PrimExpr  -- or
    | PrimExpr
  PrimExpr
    = "(" Expr ")"  -- paren
    | PrimExpr "=" PrimExpr  -- equals
    | PrimExpr ">" PrimExpr  -- gt
    | PrimExpr "<" PrimExpr  -- lt
    | PrimExpr ">=" PrimExpr  -- gte
    | PrimExpr "<=" PrimExpr  -- lte
    | "+" PrimExpr  -- positive
    | "-" PrimExpr  -- negative
    | caseInsensitive<"NOT"> PrimExpr  -- not
    | CallExpr | Vector | Boolean | number | string | varName
  CallExpr = "(" caseInsensitive<"CALL"> ident Expr* ")"
  Boolean (true or false) = caseInsensitive<"TRUE"> | caseInsensitive<"FALSE">
  Vector = number (caseInsensitive<"ROWS"> | caseInsensitive<"ROW"> | caseInsensitive<"COLUMNS"> | caseInsensitive<"COLUMN">)
  
  space := (" " | "\\t")
  newline = "\\n" ("\\n" | space)*
  eol = (newline | end)
  reservedWord
    = caseInsensitive<"SET">
      | caseInsensitive<"REPEAT">
      | caseInsensitive<"TIMER">
      | caseInsensitive<"IF">
      | caseInsensitive<"ELSE">
      | caseInsensitive<"FUNCTION">
      | caseInsensitive<"END">
      | caseInsensitive<"CALL">
      | caseInsensitive<"AND">
      | caseInsensitive<"OR">
      | caseInsensitive<"NOT">
      | caseInsensitive<"TRUE">
      | caseInsensitive<"FALSE">
  comment (a comment) = "#" (~"\\n" any)* eol
  command = ~reservedWord letter+
  varName (a variable) = ident
  ident (an identifier) = letter (letter | digit)*
  string (a string) = "\\"" (~"\\"" any)* "\\""
  number (a number) = (digit* ".")? digit+
}
`;