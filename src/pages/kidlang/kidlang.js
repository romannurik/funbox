import ohm from 'ohm-js';

const GRAMMAR = `
  KidLang {
    Program = Statement*
    Statement
      = (BlockStatement | SetStatement | CommandStatement) comment? -- withComment
      | comment  -- justComment
    BlockStatement = RepeatStatement

    SetStatement = "SET" ident "=" Expr
    RepeatStatement = "REPEAT" Expr Statement* "END"
    CommandStatement = command Arg*
    
    Arg = Expr
    Expr
      = Expr "+" PrimExpr  -- plus
      | Expr "-" PrimExpr  -- minus
      | PrimExpr
    PrimExpr = Vector | number | string | ident

    Vector = number ("ROWS" | "ROW" | "COLUMNS" | "COLUMN")
    
    comment = "#" (~"\\n" any)+ ("\\n" | end)
    reservedWord = "SET" | "REPEAT" | "END"
    command = ~reservedWord upper+
    ident = lower (lower | digit)*
    string = "\\"" alnum* "\\""
    number = digit+
  }
`;

const { parser, sem } = createParser();

function run(program, onCommand) {
  const matchResult = parser.match(program);
  if (matchResult.failed()) {
    throw {
      position: matchResult.getRightmostFailurePosition(),
      message: matchResult.shortMessage,
    };
  }
  const context = { stdout: '', vars: makeInitialVars(), onCommand };
  sem(matchResult).eval(context);
  return context.stdout;
}

function createParser() {
  const parser = ohm.grammar(GRAMMAR);
  const sem = parser.createSemantics();
  sem.addOperation('eval(context)', {
    Statement_withComment(statement, _) {
      return statement.eval(this.args.context);
    },
    SetStatement(_, varName, __, expr) {
      this.args.context.vars[varName.sourceString] = expr.eval(this.args.context);
    },
    RepeatStatement(_, numTimesExpr, statements, __) {
      let numTimes = numTimesExpr.eval(this.args.context);
      for (let i = 0; i < numTimes; i++) {
        const result = statements.eval(this.args.context);
      }
    },
    CommandStatement(command, args) {
      let pieces = [
        command.sourceString,
        ...args.eval(this.args.context)
      ];
      this.args.context.stdout += pieces.join(', ') + '\n';
      try {
        this.args.context.onCommand(command.sourceString, ...pieces.slice(1));
      } catch (e) {
        throw {
          position: this.source.startIdx,
          endPosition: this.source.endIdx,
          message: e.message,
        };
      }
    },
    Expr_plus(left, _, right) {
      left = left.eval(this.args.context);
      right = right.eval(this.args.context);
      if (left.type === 'vector') {
        return left.add(right);
      } else if (right.type === 'vector') {
        return right.add(left);
      }
      return left + right;
    },
    Expr_minus(left, _, right) {
      left = left.eval(this.args.context);
      right = right.eval(this.args.context);
      if (left.type === 'vector') {
        return left.subtract(right);
      } else if (right.type === 'vector') {
        return right.subtract(left);
      }
      return left - right;
    },
    Vector(num, rowOrCol) {
      let length = num.eval(this.args.context);
      let isRow = rowOrCol.sourceString === 'ROW' || rowOrCol.sourceString === 'ROWS';
      return vector(isRow ? length : 0, isRow ? 0 : length);
    },
    comment(_, __, ___) {
    },
    ident(_, __) {
      return this.args.context.vars?.[this.sourceString] || this.sourceString;
    },
    string(_, __, ___) {
      return JSON.parse(this.sourceString);
    },
    number(_) {
      return parseInt(this.sourceString);
    },
    _iter(...children) {
      return children.map(c => c.eval(this.args.context));
    }
  });
  return { parser, sem };
}

function vector(r, c) {
  console.assert(typeof r === 'number', 'Row is not a number');
  console.assert(typeof c === 'number', 'Column is not a number');
  return {
    type: 'vector',
    r,
    c,
    add(v) {
      return v.type === 'vector'
        ? vector(this.r + v.r, this.c + v.c)
        : vector(this.r + v, this.c + c);
    },
    subtract(v) {
      return v.type === 'vector'
        ? vector(this.r - v.r, this.c - v.c)
        : vector(this.r - v, this.c - c);
    },
    toString() { return `{${this.c};${this.r}}` }
  };
}

function makeInitialVars() {
  const colors = Object.fromEntries(namedColors().map(x => [x.toLocaleLowerCase(), x]));
  const positions = {};
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      // e.g. a1 = {r:0,c:0}
      positions[String.fromCharCode(97 + c) + (r + 1)] = vector(r, c);
    }
  }
  return { ...colors, ...positions };
}

function namedColors() {
  return ["AliceBlue","AntiqueWhite","Aqua","Aquamarine","Azure","Beige","Bisque","Black","BlanchedAlmond","Blue","BlueViolet","Brown","BurlyWood","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Cornsilk","Crimson","Cyan","DarkBlue","DarkCyan","DarkGoldenRod","DarkGray","DarkGrey","DarkGreen","DarkKhaki","DarkMagenta","DarkOliveGreen","DarkOrange","DarkOrchid","DarkRed","DarkSalmon","DarkSeaGreen","DarkSlateBlue","DarkSlateGray","DarkSlateGrey","DarkTurquoise","DarkViolet","DeepPink","DeepSkyBlue","DimGray","DimGrey","DodgerBlue","FireBrick","FloralWhite","ForestGreen","Fuchsia","Gainsboro","GhostWhite","Gold","GoldenRod","Gray","Grey","Green","GreenYellow","HoneyDew","HotPink","IndianRed","Indigo","Ivory","Khaki","Lavender","LavenderBlush","LawnGreen","LemonChiffon","LightBlue","LightCoral","LightCyan","LightGoldenRodYellow","LightGray","LightGrey","LightGreen","LightPink","LightSalmon","LightSeaGreen","LightSkyBlue","LightSlateGray","LightSlateGrey","LightSteelBlue","LightYellow","Lime","LimeGreen","Linen","Magenta","Maroon","MediumAquaMarine","MediumBlue","MediumOrchid","MediumPurple","MediumSeaGreen","MediumSlateBlue","MediumSpringGreen","MediumTurquoise","MediumVioletRed","MidnightBlue","MintCream","MistyRose","Moccasin","NavajoWhite","Navy","OldLace","Olive","OliveDrab","Orange","OrangeRed","Orchid","PaleGoldenRod","PaleGreen","PaleTurquoise","PaleVioletRed","PapayaWhip","PeachPuff","Peru","Pink","Plum","PowderBlue","Purple","RebeccaPurple","Red","RosyBrown","RoyalBlue","SaddleBrown","Salmon","SandyBrown","SeaGreen","SeaShell","Sienna","Silver","SkyBlue","SlateBlue","SlateGray","SlateGrey","Snow","SpringGreen","SteelBlue","Tan","Teal","Thistle","Tomato","Turquoise","Violet","Wheat","White","WhiteSmoke","Yellow","YellowGreen"];
}

export default { run };