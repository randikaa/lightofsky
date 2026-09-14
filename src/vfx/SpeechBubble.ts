import * as THREE from "three";

export class SpeechBubble {
  private parent: THREE.Object3D;
  private sprite: THREE.Sprite | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture | null = null;
  private material: THREE.SpriteMaterial | null = null;

  private timer = 0;
  private isVisible = false;
  private readonly duration = 4.0; // 4 seconds visible duration

  private baseScale = new THREE.Vector2(2.8, 1.4);
  private baseHeight = 2.35;

  constructor(parent: THREE.Object3D) {
    this.parent = parent;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 512;
    this.canvas.height = 256;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Could not get 2D context for speech bubble");
    this.ctx = context;
  }

  public show(senderName: string, text: string) {
    this.drawBubble(senderName, text);

    if (!this.sprite) {
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;

      this.material = new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      });

      this.sprite = new THREE.Sprite(this.material);
      this.sprite.position.set(0, this.baseHeight, 0);
      this.sprite.scale.set(0.001, 0.001, 1);
      this.sprite.renderOrder = 999; // Render on top of scene
      this.parent.add(this.sprite);
    } else if (this.texture) {
      this.texture.needsUpdate = true;
    }

    this.timer = 0;
    this.isVisible = true;
  }

  private drawBubble(senderName: string, text: string) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    const padX = 24;
    const padY = 20;
    const bubbleW = w - padX * 2;
    const bubbleH = h - padY * 2 - 30; // Leave 30px for speech arrow at bottom
    const radius = 24;

    // Draw speech bubble background with rounded corners
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(padX, padY, bubbleW, bubbleH, radius);

    // Speech arrow / tail pointing down to character head
    const tailX = w / 2;
    const tailY = padY + bubbleH;
    ctx.moveTo(tailX - 16, tailY);
    ctx.lineTo(tailX, tailY + 22);
    ctx.lineTo(tailX + 16, tailY);
    ctx.closePath();

    // Dark sleek translucent gradient fill
    const grad = ctx.createLinearGradient(0, padY, 0, padY + bubbleH);
    grad.addColorStop(0, "rgba(15, 23, 42, 0.94)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0.96)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Vibrant border stroke
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)"; // Cyan glow
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Draw Sender Name Tag
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`💬 ${senderName}`, padX + 24, padY + 40);

    // Draw message text with word wrapping
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 26px 'Segoe UI', Arial, sans-serif";
    const maxWidth = bubbleW - 48;
    const words = text.split(" ");
    let line = "";
    let lineY = padY + 80;
    const lineHeight = 34;
    const maxLines = 3;
    let linesDrawn = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + (line ? " " : "") + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== "") {
        ctx.fillText(line, padX + 24, lineY);
        line = words[i];
        lineY += lineHeight;
        linesDrawn++;
        if (linesDrawn >= maxLines) {
          line = "...";
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, padX + 24, lineY);
    }
  }

  public update(dt: number) {
    if (!this.isVisible || !this.sprite || !this.material) return;

    this.timer += dt;

    if (this.timer < 0.25) {
      // 1. Pop-in scale with ease-out back curve
      const p = this.timer / 0.25;
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const ease = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
      const scale = Math.max(0.01, ease);
      this.sprite.scale.set(this.baseScale.x * scale, this.baseScale.y * scale, 1);
      this.material.opacity = Math.min(1, p * 4);
    } else if (this.timer < 3.2) {
      // 2. Stable floating hover
      this.sprite.scale.set(this.baseScale.x, this.baseScale.y, 1);
      this.material.opacity = 1.0;
      this.sprite.position.y = this.baseHeight + Math.sin(this.timer * 3.5) * 0.04;
    } else if (this.timer < this.duration) {
      // 3. Smooth fade-out and shrink
      const remaining = (this.duration - this.timer) / 0.8;
      this.material.opacity = Math.max(0, remaining);
      const shrink = 0.85 + 0.15 * remaining;
      this.sprite.scale.set(this.baseScale.x * shrink, this.baseScale.y * shrink, 1);
    } else {
      // 4. Finished duration: hide
      this.hide();
    }
  }

  public hide() {
    this.isVisible = false;
    if (this.sprite) {
      this.sprite.scale.set(0.001, 0.001, 1);
      if (this.material) this.material.opacity = 0;
    }
  }

  public destroy() {
    this.hide();
    if (this.sprite) {
      this.parent.remove(this.sprite);
      this.sprite = null;
    }
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
}
