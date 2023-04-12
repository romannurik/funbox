export default {
  rectangle: `rectangle \${1:crimson} \${2:a1} \${3:j10}`,
  circle: `circle \${1:crimson} \${2:a1} \${3:j10}`,
  text: `text \${1:crimson} "\${2:Hello}" \${3:a1}`,
  letter: `letter \${1:crimson} "\${2:A}" \${3:a1}`,
  line: `line \${1:crimson} a1 b2 a3 b4`,
  dot: `dot \${1:crimson} \${2:a1}`,
  if: `set hello = true
if hello
  dot crimson a1
end`,
  function: `function \${1:hello} position
  dot crimson position
end

call \${1:hello} a1`,
  repeat: `set pos = a1
repeat 10
  set color = call randomcolor
  dot color pos
  set pos = pos + 1 COLUMN
end`,
};