/**
 * types.ts — shared types for SWEET OBSESSION.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Camera pose (right-handed): yaw around the Y axis; pitch around the X axis (looking up is positive). */
export interface CameraRig {
  yaw: number;
  pitch: number;
  pos: Vec3;
}

/** Common interface for pooled objects: avoids allocation in the hot loop. */
export interface Poolable {
  alive: boolean;
  reset(): void;
}

export class Pool<T extends Poolable> {
  private items: T[] = [];
  constructor(private factory: () => T, size: number) {
    for (let i = 0; i < size; i++) this.items.push(factory());
  }
  obtain(): T | null {
    for (const it of this.items) {
      if (!it.alive) {
        it.alive = true;
        it.reset();
        return it;
      }
    }
    return null;
  }
  each(fn: (it: T) => void): void {
    for (const it of this.items) if (it.alive) fn(it);
  }
}

/* ------------------------------------------------------------------ */
/* SWEET OBSESSION domain types                                        */
/* ------------------------------------------------------------------ */

export type Gender = "f" | "m";

export type HairStyle = "short" | "bob" | "long" | "ponytail" | "twintails" | "bun" | "hime";
export type EyeShape = "round" | "almond" | "sharp" | "gentle";
export type Accessory = "none" | "glasses" | "ribbon" | "clip" | "choker" | "cap";
export type UniformKind = "sailor" | "blazer" | "sport";
export type Makeup = "none" | "blush" | "shadow";

/** Visual + identity of a character — fully customizable for hero and senpai. */
export interface CharLook {
  name: string;
  gender: Gender;
  skin: number;      // hex color
  hairColor: number; // hex color
  hairStyle: HairStyle;
  hairLength: number; // 0..1 (short..very long)
  eyeColor: number;
  eyeShape: EyeShape;
  uniform: UniformKind;
  uniformHue: number; // 0..1 hue shift of uniform accents
  sockColor: number;
  shoeColor: number;
  accessory: Accessory;
  makeup: Makeup;
  personality: PersonalityId;
}

export type PersonalityId = "gentle" | "cheerful" | "shy" | "serious" | "tsundere" | "cool";
export type GiftId = "flower" | "sweet" | "book" | "accessory" | "drink" | "letter";

export type PeriodId =
  | "chegada"  // 07:00–08:00
  | "aula1"    // 08:00–09:40
  | "int1"     // 09:40–10:00
  | "aula2"    // 10:00–11:40
  | "almoco"   // 11:40–13:00
  | "aula3"    // 13:00–14:40
  | "int2"     // 14:40–15:00
  | "clubes"   // 15:00–16:40
  | "livre"    // 16:40–17:30
  | "saida";   // 17:30–18:00

export type RoomId =
  | "sala1a" | "sala1b" | "sala2a" | "sala2b"
  | "professores" | "diretoria" | "enfermaria" | "deposito"
  | "biblioteca" | "lab_ciencias" | "lab_info" | "musica" | "artes"
  | "conselho" | "armazenamento"
  | "ginasio" | "vestiario" | "banheiro"
  | "refeitorio" | "cozinha" | "sala_clubes" | "portaria"
  | "patio" | "jardim" | "quadra" | "telhado" | "rua";

export interface StudentDef {
  id: string;
  look: CharLook;
  cls: string; // e.g. "2-A"
  role: "senpai" | "rival" | "match" | "rift" | "photo" | "none";
  club: string | null;
  personality: string; // short flavor description
  likes: GiftId[];
  gossip: string[]; // info topic ids this student can reveal
  friends: string[];
  /** Default schedule: where to be per period (room or "roam"). */
  schedule: Partial<Record<PeriodId, RoomId>>;
  seat: number; // desk index in home classroom (0..19)
}

export interface Relationship {
  friend: number;      // 0..100
  met: boolean;
  lastTalkDay: number; // in-game day index when last talked
  lastGiftDay: number;
}

export type PathId =
  | "friend" | "match" | "notebook" | "counsel"
  | "letters" | "truth" | "rumor" | "distance";

export type EndingId =
  | "besties" | "freeheart" | "pages" | "rivalry" | "bridge"
  | "revealed" | "falsecho" | "apart" | "confession" | "outcast" | "alone";

export interface DialogChoice {
  text: string;
  cond?: (g: GameData) => boolean;
  effects?: (g: GameData) => string | void; // optional toast message
  next?: string;
  end?: boolean;
}

export interface DialogNode {
  speaker: string;
  text: string | ((g: GameData) => string);
  next?: string;
  choices?: DialogChoice[];
}

export interface QuestStep {
  id: string;
  hint: string;
  done: (g: GameData) => boolean;
}

export interface QuestDef {
  id: PathId;
  name: string;
  kind: "paz" | "suspense";
  steps: QuestStep[];
}

/** Serializable game data (this is what gets saved). */
export interface GameData {
  version: number;
  day: number; // 0 = Monday .. 4 = Friday
  minutes: number; // minutes since 00:00
  reputation: number; // 0..100
  affinity: number; // senpai 0..100
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flags: Record<string, any>;
  rel: Record<string, Relationship>;
  inventory: Record<GiftId, number>;
  info: Record<string, boolean>; // unlocked knowledge
  activeQuests: PathId[];
  questStep: Record<PathId, number>;
  rivalResolved: PathId | null;
  messages: { from: string; text: string; day: number; read: boolean }[];
  gallery: string[]; // unlocked ending ids
  customization: CharLook;
  senpaiLook: CharLook;
  senpaiName: string;
  heroName: string;
  settings: { volume: number; quality: "high" | "low"; timeScale: number; invertY: boolean };
}
