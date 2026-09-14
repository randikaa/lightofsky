export interface CharacterControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  reset: boolean;
}

export class InputManager {
  private state: CharacterControlState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    reset: false,
  };

  public isTyping = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener("keydown", this.boundKeyDown, { passive: false });
    window.addEventListener("keyup", this.boundKeyUp, { passive: false });
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.isTyping) return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }

    const code = e.code;
    const key = e.key ? e.key.toLowerCase() : "";

    // Forward: W, Z (AZERTY), ArrowUp
    if (code === "KeyW" || code === "KeyZ" || code === "ArrowUp" || key === "w" || key === "z" || key === "arrowup") {
      this.state.forward = true;
    }
    // Backward: S, ArrowDown
    if (code === "KeyS" || code === "ArrowDown" || key === "s" || key === "arrowdown") {
      this.state.backward = true;
    }
    // Left: A, Q (AZERTY), ArrowLeft
    if (code === "KeyA" || code === "KeyQ" || code === "ArrowLeft" || key === "a" || key === "q" || key === "arrowleft") {
      this.state.left = true;
    }
    // Right: D, ArrowRight
    if (code === "KeyD" || code === "ArrowRight" || key === "d" || key === "arrowright") {
      this.state.right = true;
    }
    // Sprint: Shift
    if (code === "ShiftLeft" || code === "ShiftRight" || key === "shift") {
      this.state.sprint = true;
    }
    // Jump: Space
    if (code === "Space" || key === " ") {
      this.state.jump = true;
    }
    // Reset / Respawn: R
    if (code === "KeyR" || key === "r") {
      this.state.reset = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const code = e.code;
    const key = e.key ? e.key.toLowerCase() : "";

    if (code === "KeyW" || code === "KeyZ" || code === "ArrowUp" || key === "w" || key === "z" || key === "arrowup") {
      this.state.forward = false;
    }
    if (code === "KeyS" || code === "ArrowDown" || key === "s" || key === "arrowdown") {
      this.state.backward = false;
    }
    if (code === "KeyA" || code === "KeyQ" || code === "ArrowLeft" || key === "a" || key === "q" || key === "arrowleft") {
      this.state.left = false;
    }
    if (code === "KeyD" || code === "ArrowRight" || key === "d" || key === "arrowright") {
      this.state.right = false;
    }
    if (code === "ShiftLeft" || code === "ShiftRight" || key === "shift") {
      this.state.sprint = false;
    }
    if (code === "Space" || key === " ") {
      this.state.jump = false;
    }
    if (code === "KeyR" || key === "r") {
      this.state.reset = false;
    }
  }

  public setTyping(typing: boolean) {
    this.isTyping = typing;
    if (typing) {
      this.state.forward = false;
      this.state.backward = false;
      this.state.left = false;
      this.state.right = false;
      this.state.sprint = false;
      this.state.jump = false;
      this.state.reset = false;
    }
  }

  public getState(): CharacterControlState {
    if (this.isTyping) {
      return {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        reset: false,
      };
    }
    const copy = { ...this.state };
    if (this.state.reset) {
      this.state.reset = false;
    }
    return copy;
  }

  public triggerReset() {
    this.state.reset = true;
  }

  public destroy() {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
  }
}
