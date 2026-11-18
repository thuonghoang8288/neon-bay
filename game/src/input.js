// Neon Bay — keyboard and mouse input.
// One job: turn raw DOM events into a clean, polled input state the game loop reads.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // keys pressed since last poll (edge-triggered)
    mouseX: 0, mouseY: 0, mouseDown: false, clicked: false,
  };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => { input.keys.clear(); input.mouseDown = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left; input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', () => { input.mouseDown = true; input.clicked = true; });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

export function isDown(input, ...codes) { return codes.some((c) => input.keys.has(c)); }
export function wasPressed(input, ...codes) { return codes.some((c) => input.pressed.has(c)); }
export function endFrame(input) { input.pressed.clear(); input.clicked = false; }
