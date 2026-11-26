/**
 * world.ts — Lianhua High School: procedural construction, collision, height field,
 * stair transitions, waypoint navigation graph, room metadata and interactable spots.
 *
 * Layout (meters, X east / Z south):
 *  - Main building (2 floors + rooftop) north of the courtyard:  x [-30,30], z [-22,-6]
 *    usable interior x [-27,27] (stair shafts at both ends), corridor z [-11,-7]
 *  - East wing (cafeteria + kitchen):                            x [32,46],  z [-18,2]
 *  - West wing (gym + locker rooms):                             x [-46,-32], z [-18,10]
 *  - South annex (bathrooms, club room, reception):              z [22,30], x [-30,16]
 *  - Gate at z=30; street outside. Courtyard with garden (W) and court (E).
 * Floors change through stair shafts (teleport zones with a fade).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface Rect { x0: number; z0: number; x1: number; z1: number; }
export interface WallBox extends Rect { y0: number; y1: number; }
export interface RoomDefW {
  id: string;
  name: string;
  rect: Rect;
  floor: number; // base y
  spots: { x: number; z: number; sit: boolean }[];
  center: { x: number; z: number };
}

export interface Waypoint { id: number; x: number; y: number; z: number; links: number[]; }
export interface StairZone { x0: number; z0: number; x1: number; z1: number; }

const FLOOR2 = 4, ROOF = 8;

export class SchoolWorld {
  readonly group = new THREE.Group();
  readonly walls: WallBox[] = [];
  readonly rooms: RoomDefW[] = [];
  readonly waypoints: Waypoint[] = [];
  private wpIndex = new Map<string, number>();

  constructor() {
    this.buildRooms();
    this.buildWallCollision();
    this.buildGeometry();
    this.buildWaypoints();
  }

  /* ------------------------------------------------------------------ */
  /* Room metadata + spots                                               */
  /* ------------------------------------------------------------------ */

  private room(id: string, name: string, rect: Rect, floor: number, spots: RoomDefW["spots"] = []): void {
    this.rooms.push({ id, name, rect, floor, spots, center: { x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2 } });
  }

  private gridSpots(rect: Rect, cols: number, rows: number, sit = true, margin = 1.7): RoomDefW["spots"] {
    const out: RoomDefW["spots"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: rect.x0 + margin + (c + 0.5) * ((rect.x1 - rect.x0 - margin * 2) / cols),
          z: rect.z0 + margin + (r + 0.5) * ((rect.z1 - rect.z0 - margin * 2) / rows),
          sit,
        });
      }
    }
    return out;
  }

  private buildRooms(): void {
    const R = this.room.bind(this);
    // ground floor rooms (behind corridor, z -21..-11)
    R("deposito", "Depósito", { x0: -27, z0: -21, x1: -22.5, z1: -11 }, 0, this.gridSpots({ x0: -27, z0: -21, x1: -22.5, z1: -11 }, 2, 2, false));
    R("sala1a", "Sala 1-A", { x0: -22.5, z0: -21, x1: -14.5, z1: -11 }, 0, this.gridSpots({ x0: -22.5, z0: -21, x1: -14.5, z1: -11 }, 4, 5));
    R("sala1b", "Sala 1-B", { x0: -14.5, z0: -21, x1: -6.5, z1: -11 }, 0, this.gridSpots({ x0: -14.5, z0: -21, x1: -6.5, z1: -11 }, 4, 5));
    R("sala2a", "Sala 2-A", { x0: -6.5, z0: -21, x1: 1.5, z1: -11 }, 0, this.gridSpots({ x0: -6.5, z0: -21, x1: 1.5, z1: -11 }, 4, 5));
    R("sala2b", "Sala 2-B", { x0: 1.5, z0: -21, x1: 9.5, z1: -11 }, 0, this.gridSpots({ x0: 1.5, z0: -21, x1: 9.5, z1: -11 }, 4, 5));
    R("professores", "Sala dos Professores", { x0: 9.5, z0: -21, x1: 14.5, z1: -11 }, 0, this.gridSpots({ x0: 9.5, z0: -21, x1: 14.5, z1: -11 }, 2, 3));
    R("diretoria", "Diretoria", { x0: 14.5, z0: -21, x1: 19.5, z1: -11 }, 0, this.gridSpots({ x0: 14.5, z0: -21, x1: 19.5, z1: -11 }, 2, 2));
    R("enfermaria", "Enfermaria", { x0: 19.5, z0: -21, x1: 27, z1: -11 }, 0, this.gridSpots({ x0: 19.5, z0: -21, x1: 27, z1: -11 }, 3, 2));
    R("corredor", "Corredor Térreo", { x0: -27, z0: -11, x1: 27, z1: -7 }, 0);
    R("corredor", "Corredor Superior", { x0: -27, z0: -11, x1: 27, z1: -7 }, FLOOR2);
    R("escadas", "Escadaria", { x0: -30, z0: -21.5, x1: -27, z1: -7 }, 0);
    R("escadas", "Escadaria", { x0: 27, z0: -21.5, x1: 30, z1: -7 }, 0);
    // upper floor
    R("biblioteca", "Biblioteca", { x0: -27, z0: -21, x1: -17, z1: -11 }, FLOOR2, this.gridSpots({ x0: -27, z0: -21, x1: -17, z1: -11 }, 4, 3));
    R("lab_ciencias", "Laboratório de Ciências", { x0: -17, z0: -21, x1: -9, z1: -11 }, FLOOR2, this.gridSpots({ x0: -17, z0: -21, x1: -9, z1: -11 }, 3, 3));
    R("lab_info", "Laboratório de Informática", { x0: -9, z0: -21, x1: -1, z1: -11 }, FLOOR2, this.gridSpots({ x0: -9, z0: -21, x1: -1, z1: -11 }, 3, 3));
    R("musica", "Sala de Música", { x0: -1, z0: -21, x1: 7, z1: -11 }, FLOOR2, this.gridSpots({ x0: -1, z0: -21, x1: 7, z1: -11 }, 3, 3));
    R("artes", "Sala de Artes", { x0: 7, z0: -21, x1: 15, z1: -11 }, FLOOR2, this.gridSpots({ x0: 7, z0: -21, x1: 15, z1: -11 }, 3, 3));
    R("conselho", "Sala do Conselho Estudantil", { x0: 15, z0: -21, x1: 21, z1: -11 }, FLOOR2, this.gridSpots({ x0: 15, z0: -21, x1: 21, z1: -11 }, 3, 2));
    R("armazenamento", "Sala de Armazenamento", { x0: 21, z0: -21, x1: 27, z1: -11 }, FLOOR2, this.gridSpots({ x0: 21, z0: -21, x1: 27, z1: -11 }, 2, 2, false));
    // rooftop
    R("telhado", "Telhado", { x0: -30, z0: -22, x1: 30, z1: -6 }, ROOF, [
      { x: -20, z: -14, sit: true }, { x: 20, z: -14, sit: true }, { x: 0, z: -12, sit: false }, { x: 12, z: -18, sit: true },
    ]);
    // wings
    R("refeitorio", "Refeitório", { x0: 32, z0: -18, x1: 46, z1: -4 }, 0, this.gridSpots({ x0: 32, z0: -18, x1: 46, z1: -4 }, 4, 4));
    R("cozinha", "Cozinha", { x0: 32, z0: -4, x1: 46, z1: 2 }, 0, this.gridSpots({ x0: 32, z0: -4, x1: 46, z1: 2 }, 3, 2, false));
    R("ginasio", "Ginásio Esportivo", { x0: -46, z0: -18, x1: -32, z1: 4 }, 0, [
      { x: -39, z: -7, sit: false }, { x: -42, z: -3, sit: false }, { x: -36, z: -3, sit: false },
      { x: -39, z: 0, sit: false }, { x: -44, z: -10, sit: false }, { x: -34, z: -10, sit: false },
    ]);
    R("vestiario", "Vestiários", { x0: -46, z0: 4, x1: -32, z1: 10 }, 0, this.gridSpots({ x0: -46, z0: 4, x1: -32, z1: 10 }, 3, 2, false));
    // annex
    R("banheiro", "Banheiros", { x0: -30, z0: 22, x1: -20, z1: 30 }, 0);
    R("sala_clubes", "Sala de Clubes", { x0: -20, z0: 22, x1: -4, z1: 30 }, 0, [
      { x: -17, z: 26, sit: true }, { x: -14, z: 27, sit: true }, { x: -10, z: 25, sit: true }, { x: -7, z: 27, sit: true },
    ]);
    R("portaria", "Portaria", { x0: 4, z0: 22, x1: 16, z1: 30 }, 0, [{ x: 10, z: 26, sit: false }]);
    // outdoor
    R("patio", "Pátio Central", { x0: -30, z0: -6, x1: 30, z1: 22 }, 0, [
      { x: -4, z: 0, sit: false }, { x: 4, z: 0, sit: false }, { x: 0, z: 10, sit: false },
      { x: -14, z: 2, sit: false }, { x: 14, z: 2, sit: false }, { x: -8, z: -2, sit: false }, { x: 8, z: -2, sit: false },
    ]);
    R("jardim", "Jardim", { x0: -24, z0: 6, x1: -4, z1: 20 }, 0, [
      { x: -14, z: 12, sit: true }, { x: -19, z: 10, sit: true }, { x: -9, z: 10, sit: true },
      { x: -12, z: 16, sit: false }, { x: -20, z: 16, sit: true },
    ]);
    R("quadra", "Quadra Externa", { x0: 6, z0: 6, x1: 24, z1: 20 }, 0, [
      { x: 15, z: 12, sit: false }, { x: 10, z: 9, sit: false }, { x: 20, z: 15, sit: false }, { x: 12, z: 17, sit: false },
    ]);
    R("rua", "Rua", { x0: -30, z0: 30, x1: 30, z1: 38 }, 0, [{ x: 10, z: 34, sit: false }]);
  }

  roomAt(x: number, z: number, y: number): RoomDefW | null {
    let best: RoomDefW | null = null;
    for (const r of this.rooms) {
      const tol = r.id === "telhado" ? 1.2 : 2.2;
      if (y >= r.floor - tol && y <= r.floor + tol && x >= r.rect.x0 && x <= r.rect.x1 && z >= r.rect.z0 && z <= r.rect.z1) {
        if (!best || r.floor >= best.floor) best = r;
      }
    }
    return best;
  }

  roomById(id: string, floor?: number): RoomDefW | null {
    for (const r of this.rooms) if (r.id === id && (floor === undefined || r.floor === floor)) return r;
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Stair zones (teleport-based floor transitions)                      */
  /* ------------------------------------------------------------------ */

  private static readonly SHAFT_W: StairZone = { x0: -30, z0: -21.5, x1: -27, z1: -7 };
  private static readonly SHAFT_E: StairZone = { x0: 27, z0: -21.5, x1: 30, z1: -7 };

  private inShaft(x: number, z: number): boolean {
    const s = (r: StairZone) => x >= r.x0 - 0.2 && x <= r.x1 + 0.2 && z >= r.z0 - 0.2 && z <= r.z1 + 0.2;
    return s(SchoolWorld.SHAFT_W) || s(SchoolWorld.SHAFT_E);
  }

  /** Ground height at (x,z) given walker's current height. */
  heightAt(x: number, z: number, curY: number): number {
    if (this.inShaft(x, z)) {
      if (z > -13) return curY > 2 ? FLOOR2 : 0;
      if (z > -18) return FLOOR2;
      return ROOF;
    }
    const main = x >= -30 && x <= 30 && z >= -22 && z <= -6;
    if (main) {
      if (curY > FLOOR2 + 2.5) return ROOF;
      if (curY > 2.0) return FLOOR2;
      return 0;
    }
    return 0;
  }

  /**
   * Stair transition check. Returns a teleport target {y,z} when crossing a stair
   * boundary, or null. x must be inside a shaft.
   */
  stairCheck(x: number, z: number, curY: number): { y: number; z: number } | null {
    if (!this.inShaft(x, z)) return null;
    const crossA = Math.abs(z - (-13)) < 0.35; // ground ↔ floor 2 boundary
    const crossB = Math.abs(z - (-18)) < 0.35; // floor 2 ↔ roof boundary
    if (crossA) {
      if (curY < 2) return { y: FLOOR2, z: -14.2 };
      if (curY > 3) return { y: 0, z: -11.8 };
    }
    if (crossB) {
      if (curY > 6) return { y: FLOOR2, z: -16.8 };
      if (curY >= 3.5) return { y: ROOF, z: -19.2 };
    }
    return null;
  }

  /** Circle-vs-wall resolution in XZ + roof edge clamp. */
  collide(px: number, pz: number, y: number, radius: number): { x: number; z: number } {
    let x = px, z = pz;
    for (const w of this.walls) {
      if (y + 1.4 < w.y0 || y + 0.2 > w.y1) continue;
      const cx = clamp(x, w.x0, w.x1);
      const cz = clamp(z, w.z0, w.z1);
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * radius;
          z = cz + (dz / d) * radius;
        } else {
          const pushL = x - w.x0 + radius, pushR = w.x1 - x + radius;
          const pushT = z - w.z0 + radius, pushB = w.z1 - z + radius;
          const m = Math.min(pushL, pushR, pushT, pushB);
          if (m === pushL) x = w.x0 - radius;
          else if (m === pushR) x = w.x1 + radius;
          else if (m === pushT) z = w.z0 - radius;
          else z = w.z1 + radius;
        }
      }
    }
    // roof deck edge clamp (parapets)
    if (y > 7) {
      x = clamp(x, -29.5, 29.5);
      z = clamp(z, -21.4, -6.5);
    }
    x = clamp(x, -48.5, 48.5);
    z = clamp(z, -25.4, 37.4);
    return { x, z };
  }

  /* ------------------------------------------------------------------ */
  /* Walls (collision)                                                   */
  /* ------------------------------------------------------------------ */

  private wall(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): void {
    this.walls.push({ x0, z0, x1, z1, y0, y1 });
  }

  private wallWithGaps(axis: "x" | "z", fixed: number, from: number, to: number, gaps: [number, number][], y0: number, y1: number, thick = 0.4): void {
    let cur = from;
    const segs: [number, number][] = [];
    const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
    for (const [g0, g1] of sorted) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < to) segs.push([cur, to]);
    for (const [a, b] of segs) {
      if (axis === "x") this.wall(a, fixed - thick / 2, b, fixed + thick / 2, y0, y1);
      else this.wall(fixed - thick / 2, a, fixed + thick / 2, b, y0, y1);
    }
  }

  private buildWallCollision(): void {
    const T = 0.4;
    // main building outer walls
    this.wallWithGaps("x", -6, -27, 30, [[-21, -19], [-11, -9], [-1, 1], [9, 11], [19, 21]], 0, FLOOR2, T);
    this.wallWithGaps("x", -6, -27, 30, [], FLOOR2, ROOF, T);       // upper front
    this.wall(-30, -6 - T / 2, -27, -6 + T / 2, 0, ROOF);           // west tower front
    this.wall(27, -6 - T / 2, 30, -6 + T / 2, 0, ROOF);             // east tower front
    this.wall(-30, -22 - T / 2, 30, -22 + T / 2, 0, ROOF + 1.2);    // back + parapet
    // stair shaft walls
    this.wall(-30 - T / 2, -22, -30 + T / 2, -6, 0, ROOF);         // outer west
    this.wall(30 - T / 2, -22, 30 + T / 2, -6, 0, ROOF);           // outer east
    this.wall(-27 - T / 2, -22, -27 + T / 2, -6, 0, ROOF);         // inner west (full)
    this.wall(27 - T / 2, -22, 27 + T / 2, -6, 0, ROOF);           // inner east (full)
    // corridor/room divider (z=-11)
    const gaps: [number, number][] = [[-25.7, -24], [-19.6, -17.6], [-11.6, -9.6], [-3.6, -1.6], [4.4, 6.4], [10.8, 13.2], [16, 18], [22.2, 24.3]];
    this.wallWithGaps("x", -11, -27, 27, gaps, 0, FLOOR2, T);
    this.wallWithGaps("x", -11, -27, 27, gaps, FLOOR2, ROOF, T);
    // ground floor room dividers
    for (const x of [-22.5, -14.5, -6.5, 1.5, 9.5, 14.5, 19.5]) {
      this.wall(x - T / 2, -21, x + T / 2, -11, 0, FLOOR2);
    }
    // upper floor room dividers
    for (const x of [-17, -9, -1, 7, 15, 21]) {
      this.wall(x - T / 2, -21, x + T / 2, -11, FLOOR2, ROOF);
    }
    // east wing (refeitório + cozinha)
    this.wallWithGaps("z", 32, -18, 2, [[-2, 2]], 0, FLOOR2, T);
    this.wall(46 - T / 2, -18, 46 + T / 2, 2, 0, FLOOR2);
    this.wall(32, -18 - T / 2, 46, -18 + T / 2, 0, FLOOR2);
    this.wall(32, 2 - T / 2, 46, 2 + T / 2, 0, FLOOR2);
    this.wallWithGaps("x", -4, 32, 46, [[38, 42]], 0, FLOOR2, T);
    // west wing (ginásio + vestiários)
    this.wallWithGaps("z", -32, -18, 4, [[-6, -2]], 0, 6, T);
    this.wall(-46 - T / 2, -18, -46 + T / 2, 10, 0, 6);
    this.wall(-46, -18 - T / 2, -32, -18 + T / 2, 0, 6);
    this.wallWithGaps("x", 4, -46, -32, [[-44, -42], [-36, -34]], 0, 4, T);
    this.wall(-46, 10 - T / 2, -32, 10 + T / 2, 0, 4);
    this.wallWithGaps("z", -39, 4, 10, [[6, 8]], 0, 4, T);
    // annex (z 22..30)
    this.wallWithGaps("x", 22, -30, 16, [[-28, -24], [-14, -10], [8, 12]], 0, FLOOR2, T);
    this.wallWithGaps("x", 30, -30, 16, [[8, 14]], 0, FLOOR2 + 1.5, T);
    this.wall(-30 - T / 2, 22, -30 + T / 2, 30, 0, FLOOR2);
    this.wall(16 - T / 2, 22, 16 + T / 2, 30, 0, FLOOR2);
    this.wallWithGaps("z", -20, 22, 30, [[24, 26]], 0, FLOOR2, T);
    this.wallWithGaps("z", -4, 22, 30, [[24, 26]], 0, FLOOR2, T);
    this.wall(-25 - T / 2, 22, -25 + T / 2, 30, 0, FLOOR2);
    // campus fence
    this.wall(-50, -26, 50, -25.6, 0, 2.4);
    this.wall(-50, 38, 50, 38.4, 0, 2.4);
    this.wall(-50, -26, -49.6, 38, 0, 2.4);
    this.wall(49.6, -26, 50, 38, 0, 2.4);
  }

  /* ------------------------------------------------------------------ */
  /* Visual geometry (merged by material)                                */
  /* ------------------------------------------------------------------ */

  private buildGeometry(): void {
    const buckets = new Map<string, THREE.BufferGeometry[]>();
    const put: Putter = (mat, geo, x, y, z, ry = 0) => {
      if (ry) geo.rotateY(ry);
      geo.translate(x, y, z);
      if (!buckets.has(mat)) buckets.set(mat, []);
      buckets.get(mat)!.push(geo);
    };
    const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

    /* ground */
    {
      const g = new THREE.PlaneGeometry(120, 90);
      g.rotateX(-Math.PI / 2);
      put("grass", g, 0, 0, 8);
      put("pave", new THREE.PlaneGeometry(64, 30).rotateX(-Math.PI / 2), 0, 0.02, 8);
      put("path", new THREE.PlaneGeometry(6, 40).rotateX(-Math.PI / 2), 0, 0.04, 8);
      put("path", new THREE.PlaneGeometry(40, 5).rotateX(-Math.PI / 2), -20, 0.04, 6);
      put("path", new THREE.PlaneGeometry(40, 5).rotateX(-Math.PI / 2), 20, 0.04, 6);
      put("asphalt", new THREE.PlaneGeometry(100, 10).rotateX(-Math.PI / 2), 0, 0.03, 34);
      put("path", new THREE.PlaneGeometry(8, 10).rotateX(-Math.PI / 2), 11, 0.05, 33);
    }

    /* slabs */
    const slab = (x0: number, z0: number, x1: number, z1: number, y: number, mat: string) => {
      put(mat, box(x1 - x0, 0.3, z1 - z0), (x0 + x1) / 2, y - 0.15, (z0 + z1) / 2);
    };
    slab(-27, -22, 27, -6, FLOOR2, "floor2");       // 2nd floor slab (rooms + corridor)
    slab(-27, -22, 27, -6, ROOF, "roof");           // main roof deck
    slab(-30, -22, -27, -18, ROOF, "roof");         // roof cap west (over stair Z3 exit)
    slab(27, -22, 30, -18, ROOF, "roof");
    slab(32, -18, 46, 2, FLOOR2, "roofw");
    slab(-46, -18, -32, 10, 4.6, "roofw");
    slab(-30, 22, 16, 30, FLOOR2, "roofw");
    put("wallwhite", box(54, 1.1, 0.3), 0, ROOF + 0.55, -6.15);
    put("wallwhite", box(54, 1.1, 0.3), 0, ROOF + 0.55, -21.85);

    /* walls visual from collision list */
    for (const w of this.walls) {
      const h = w.y1 - w.y0;
      put(h > 5 ? "wallwhite" : "wallin", box(w.x1 - w.x0, h, w.z1 - w.z0), (w.x0 + w.x1) / 2, w.y0 + h / 2, (w.z0 + w.z1) / 2);
    }

    /* stair steps visual inside shafts */
    this.stairsVisual(put, -28.5);
    this.stairsVisual(put, 28.5);

    /* windows */
    for (let x = -24; x <= 24; x += 6) {
      put("glass", box(3.2, 1.8, 0.1), x, 6, -6.25);
      put("glass", box(3.2, 1.6, 0.1), x, 2.2, -6.25);
    }
    for (let x = -24; x <= 24; x += 8) put("glass", box(3.4, 1.7, 0.1), x, 6, -21.75);

    /* main gate */
    put("roofw", box(0.6, 4.4, 0.6), 7.2, 2.2, 30);
    put("roofw", box(0.6, 4.4, 0.6), 14.8, 2.2, 30);
    put("roofw", box(9.4, 0.7, 1.2), 11, 4.6, 30);
    put("sign", box(7.4, 1.1, 0.15), 11, 3.6, 30);

    /* flag pole */
    put("pole", new THREE.CylinderGeometry(0.06, 0.08, 9, 8), 0, 4.5, -2);
    put("flag", new THREE.PlaneGeometry(1.8, 1.1), 0.95, 8.2, -2);

    /* sakura + trees */
    this.sakuraTree(put, 0, 8);
    for (const [tx, tz] of [[-26, -2], [26, -2], [-26, 20], [26, 20], [-8, 24], [24, 24]] as const) {
      this.greenTree(put, tx, tz);
    }

    /* garden */
    put("pond", new THREE.CylinderGeometry(2.2, 2.2, 0.25, 20), -14, 0.12, 14);
    {
      const petal = new THREE.CircleGeometry(0.09, 6);
      const petals: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 140; i++) {
        const fx = -22 + (i % 14) * 1.3 + ((i * 37) % 10) / 12;
        const fz = 8 + Math.floor(i / 14) * 1.15 + ((i * 53) % 10) / 14;
        if (fx > -5 || Math.hypot(fx + 14, fz - 14) < 2.6) continue;
        const p = petal.clone().rotateX(-Math.PI / 2);
        p.translate(fx, 0.35, fz);
        petals.push(p);
      }
      if (petals.length) put("flowers", mergeGeometries(petals)!, 0, 0, 0);
    }
    put("leafy", box(19, 0.5, 0.6), -14, 0.25, 7.2);
    // pavilion
    for (const [px, pz] of [[-20, 17], [-8, 17], [-20, 12], [-8, 12]] as const) put("wood", box(0.25, 2.8, 0.25), px, 1.4, pz);
    put("roofw", box(14, 0.4, 6.6), -14, 3, 14.5);
    put("wood", box(11, 0.35, 0.9), -14, 0.55, 17);
    put("wood", box(11, 0.35, 0.9), -14, 0.55, 12);
    // benches
    for (const [bx, bz, r] of [[-6, 4, 0], [6, 4, 0], [-16, 2, Math.PI / 2], [16, 2, Math.PI / 2]] as const) {
      put("wood", box(2.4, 0.12, 0.6), bx, 0.55, bz, r);
      put("metal", box(0.12, 0.55, 0.5), bx - 1, 0.28, bz, r);
      put("metal", box(0.12, 0.55, 0.5), bx + 1, 0.28, bz, r);
    }

    /* basketball court */
    {
      put("court", new THREE.PlaneGeometry(18, 14).rotateX(-Math.PI / 2), 15, 0.05, 13);
      put("line", new THREE.PlaneGeometry(18, 0.15).rotateX(-Math.PI / 2), 15, 0.07, 6.2);
      put("line", new THREE.PlaneGeometry(18, 0.15).rotateX(-Math.PI / 2), 15, 0.07, 19.8);
      put("line", new THREE.PlaneGeometry(0.15, 14).rotateX(-Math.PI / 2), 6.2, 0.07, 13);
      put("line", new THREE.PlaneGeometry(0.15, 14).rotateX(-Math.PI / 2), 23.8, 0.07, 13);
      put("line", new THREE.RingGeometry(1.6, 1.75, 24).rotateX(-Math.PI / 2), 15, 0.07, 13);
      for (const side of [-1, 1]) {
        const hx = 15 + side * 7.2;
        put("metal", box(0.18, 3.4, 0.18), hx, 1.7, 13);
        put("board", box(0.1, 1.1, 1.6), hx + side * 0.15, 3.1, 13);
        put("ring", new THREE.TorusGeometry(0.3, 0.03, 6, 14).rotateY(Math.PI / 2), hx + side * 0.45, 2.85, 13);
      }
    }

    /* rooms */
    for (const r of this.rooms) {
      if (r.id.startsWith("sala")) this.classroom(put, r);
      else if (r.id === "biblioteca") this.library(put, r);
      else if (r.id === "lab_ciencias") this.sciLab(put, r);
      else if (r.id === "lab_info") this.computerLab(put, r);
      else if (r.id === "musica") this.musicRoom(put, r);
      else if (r.id === "artes") this.artRoom(put, r);
      else if (r.id === "refeitorio") this.cafeteria(put, r);
      else if (r.id === "cozinha") this.kitchen(put, r);
      else if (r.id === "ginasio") this.gym(put, r);
      else if (r.id === "vestiario") this.lockerRoom(put, r);
      else if (r.id === "banheiro") this.bathroom(put, r);
      else if (r.id === "professores") this.teachersRoom(put, r);
      else if (r.id === "diretoria") this.office(put, r);
      else if (r.id === "enfermaria") this.infirmary(put, r);
      else if (r.id === "conselho") this.council(put, r);
      else if (r.id === "armazenamento" || r.id === "deposito") this.storage(put, r);
      else if (r.id === "sala_clubes") this.clubRoom(put, r);
      else if (r.id === "portaria") this.reception(put, r);
      else if (r.id === "telhado") this.rooftop(put, r);
    }

    /* vending machines */
    put("machine", box(1.2, 2, 0.8), 12.5, 1, -6.7);
    put("machine", box(1.2, 2, 0.8), -31.5, 1, -2, Math.PI / 2);

    /* merge */
    const MATS: Record<string, THREE.MeshStandardMaterialParameters> = {
      grass: { color: 0x7aa95c, roughness: 1 },
      pave: { color: 0xb8b2a4, roughness: 0.95 },
      path: { color: 0xcfc8b8, roughness: 0.95 },
      asphalt: { color: 0x565a63, roughness: 1 },
      floor2: { color: 0xd8cfc0, roughness: 0.9 },
      roof: { color: 0x9aa0a8, roughness: 1 },
      roofw: { color: 0x8a4a3a, roughness: 0.9 },
      wallwhite: { color: 0xf2ece0, roughness: 0.9 },
      wallin: { color: 0xe8e0d0, roughness: 0.95 },
      glass: { color: 0xaad4e8, roughness: 0.2, metalness: 0.4 },
      wood: { color: 0x8a6a4a, roughness: 0.9 },
      metal: { color: 0x777f88, roughness: 0.5, metalness: 0.6 },
      pole: { color: 0xc8c8d0, roughness: 0.4, metalness: 0.7 },
      flag: { color: 0xd84545, side: THREE.DoubleSide },
      banner: { color: 0xa83040, roughness: 0.8 },
      sign: { color: 0x2b3a55, roughness: 0.6 },
      court: { color: 0x4a7a9a, roughness: 0.95 },
      line: { color: 0xf0f0f0, roughness: 1 },
      board: { color: 0xf5f5f5, roughness: 0.6 },
      ring: { color: 0xd86a3a, roughness: 0.6 },
      pond: { color: 0x5a9ab8, roughness: 0.15, metalness: 0.3 },
      flowers: { color: 0xe87a9a, roughness: 1, side: THREE.DoubleSide },
      leafy: { color: 0x4a7a42, roughness: 1 },
      sakuraTrunk: { color: 0x5d4a3a, roughness: 1 },
      sakuraLeaf: { color: 0xe8a8c0, roughness: 1 },
      treeLeaf: { color: 0x5d8a4a, roughness: 1 },
      desk: { color: 0xc8a86a, roughness: 0.8 },
      deskTop: { color: 0xe8d8b0, roughness: 0.7 },
      chair: { color: 0x8a94a8, roughness: 0.8 },
      shelf: { color: 0x7a5a3a, roughness: 0.9 },
      book: { color: 0xa84a4a, roughness: 0.9 },
      book2: { color: 0x4a6a9a, roughness: 0.9 },
      screen: { color: 0x223344, emissive: 0x3a6a8a, emissiveIntensity: 0.7 },
      piano: { color: 0x2b2b33, roughness: 0.4 },
      counter: { color: 0xd8d0c0, roughness: 0.8 },
      locker: { color: 0x7a8a9a, roughness: 0.7, metalness: 0.3 },
      stall: { color: 0xd8e0e8, roughness: 0.8 },
      machine: { color: 0xd8455a, roughness: 0.5 },
      bed: { color: 0xe8f0f5, roughness: 0.9 },
      gymfloor: { color: 0xc89858, roughness: 0.9 },
      stage: { color: 0x9a6a4a, roughness: 0.9 },
      eisel: { color: 0xc8b088, roughness: 0.9 },
      canvas: { color: 0xf0ead8, roughness: 1 },
      blackboard: { color: 0x2e4a3a, roughness: 0.9 },
    };
    for (const [mat, geos] of buckets) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial(MATS[mat] ?? { color: 0x999999 }));
      mesh.castShadow = !["pave", "path", "grass", "asphalt", "court", "floor2", "flowers", "line"].includes(mat);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  /* ---- furnishing helpers ---- */

  private stairsVisual(put: Putter, cx: number): void {
    for (let i = 0; i < 12; i++) {
      const z = -7.5 - (i + 0.5) * 0.45;
      put("floor2", new THREE.BoxGeometry(2.6, 0.22, 0.5), cx, (i + 0.5) * (FLOOR2 / 12) - 0.1, z);
    }
    for (let i = 0; i < 12; i++) {
      const z = -18 - (i + 0.5) * 0.28;
      put("floor2", new THREE.BoxGeometry(2.6, 0.22, 0.32), cx, FLOOR2 + (i + 0.5) * (FLOOR2 / 12) - 0.1, z);
    }
  }

  private sakuraTree(put: Putter, x: number, z: number): void {
    put("sakuraTrunk", new THREE.CylinderGeometry(0.22, 0.34, 2.6, 8), x, 1.3, z);
    put("sakuraTrunk", new THREE.CylinderGeometry(0.1, 0.16, 1.4, 6), x + 0.5, 2.9, z + 0.2);
    put("sakuraLeaf", new THREE.IcosahedronGeometry(1.5, 1), x, 4.1, z);
    put("sakuraLeaf", new THREE.IcosahedronGeometry(1.1, 1), x + 1.1, 3.6, z + 0.4);
    put("sakuraLeaf", new THREE.IcosahedronGeometry(1.15, 1), x - 1.1, 3.7, z - 0.3);
    put("sakuraLeaf", new THREE.IcosahedronGeometry(1.0, 1), x + 0.4, 3.3, z + 1);
    put("sakuraLeaf", new THREE.IcosahedronGeometry(1.0, 1), x - 0.4, 3.4, z - 1);
    put("wood", new THREE.CylinderGeometry(1.1, 1.1, 0.35, 14), x, 0.18, z);
  }

  private greenTree(put: Putter, x: number, z: number): void {
    put("sakuraTrunk", new THREE.CylinderGeometry(0.18, 0.3, 2.4, 7), x, 1.2, z);
    put("treeLeaf", new THREE.IcosahedronGeometry(1.5, 1), x, 3.4, z);
    put("treeLeaf", new THREE.IcosahedronGeometry(1.0, 1), x + 0.9, 2.8, z + 0.4);
  }

  private classroom(put: Putter, r: RoomDefW): void {
    const { x0, z0, x1 } = r.rect;
    put("blackboard", new THREE.BoxGeometry(4.5, 1.6, 0.1), (x0 + x1) / 2, 2, z0 + 0.25);
    put("wood", new THREE.BoxGeometry(1.8, 0.95, 0.8), (x0 + x1) / 2, 0.5, z0 + 1.4);
    for (const s of r.spots) {
      put("desk", new THREE.BoxGeometry(0.9, 0.1, 0.6), s.x, 0.72, s.z);
      put("desk", new THREE.BoxGeometry(0.1, 0.72, 0.5), s.x - 0.35, 0.36, s.z);
      put("desk", new THREE.BoxGeometry(0.1, 0.72, 0.5), s.x + 0.35, 0.36, s.z);
      put("chair", new THREE.BoxGeometry(0.5, 0.08, 0.5), s.x, 0.45, s.z + 0.55);
      put("chair", new THREE.BoxGeometry(0.5, 0.6, 0.08), s.x, 0.75, s.z + 0.8);
    }
  }

  private library(put: Putter, r: RoomDefW): void {
    const { x0, z0 } = r.rect;
    for (let i = 0; i < 3; i++) {
      const sx = x0 + 1 + i * 3;
      put("shelf", new THREE.BoxGeometry(0.5, 2.4, 7), sx, 1.2, z0 + 4.2);
      for (let b = 0; b < 3; b++) put(b % 2 ? "book" : "book2", new THREE.BoxGeometry(0.4, 0.5, 1.6), sx, 0.7 + b * 0.7, z0 + 2.8 + b);
    }
    for (const s of r.spots) {
      put("deskTop", new THREE.BoxGeometry(1.4, 0.08, 0.9), s.x, 0.74, s.z);
      put("desk", new THREE.BoxGeometry(0.12, 0.74, 0.12), s.x, 0.37, s.z);
      put("chair", new THREE.BoxGeometry(0.5, 0.5, 0.5), s.x, 0.25, s.z + 0.8);
    }
  }

  private sciLab(put: Putter, r: RoomDefW): void {
    for (const s of r.spots) {
      put("counter", new THREE.BoxGeometry(1.6, 0.9, 0.9), s.x, 0.45, s.z);
      put("glass", new THREE.CylinderGeometry(0.09, 0.12, 0.3, 8), s.x - 0.3, 1.05, s.z);
      put("glass", new THREE.CylinderGeometry(0.06, 0.09, 0.22, 8), s.x + 0.25, 1.0, s.z + 0.2);
    }
    put("blackboard", new THREE.BoxGeometry(3.5, 1.5, 0.1), (r.rect.x0 + r.rect.x1) / 2, 2, r.rect.z0 + 0.25);
  }

  private computerLab(put: Putter, r: RoomDefW): void {
    for (const s of r.spots) {
      put("desk", new THREE.BoxGeometry(1.1, 0.08, 0.7), s.x, 0.72, s.z);
      put("desk", new THREE.BoxGeometry(0.1, 0.72, 0.6), s.x, 0.36, s.z);
      put("screen", new THREE.BoxGeometry(0.6, 0.42, 0.05), s.x, 1.15, s.z - 0.2);
      put("chair", new THREE.BoxGeometry(0.5, 0.5, 0.5), s.x, 0.25, s.z + 0.6);
    }
  }

  private musicRoom(put: Putter, r: RoomDefW): void {
    const cx = (r.rect.x0 + r.rect.x1) / 2;
    put("piano", new THREE.BoxGeometry(2.2, 1.3, 1.2), cx - 1, 0.65, r.rect.z0 + 2);
    put("piano", new THREE.BoxGeometry(1.6, 0.25, 0.5), cx - 1, 0.15, r.rect.z0 + 3.1);
    for (const s of r.spots) {
      put("metal", new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), s.x, 0.55, s.z);
      put("chair", new THREE.BoxGeometry(0.5, 0.1, 0.4), s.x, 0.06, s.z);
      put("desk", new THREE.BoxGeometry(0.5, 0.35, 0.05), s.x, 1.0, s.z - 0.1);
    }
  }

  private artRoom(put: Putter, r: RoomDefW): void {
    for (let i = 0; i < 4; i++) {
      const ex = r.rect.x0 + 1.5 + i * 2;
      put("eisel", new THREE.BoxGeometry(0.08, 1.5, 0.08), ex, 0.75, r.rect.z1 - 1.4);
      put("canvas", new THREE.BoxGeometry(0.9, 1.1, 0.05), ex, 1.1, r.rect.z1 - 1.45);
    }
    for (const s of r.spots) put("deskTop", new THREE.BoxGeometry(1.3, 0.08, 0.8), s.x, 0.74, s.z);
  }

  private cafeteria(put: Putter, r: RoomDefW): void {
    for (const s of r.spots) {
      put("deskTop", new THREE.BoxGeometry(1.8, 0.08, 0.9), s.x, 0.74, s.z);
      put("desk", new THREE.BoxGeometry(0.12, 0.74, 0.7), s.x - 0.6, 0.37, s.z);
      put("desk", new THREE.BoxGeometry(0.12, 0.74, 0.7), s.x + 0.6, 0.37, s.z);
      put("chair", new THREE.BoxGeometry(0.45, 0.5, 0.45), s.x - 0.5, 0.25, s.z + 0.8);
      put("chair", new THREE.BoxGeometry(0.45, 0.5, 0.45), s.x + 0.5, 0.25, s.z + 0.8);
    }
    put("counter", new THREE.BoxGeometry(6, 1.05, 0.8), 34.5, 0.55, -4);
  }

  private kitchen(put: Putter, r: RoomDefW): void {
    for (let i = 0; i < 3; i++) {
      put("counter", new THREE.BoxGeometry(3, 0.95, 0.8), r.rect.x0 + 2.5 + i * 3.4, 0.5, r.rect.z0 + 1);
      put("metal", new THREE.BoxGeometry(1, 0.9, 0.7), r.rect.x0 + 1.5 + i * 4, 0.45, r.rect.z1 - 1.2);
    }
  }

  private gym(put: Putter, r: RoomDefW): void {
    const cx = (r.rect.x0 + r.rect.x1) / 2, cz = (r.rect.z0 + r.rect.z1) / 2;
    put("gymfloor", new THREE.PlaneGeometry(13, 20).rotateX(-Math.PI / 2), cx, 0.06, cz);
    put("stage", new THREE.BoxGeometry(13, 0.9, 3), cx, 0.45, r.rect.z0 + 1.5);
    for (const side of [-1, 1]) {
      const hx = cx + side * 5.4;
      put("metal", new THREE.BoxGeometry(0.18, 3.4, 0.18), hx, 1.7, cz);
      put("board", new THREE.BoxGeometry(0.1, 1.1, 1.6), hx + side * 0.15, 3.1, cz);
    }
    for (let i = 0; i < 3; i++) {
      put("wood", new THREE.BoxGeometry(0.9, 0.45 + i * 0.45, 14), r.rect.x0 + 0.6 + i * 0.9, (0.45 + i * 0.45) / 2, cz);
    }
  }

  private lockerRoom(put: Putter, r: RoomDefW): void {
    for (let i = 0; i < 8; i++) {
      put("locker", new THREE.BoxGeometry(0.7, 1.9, 0.45), r.rect.x0 + 0.6 + i * 1.7, 0.95, r.rect.z0 + 0.5);
    }
    put("wood", new THREE.BoxGeometry(8, 0.35, 0.8), (r.rect.x0 + r.rect.x1) / 2, 0.35, r.rect.z1 - 1);
  }

  private bathroom(put: Putter, r: RoomDefW): void {
    for (const half of [0, 1]) {
      const bx0 = half ? -25 : -30;
      for (let i = 0; i < 3; i++) {
        put("stall", new THREE.BoxGeometry(0.9, 1.8, 0.06), bx0 + 1.6 + i * 1.4, 0.9, 29.2);
        put("stall", new THREE.BoxGeometry(0.06, 1.8, 1.4), bx0 + 1.1 + i * 1.4, 0.9, 28.5);
      }
      put("counter", new THREE.BoxGeometry(3.4, 0.85, 0.6), bx0 + 2.4, 0.45, 23);
      put("glass", new THREE.BoxGeometry(1.4, 1, 0.05), bx0 + 2.4, 1.8, 22.4);
    }
  }

  private teachersRoom(put: Putter, r: RoomDefW): void {
    for (const s of r.spots) {
      put("deskTop", new THREE.BoxGeometry(1.4, 0.08, 0.8), s.x, 0.74, s.z);
      put("screen", new THREE.BoxGeometry(0.55, 0.4, 0.05), s.x + 0.3, 1.12, s.z - 0.25);
    }
    put("shelf", new THREE.BoxGeometry(0.5, 2.2, 4), r.rect.x1 - 0.5, 1.1, (r.rect.z0 + r.rect.z1) / 2);
  }

  private office(put: Putter, r: RoomDefW): void {
    put("wood", new THREE.BoxGeometry(2.4, 0.95, 1.1), (r.rect.x0 + r.rect.x1) / 2, 0.5, (r.rect.z0 + r.rect.z1) / 2 - 1);
    put("chair", new THREE.BoxGeometry(0.7, 1.1, 0.7), (r.rect.x0 + r.rect.x1) / 2, 0.55, (r.rect.z0 + r.rect.z1) / 2 + 0.4);
    put("flag", new THREE.BoxGeometry(0.06, 1.6, 0.06), r.rect.x0 + 0.8, 0.8, r.rect.z0 + 0.8);
    put("shelf", new THREE.BoxGeometry(3.6, 2.2, 0.45), (r.rect.x0 + r.rect.x1) / 2, 1.1, r.rect.z0 + 0.5);
  }

  private infirmary(put: Putter, r: RoomDefW): void {
    for (let i = 0; i < 3; i++) {
      put("bed", new THREE.BoxGeometry(1, 0.6, 2.1), r.rect.x0 + 1.2 + i * 2.6, 0.3, r.rect.z0 + 2);
      put("stall", new THREE.BoxGeometry(0.06, 1.7, 1.9), r.rect.x0 + 2.3 + i * 2.6, 0.85, r.rect.z0 + 2);
    }
    put("counter", new THREE.BoxGeometry(2.2, 0.9, 0.8), r.rect.x1 - 1.6, 0.45, r.rect.z0 + 1.2);
  }

  private council(put: Putter, r: RoomDefW): void {
    const cx = (r.rect.x0 + r.rect.x1) / 2, cz = (r.rect.z0 + r.rect.z1) / 2;
    put("deskTop", new THREE.BoxGeometry(3.4, 0.09, 1.6), cx, 0.75, cz);
    for (const s of r.spots) put("chair", new THREE.BoxGeometry(0.5, 0.9, 0.5), s.x, 0.45, s.z);
    put("banner", new THREE.BoxGeometry(3, 1, 0.1), cx, 2.6, r.rect.z0 + 0.3);
    put("desk", new THREE.BoxGeometry(1, 1, 0.7), r.rect.x0 + 0.9, 0.5, cz);
  }

  private storage(put: Putter, r: RoomDefW): void {
    for (let i = 0; i < 4; i++) {
      put("shelf", new THREE.BoxGeometry(0.5, 2.2, 2.4), r.rect.x0 + 0.6 + i * 1.5, 1.1, r.rect.z0 + 1.4);
      put("desk", new THREE.BoxGeometry(0.9, 0.7, 0.9), r.rect.x0 + 1 + i * 1.4, 0.35, r.rect.z1 - 1.4);
    }
  }

  private clubRoom(put: Putter, r: RoomDefW): void {
    put("board", new THREE.BoxGeometry(4.2, 2.2, 0.08), (r.rect.x0 + r.rect.x1) / 2, 1.8, r.rect.z1 - 0.3);
    for (const s of r.spots) {
      put("deskTop", new THREE.BoxGeometry(1.4, 0.08, 0.8), s.x, 0.72, s.z);
      put("chair", new THREE.BoxGeometry(0.5, 0.5, 0.5), s.x, 0.25, s.z + 0.75);
    }
    put("wood", new THREE.BoxGeometry(2.6, 0.6, 1), r.rect.x1 - 1.8, 0.3, r.rect.z0 + 1.2);
  }

  private reception(put: Putter, r: RoomDefW): void {
    put("counter", new THREE.BoxGeometry(4.5, 1.05, 0.9), (r.rect.x0 + r.rect.x1) / 2, 0.55, r.rect.z0 + 2);
    put("board", new THREE.BoxGeometry(2.6, 1.6, 0.08), r.rect.x1 - 0.8, 1.8, (r.rect.z0 + r.rect.z1) / 2, Math.PI / 2);
    put("chair", new THREE.BoxGeometry(0.6, 1, 0.6), (r.rect.x0 + r.rect.x1) / 2, 0.5, r.rect.z0 + 3.2);
  }

  private rooftop(put: Putter, r: RoomDefW): void {
    put("metal", new THREE.BoxGeometry(2, 1.4, 1.2), -20, ROOF + 0.7, -16);
    put("metal", new THREE.BoxGeometry(2, 1.4, 1.2), 20, ROOF + 0.7, -16);
    put("metal", new THREE.CylinderGeometry(1.1, 1.1, 2, 12), 8, ROOF + 1, -18);
    put("pole", new THREE.CylinderGeometry(0.04, 0.04, 3, 6), -12, ROOF + 1.5, -18);
    put("metal", new THREE.BoxGeometry(1, 0.8, 0.6), -12, ROOF + 2.6, -18);
  }

  /* ------------------------------------------------------------------ */
  /* Waypoint graph                                                      */
  /* ------------------------------------------------------------------ */

  private addWp(key: string, x: number, y: number, z: number): number {
    const id = this.waypoints.length;
    this.waypoints.push({ id, x, y, z, links: [] });
    if (key) this.wpIndex.set(key, id);
    return id;
  }

  private link(a: string, b: string): void {
    const ia = this.wpIndex.get(a), ib = this.wpIndex.get(b);
    if (ia === undefined || ib === undefined || ia === ib) return;
    if (!this.waypoints[ia].links.includes(ib)) this.waypoints[ia].links.push(ib);
    if (!this.waypoints[ib].links.includes(ia)) this.waypoints[ib].links.push(ia);
  }

  private buildWaypoints(): void {
    const xs = [-24, -16, -8, 0, 8, 16, 24];
    for (let i = 0; i < xs.length; i++) {
      this.addWp(`c0_${i}`, xs[i], 0, -9);
      this.addWp(`c2_${i}`, xs[i], FLOOR2, -9);
      if (i > 0) { this.link(`c0_${i - 1}`, `c0_${i}`); this.link(`c2_${i - 1}`, `c2_${i}`); }
    }
    // stair waypoints
    for (const [side, sx] of [["l", -28.5], ["r", 28.5]] as const) {
      this.addWp(`st_${side}_bot`, sx, 0, -10);
      this.addWp(`st_${side}_mid`, sx, FLOOR2, -15);
      this.addWp(`st_${side}_top`, sx, ROOF, -19.5);
      this.link(`st_${side}_bot`, `st_${side}_mid`);
      this.link(`st_${side}_mid`, `st_${side}_top`);
      this.link(`st_${side}_bot`, side === "l" ? "c0_0" : "c0_6");
      this.link(`st_${side}_mid`, side === "l" ? "c2_0" : "c2_6");
    }
    this.link("st_l_top", "st_r_top"); // across the rooftop
    // room door + center nodes
    const doorDefs: [string, number, number][] = [ // [roomKey, doorX, floor]
      ["deposito", -24.8, 0], ["sala1a", -18.5, 0], ["sala1b", -10.5, 0], ["sala2a", -2.5, 0], ["sala2b", 5.5, 0],
      ["professores", 12, 0], ["diretoria", 17, 0], ["enfermaria", 23.2, 0],
      ["biblioteca", -22, FLOOR2], ["lab_ciencias", -13, FLOOR2], ["lab_info", -5, FLOOR2], ["musica", 3, FLOOR2],
      ["artes", 11, FLOOR2], ["conselho", 18, FLOOR2], ["armazenamento", 23, FLOOR2],
    ];
    for (const [room, dx, fl] of doorDefs) {
      this.addWp(`d_${room}_${fl}`, dx, fl, -10.2);
      this.link(`d_${room}_${fl}`, `${fl === 0 ? "c0" : "c2"}_${nearestIdx(xs, dx)}`);
      const r = this.roomById(room, fl)!;
      this.addWp(`r_${room}_${fl}`, r.center.x, fl, r.center.z);
      this.link(`r_${room}_${fl}`, `d_${room}_${fl}`);
    }
    this.addWp("r_telhado", 0, ROOF, -14);
    this.link("r_telhado", "st_l_top"); this.link("r_telhado", "st_r_top");
    // wing rooms
    this.addWp("r_refeitorio", 39, 0, -11); this.addWp("r_cozinha", 39, 0, -1);
    this.link("r_refeitorio", "r_cozinha");
    this.addWp("r_ginasio", -39, 0, -7);
    this.addWp("r_vestiario", -39, 0, 7);
    this.addWp("r_sala_clubes", -12, 0, 26);
    this.addWp("r_portaria", 10, 0, 26);
    this.addWp("r_banheiro", -25, 0, 26);
    // courtyard
    const cy: [string, number, number][] = [
      ["cy_w1", -20, -2], ["cy_w2", -20, 10], ["cy_w3", -20, 18],
      ["cy_c1", 0, -2], ["cy_c2", 0, 10], ["cy_c3", 0, 18],
      ["cy_e1", 20, -2], ["cy_e2", 20, 10], ["cy_e3", 20, 18],
      ["cy_ww", -29, -4], ["cy_ee", 31, 0], ["cy_ann", -12, 20.5], ["cy_ann2", 10, 20.5], ["cy_gate", 11, 28],
      ["cy_sw", -28, 12], ["cy_se", 28, 12], ["cy_jardim", -14, 12], ["cy_quadra", 15, 12],
    ];
    for (const [k, x, z] of cy) this.addWp(k, x, 0, z);
    this.link("cy_w1", "cy_c1"); this.link("cy_c1", "cy_e1");
    this.link("cy_w2", "cy_c2"); this.link("cy_c2", "cy_e2");
    this.link("cy_w3", "cy_c3"); this.link("cy_c3", "cy_e3");
    this.link("cy_w1", "cy_w2"); this.link("cy_w2", "cy_w3");
    this.link("cy_c1", "cy_c2"); this.link("cy_c2", "cy_c3");
    this.link("cy_e1", "cy_e2"); this.link("cy_e2", "cy_e3");
    this.link("cy_ww", "cy_w1"); this.link("cy_ee", "cy_e1");
    this.link("cy_sw", "cy_w2"); this.link("cy_se", "cy_e2");
    this.link("cy_w3", "cy_sw"); this.link("cy_e3", "cy_se");
    this.link("cy_ann", "cy_c3"); this.link("cy_ann2", "cy_c3"); this.link("cy_gate", "cy_ann2");
    this.link("cy_c2", "cy_jardim"); this.link("cy_c2", "cy_quadra");
    // corridor front doors ↔ courtyard
    for (const [i, dx] of [[1, -20], [2, -10], [3, 0], [4, 10], [5, 20]] as const) {
      this.addWp(`f_${dx}`, dx, 0, -5);
      this.link(`f_${dx}`, `c0_${i}`);
      this.link(`f_${dx}`, dx < 0 ? "cy_w1" : dx > 0 ? "cy_e1" : "cy_c1");
    }
    // wings & annex links
    this.link("r_ginasio", "cy_ww");
    this.link("r_vestiario", "r_ginasio");
    this.link("r_refeitorio", "cy_ee");
    this.link("r_sala_clubes", "cy_ann");
    this.link("r_portaria", "cy_ann2");
    this.link("r_banheiro", "cy_ann");
    this.addWp("rua_out", 11, 0, 35);
    this.link("rua_out", "cy_gate");
  }

  findPath(from: number, to: number): number[] | null {
    if (from === to) return [from];
    const prev = new Array<number>(this.waypoints.length).fill(-1);
    const q: number[] = [from];
    prev[from] = from;
    while (q.length) {
      const cur = q.shift()!;
      for (const nb of this.waypoints[cur].links) {
        if (prev[nb] !== -1) continue;
        prev[nb] = cur;
        if (nb === to) {
          const path: number[] = [to];
          let p = to;
          while (p !== from) { p = prev[p]; path.unshift(p); }
          return path;
        }
        q.push(nb);
      }
    }
    return null;
  }

  nearestWaypoint(x: number, y: number, z: number): number {
    let best = 0, bd = Infinity;
    for (const w of this.waypoints) {
      const d = (w.x - x) ** 2 + (w.y - y) ** 2 * 4 + (w.z - z) ** 2;
      if (d < bd) { bd = d; best = w.id; }
    }
    return best;
  }
}

type Putter = (mat: string, geo: THREE.BufferGeometry, x: number, y: number, z: number, ry?: number) => void;

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function nearestIdx(xs: number[], x: number): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i] - x);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
