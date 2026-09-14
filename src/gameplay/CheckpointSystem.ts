import * as THREE from "three";

export interface CheckpointTrigger {
  index: number;
  position: THREE.Vector3;
  radiusSq: number;
}

export interface CheckpointEvents {
  onCheckpointPassed?: (index: number) => void;
  onLapCompleted?: (lap: number, lapTime: number, isBest: boolean) => void;
  onWrongWayChanged?: (isWrongWay: boolean) => void;
}

export class CheckpointSystem {
  public checkpoints: CheckpointTrigger[] = [];
  public nextCheckpointIndex = 1; // Need to hit CP 1 first after start line (0)
  public currentLap = 1;
  public totalLaps = 3;

  private lapStartTime = performance.now();
  public currentLapTime = 0;
  public lastLapTime = 0;
  public bestLapTime = Infinity;

  public isWrongWay = false;
  private wrongWayTimeout = 0;

  private events: CheckpointEvents;

  constructor(waypoints: THREE.Vector3[], events: CheckpointEvents = {}) {
    this.events = events;

    // Build trigger spheres for each waypoint
    waypoints.forEach((wp, idx) => {
      this.checkpoints.push({
        index: idx,
        position: wp.clone().setY(1.0),
        radiusSq: 14 * 14, // 14m radius trigger area
      });
    });
  }

  public update(vehiclePos: THREE.Vector3, dt: number) {
    this.currentLapTime = (performance.now() - this.lapStartTime) / 1000;

    // Check wrong way timeout countdown
    if (this.wrongWayTimeout > 0) {
      this.wrongWayTimeout -= dt;
      if (this.wrongWayTimeout <= 0 && this.isWrongWay) {
        this.isWrongWay = false;
        this.events.onWrongWayChanged?.(false);
      }
    }

    // Evaluate target checkpoint
    const targetCP = this.checkpoints[this.nextCheckpointIndex];
    if (!targetCP) return;

    const distSq = vehiclePos.distanceToSquared(targetCP.position);

    if (distSq < targetCP.radiusSq) {
      // Correct sequential checkpoint passed!
      const passedIdx = this.nextCheckpointIndex;
      this.events.onCheckpointPassed?.(passedIdx);

      // Advance to next expected checkpoint
      this.nextCheckpointIndex = (this.nextCheckpointIndex + 1) % this.checkpoints.length;

      // Completed a full lap (passed finish line CP 0)
      if (passedIdx === 0) {
        this.lastLapTime = this.currentLapTime;
        const isBest = this.lastLapTime < this.bestLapTime;
        if (isBest) {
          this.bestLapTime = this.lastLapTime;
        }

        this.events.onLapCompleted?.(this.currentLap, this.lastLapTime, isBest);
        this.currentLap++;
        this.lapStartTime = performance.now();
      }
    } else {
      // Check for wrong way / reverse direction cheating attempt
      const previousIndex = (this.nextCheckpointIndex - 2 + this.checkpoints.length) % this.checkpoints.length;
      const prevCP = this.checkpoints[previousIndex];

      if (vehiclePos.distanceToSquared(prevCP.position) < prevCP.radiusSq) {
        if (!this.isWrongWay) {
          this.isWrongWay = true;
          this.wrongWayTimeout = 3.0; // Show warning for 3 seconds
          this.events.onWrongWayChanged?.(true);
        }
      }
    }
  }

  public resetRace() {
    this.currentLap = 1;
    this.nextCheckpointIndex = 1;
    this.lapStartTime = performance.now();
    this.currentLapTime = 0;
    this.lastLapTime = 0;
    this.bestLapTime = Infinity;
    this.isWrongWay = false;
  }
}
