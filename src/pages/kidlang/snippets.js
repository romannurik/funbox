export default {
  RECTANGLE: `RECTANGLE \${1:crimson} \${2:a1} \${3:j10}`,
  CIRCLE: `CIRCLE \${1:crimson} \${2:a1} \${3:j10}`,
  TEXT: `TEXT \${1:crimson} "\${2:Hello}" \${3:a1}`,
  LETTER: `LETTER \${1:crimson} "\${2:A}" \${3:a1}`,
  DOT: `DOT \${1:crimson} \${2:a1}`,
  IF: `SET hello = 1  # set to 0 for false
IF hello
  DOT crimson a1
END`,
  FUNCTION: `FUNCTION \${1:hello} position
  DOT crimson position
END

CALL \${1:hello} a1`,
  REPEAT: `SET pos = a1
REPEAT 10
  SET color = CALL randomcolor
  DOT color pos
  SET pos = pos + 1 COLUMN
END`,
};