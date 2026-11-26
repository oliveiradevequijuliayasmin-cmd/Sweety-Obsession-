/**
 * npc.ts — student AI: schedules, waypoint navigation, room spots, idle wander,
 * pair conversations, arrivals/departures, and scripted event support.
 */
import * as THREE from "three";
import type { StudentDef, PeriodId, RoomId } from "./types";
import type { SchoolWorld, RoomDefW } from "./world";
import { buildCharacter, updateRig, setExpression, type CharacterRig, type Expression } from "./characters";
import { NPC } from "./config";

export type NpcState = "idle" | "walk" | "sit" | "talk" | "gone" | "scripted";

interface SpotClaim { roomKey: string; idx: number; npcId: string }

export class Npc {
  def: StudentDef;
  rig: CharacterRig;
  group: THREE.Group;
  pos: THREE.Vector3;
  yaw = 0;
  state: NpcState = "idle";
  room: RoomDefW | null = null;
  private path: number[] = [];
  private pathIdx = 0;
  targetSpot: { x: number; z: number; sit: boolean } | null = null;
  private idleT = 0;
  private wanderTarget: { x: number; z: number } | null = null;
  private talkTimer = 0;
  private speed = NPC.WALK_SPEED;
  expression: Expression = "normal";

  constructor(def: StudentDef) {
    this.def = def;
    this.rig = buildCharacter(def.look);
    this.group = this.rig.root;
    this.pos = new THREE.Vector3(10, 0, 34);
  }

  get id(): string { return this.def.id; }

  setPos(x: number, y: number, z: number): void {
    this.pos.set(x, y, z);
    this.group.position.copy(this.pos);
  }

  /** Command the NPC to walk to a position (uses waypoint graph). */
  goTo(world: SchoolWorld, x: number, y: number, z: number, spot: { x: number; z: number; sit: boolean } | null = null): void {
    const from = world.nearestWaypoint(this.pos.x, this.pos.y, this.pos.z);
    const to = world.nearestWaypoint(x, y, z);
    const p = world.findPath(from, to);
    this.path = p ?? [];
    this.pathIdx = 0;
    // final leg from last waypoint to exact target
    this.targetSpot = spot ?? { x, z, sit: false };
    if (this.path.length === 0) this.path = [to];
    if (this.state !== "scripted") this.state = "walk";
  }

  face(x: number, z: number): void {
    this.yaw = Math.atan2(x - this.pos.x, z - this.pos.z);
  }

  sitHere(x: number, z: number, yaw?: number): void {
    this.state = "sit";
    this.pos.x = x; this.pos.z = z;
    if (yaw !== undefined) this.yaw = yaw;
    this.path = [];
    this.targetSpot = null;
  }

  talkFor(seconds: number): void {
    if (this.state === "gone") return;
    this.state = "talk";
    this.talkTimer = seconds;
    this.path = [];
  }

  leave(): void {
    this.state = "gone";
    this.group.visible = false;
    this.path = [];
  }

  arrive(world: SchoolWorld, x: number, z: number): void {
    this.state = "idle";
    this.group.visible = true;
    this.setPos(x, 0, z);
  }

  setExpression(e: Expression): void {
    this.expression = e;
    setExpression(this.rig, e, this.def.look);
  }

  update(dt: number, world: SchoolWorld, camPos: THREE.Vector3): void {
    if (this.state === "gone") return;
    const far = this.pos.distanceToSquared(camPos) > 3600; // 60m

    if (this.state === "walk" && this.path.length) {
      // current waypoint target: either path node or final spot
      const isFinal = this.pathIdx >= this.path.length;
      const tx = isFinal ? this.targetSpot!.x : world.waypoints[this.path[this.pathIdx]].x;
      const tz = isFinal ? this.targetSpot!.z : world.waypoints[this.path[this.pathIdx]].z;
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) {
        if (isFinal) {
          this.path = [];
          if (this.targetSpot?.sit) {
            this.sitHere(this.targetSpot.x, this.targetSpot.z, this.yaw);
          } else {
            this.state = "idle";
            this.idleT = 0;
          }
        } else {
          const wp = world.waypoints[this.path[this.pathIdx]];
          // stair teleport for NPCs
          const tp = world.stairCheck(wp.x, wp.z, wp.y);
          this.pathIdx++;
          if (tp) {
            this.pos.y = tp.y;
            this.pos.z = tp.z;
          } else if (wp.y !== this.pos.y && Math.abs(wp.y - this.pos.y) > 1.5) {
            this.pos.y = wp.y; // level links snap (stairs)
          }
        }
      } else {
        const vyaw = Math.atan2(dx, dz);
        let dy = vyaw - this.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += dy * Math.min(1, dt * 8);
        const sp = this.speed;
        this.pos.x += Math.sin(this.yaw) * sp * dt;
        this.pos.z += Math.cos(this.yaw) * sp * dt;
        const ground = world.heightAt(this.pos.x, this.pos.z, this.pos.y);
        this.pos.y += (ground - this.pos.y) * Math.min(1, dt * 10);
        if (!far) this.rig.anim.mode = "walk";
      }
    } else if (this.state === "idle") {
      if (!far) this.rig.anim.mode = "idle";
      this.idleT += dt;
    } else if (this.state === "talk") {
      this.talkTimer -= dt;
      if (!far) this.rig.anim.mode = "talk";
      if (this.talkTimer <= 0) { this.state = "idle"; this.idleT = 0; }
    } else if (this.state === "sit") {
      if (!far) this.rig.anim.mode = "sit";
    } else if (this.state === "scripted") {
      // externally driven
    }

    this.group.position.copy(this.pos);
    if (this.state === "sit") this.group.position.y = this.pos.y - 0.42;
    this.group.rotation.y = this.yaw;
    if (!far) updateRig(this.rig, dt, this.def.look);
  }
}

/* ------------------------------------------------------------------ */
/* NPC manager: schedules, spots, events                                 */
/* ------------------------------------------------------------------ */

import { ALL_NPCS } from "./data/students";

export class NpcManager {
  readonly npcs: Npc[] = [];
  private byId = new Map<string, Npc>();
  private claims: SpotClaim[] = [];
  private rng: () => number;

  constructor(private world: SchoolWorld, seedFn: () => number) {
    this.rng = seedFn;
    for (const def of ALL_NPCS) {
      const n = new Npc(def);
      this.npcs.push(n);
      this.byId.set(n.id, n);
    }
  }

  get(id: string): Npc | undefined { return this.byId.get(id); }

  addTo(scene: THREE.Object3D): void {
    for (const n of this.npcs) scene.add(n.group);
  }

  /** (Re)assign everyone according to the new period. */
  onPeriod(period: PeriodId, day: number): void {
    this.claims = [];
    for (const n of this.npcs) {
      const roomId = n.def.schedule[period] ?? "patio";
      if (period === "saida") {
        // walk to the gate and leave
        n.group.visible = true;
        if (n.pos.z < 28) {
          n.goTo(this.world, 11, 0, 33.5);
          n.state = "walk";
        } else {
          n.leave();
        }
        continue;
      }
      if (period === "chegada") {
        // spawn on the street and walk in
        n.group.visible = true;
        const gx = 6 + this.rng() * 10;
        n.setPos(gx, 0, 35.5);
        n.goTo(this.world, -8 + this.rng() * 22, 0, 2 + this.rng() * 12);
        continue;
      }
      if (!n.group.visible) {
        n.group.visible = true;
        n.setPos(10 + this.rng() * 4, 0, 34);
      }
      this.sendToRoom(n, roomId as RoomId, period);
    }
  }

  sendToRoom(n: Npc, roomId: RoomId, period: PeriodId): void {
    const room = this.world.roomById(roomId) ?? this.world.roomById("patio")!;
    // claim a spot
    let spot: { x: number; z: number; sit: boolean } | null = null;
    if (room.spots.length) {
      const idx = this.claimSpot(room, n.id);
      const s = room.spots[idx % room.spots.length];
      const sitWanted = (period.startsWith("aula")) || (roomId === "refeitorio") || (roomId === "biblioteca");
      spot = { x: s.x, z: s.z, sit: sitWanted && s.sit };
    } else {
      spot = {
        x: room.rect.x0 + 1.5 + this.rng() * (room.rect.x1 - room.rect.x0 - 3),
        z: room.rect.z0 + 1.5 + this.rng() * (room.rect.z1 - room.rect.z0 - 3),
        sit: false,
      };
    }
    n.room = room;
    n.goTo(this.world, spot.x, room.floor, spot.z, spot);
    // desks face the blackboard (north)
    if (roomId.startsWith("sala")) {
      n.yaw = Math.PI;
    }
  }

  private claimSpot(room: RoomDefW, npcId: string): number {
    const key = `${room.id}_${room.floor}`;
    let idx = 0;
    while (this.claims.some((c) => c.roomKey === key && c.idx === idx)) idx++;
    this.claims.push({ roomKey: key, idx, npcId });
    return idx;
  }

  /** Random pair conversations among idle NPCs in the same room. */
  private chatT = 0;
  update(dt: number, camPos: THREE.Vector3): void {
    this.chatT -= dt;
    for (const n of this.npcs) n.update(dt, this.world, camPos);
    if (this.chatT <= 0) {
      this.chatT = 3 + this.rng() * 4;
      const idle = this.npcs.filter((n) => n.state === "idle" && n.group.visible);
      for (let i = 0; i < idle.length; i++) {
        for (let j = i + 1; j < idle.length; j++) {
          const a = idle[i], b = idle[j];
          if (a.room !== b.room) continue;
          const d2 = a.pos.distanceToSquared(b.pos);
          if (d2 < 6.5 && this.rng() < 0.5) {
            a.face(b.pos.x, b.pos.z);
            b.face(a.pos.x, a.pos.z);
            a.talkFor(8 + this.rng() * 10);
            b.talkFor(8 + this.rng() * 10);
          }
        }
      }
    }
  }

  /** Despawn NPCs that reached the gate during "saida". */
  sweepGone(): void {
    for (const n of this.npcs) {
      if (n.state === "walk" && n.targetSpot && n.targetSpot.z > 30 && n.pos.z > 32) {
        n.leave();
      }
    }
  }
}
