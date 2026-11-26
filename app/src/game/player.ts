/**
 * player.ts — third-person hero controller + orbit camera + collision + stair transitions.
 * Camera convention: camYaw=0 ⇒ camera behind player at +Z, looking -Z; W moves -Z.
 */
import * as THREE from "three";
import type { SchoolWorld } from "./world";
import type { Input } from "./input";
import { PLAYER, CAMERA } from "./config";
import { buildCharacter, updateRig, type CharacterRig } from "./characters";
import type { CharLook } from "./types";

export class Player {
  rig: CharacterRig;
  group: THREE.Group;
  pos: THREE.Vector3;
  look: CharLook;
  yaw = 0;                // facing -Z (into the school)
  camYaw = 0;             // camera behind at +Z, looking -Z: W moves -Z, D moves +X
  camPitch = 0.22;
  running = false;
  frozen = false;         // during dialogue/cutscene
  moving = false;
  runToggle = false;      // touch run button
  stairFlash = 0;
  private bob = 0;

  constructor(look: CharLook, x: number, z: number) {
    this.look = look;
    this.rig = buildCharacter(look);
    this.group = this.rig.root;
    this.pos = new THREE.Vector3(x, 0, z);
    this.group.position.copy(this.pos);
  }

  setSpawn(x: number, z: number): void {
    this.pos.set(x, 0, z);
    this.group.position.copy(this.pos);
    this.camYaw = 0;   // camera south of player, looking north into the school
    this.yaw = 0;
    this.rig.anim.mode = "idle";
  }

  applyLook(look: CharLook): void {
    this.look = look;
    const parent = this.group.parent;
    const oldGroup = this.group;
    const oldRig = this.rig;
    this.rig = buildCharacter(look);
    this.group = this.rig.root;
    if (parent) {
      parent.remove(oldGroup);
      parent.add(this.group);
    }
    this.group.position.copy(oldGroup.position);
    this.group.rotation.y = oldGroup.rotation.y;
    // dispose old face texture
    oldRig.faceMat.map?.dispose();
    oldRig.faceMat.dispose();
  }

  update(dt: number, input: Input, world: SchoolWorld, portrait: boolean): void {
    const lookDelta = input.consumeLook();
    this.camYaw -= lookDelta.yaw;
    this.camPitch = clamp(this.camPitch + lookDelta.pitch, CAMERA.MIN_PITCH, CAMERA.MAX_PITCH);

    let mx = 0, mz = 0;
    if (!this.frozen) {
      mx = input.moveX; mz = input.moveZ;
    }
    const mag = Math.hypot(mx, mz);
    this.moving = mag > 0.1;
    this.running = this.moving && (input.isHeld("ShiftLeft") || input.isHeld("ShiftRight") || this.runToggle);

    if (this.moving) {
      const nx = mx / Math.max(1, mag), nz = mz / Math.max(1, mag);
      // forward on ground plane = direction the camera looks
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
      // right = forward × up (right-handed) → (fz·1? ) use rx = -fz? verify: camYaw=π ⇒ f=(0,1)?? no:
      // f = (-sin π, -cos π) = (0, 1) → +Z is "forward" when camYaw=π (camera at -Z behind, looking +Z). OK consistent.
      const rx = -fz, rz = fx;
      const dx = fx * nz + rx * nx;
      const dz = fz * nz + rz * nx;
      const speed = this.running ? PLAYER.RUN_SPEED : PLAYER.WALK_SPEED;
      let nx2 = this.pos.x + dx * speed * dt;
      let nz2 = this.pos.z + dz * speed * dt;
      const c1 = world.collide(nx2, this.pos.z, this.pos.y, PLAYER.RADIUS);
      nx2 = c1.x;
      const c2 = world.collide(nx2, nz2, this.pos.y, PLAYER.RADIUS);
      nz2 = c2.z;
      const c3 = world.collide(nx2, nz2, this.pos.y, PLAYER.RADIUS);
      this.pos.x = c3.x; this.pos.z = c3.z;

      const targetYaw = Math.atan2(dx, dz);
      let dy = targetYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 12);

      this.bob += dt * (this.running ? 13 : 9);
      this.rig.anim.mode = this.running ? "run" : "walk";
    } else if (!this.frozen && this.rig.anim.mode !== "sit" && this.rig.anim.mode !== "phone" && this.rig.anim.mode !== "gift") {
      this.rig.anim.mode = "idle";
    }

    // stairs
    const stair = world.stairCheck(this.pos.x, this.pos.z, this.pos.y);
    if (stair) {
      this.pos.y = stair.y;
      this.pos.z = stair.z;
      this.stairFlash = 0.22;
    }
    const ground = world.heightAt(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y += (ground - this.pos.y) * Math.min(1, dt * 14);
    if (Math.abs(this.pos.y - ground) < 0.02) this.pos.y = ground;
    if (this.stairFlash > 0) this.stairFlash -= dt;

    this.group.position.copy(this.pos);
    if (this.rig.anim.mode === "sit") this.group.position.y = this.pos.y - 0.42;
    else if (this.moving) this.group.position.y = this.pos.y + Math.abs(Math.sin(this.bob)) * 0.045;
    this.group.rotation.y = this.yaw;
    updateRig(this.rig, dt, this.look);
  }

  updateCamera(camera: THREE.PerspectiveCamera, portrait: boolean): void {
    const dist = portrait ? CAMERA.DIST_PORTRAIT : CAMERA.DIST;
    const cy = Math.cos(this.camPitch), sy = Math.sin(this.camPitch);
    const ox = Math.sin(this.camYaw) * cy * dist;
    const oz = Math.cos(this.camYaw) * cy * dist;
    const eye = this.pos.y + CAMERA.HEIGHT;
    camera.position.set(this.pos.x + ox, eye + sy * dist, this.pos.z + oz);
    camera.lookAt(this.pos.x, eye - 0.15, this.pos.z);
  }
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
