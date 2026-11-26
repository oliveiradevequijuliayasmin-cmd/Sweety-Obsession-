/**
 * state.ts — SWEET OBSESSION game state machine + serializable game data + save/load.
 */
import type { EndingId, GameData, GiftId, PathId, Relationship } from "./types";
import { storage } from "./storage";
import { DEFAULT_HERO_LOOK, DEFAULT_SENPAI_LOOK } from "./data/students";

export type GameState =
  | "title" | "customize" | "customize_senpai"
  | "playing" | "paused" | "dialogue" | "phone"
  | "ending" | "gameover";

const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  title: ["customize", "customize_senpai", "playing"],
  customize: ["title", "playing"],
  customize_senpai: ["title", "playing"],
  playing: ["paused", "dialogue", "phone", "ending", "gameover", "title", "customize"],
  paused: ["playing", "title", "customize", "customize_senpai"],
  dialogue: ["playing", "ending", "gameover"],
  phone: ["playing", "paused"],
  ending: ["title", "playing"],
  gameover: ["title", "playing", "customize"],
};

export class GameStateMachine {
  private _state: GameState = "title";
  private listeners = new Set<(s: GameState, prev: GameState) => void>();

  get state(): GameState { return this._state; }
  is(...states: GameState[]): boolean { return states.includes(this._state); }

  transition(next: GameState): void {
    const prev = this._state;
    if (prev === next) return;
    if (!TRANSITIONS[prev].includes(next)) {
      throw new Error(`illegal state transition: ${prev} -> ${next}`);
    }
    this._state = next;
    for (const fn of this.listeners) fn(next, prev);
  }

  onChange(fn: (s: GameState, prev: GameState) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}

const SAVE_KEY = "sweetObsession.save.v1";
const META_KEY = "sweetObsession.meta.v1";
const SETTINGS_KEY = "sweetObsession.settings.v1";

export function newGameData(): GameData {
  return {
    version: 1,
    day: 0,
    minutes: 420,
    reputation: 50,
    affinity: 10,
    flags: {},
    rel: {},
    inventory: { flower: 2, sweet: 1, drink: 1, book: 0, accessory: 1, letter: 0 },
    info: {},
    activeQuests: [],
    questStep: {} as Record<PathId, number>,
    rivalResolved: null,
    messages: [
      { from: "mamae", text: "Bom primeiro dia de aula, meu amor! Não esquece o casaco. — Mãe", day: 0, read: false },
    ],
    gallery: [],
    customization: { ...DEFAULT_HERO_LOOK },
    senpaiLook: { ...DEFAULT_SENPAI_LOOK },
    senpaiName: DEFAULT_SENPAI_LOOK.name,
    heroName: DEFAULT_HERO_LOOK.name,
    settings: { volume: 0.6, quality: "high", timeScale: 1, invertY: false },
  };
}

export function getRel(g: GameData, id: string): Relationship {
  if (!g.rel[id]) g.rel[id] = { friend: 0, met: false, lastTalkDay: -1, lastGiftDay: -1 };
  return g.rel[id];
}

export function addMessage(g: GameData, from: string, text: string): void {
  g.messages.push({ from, text, day: g.day, read: false });
}

export function unlockInfo(g: GameData, id: string): boolean {
  if (g.info[id]) return false;
  g.info[id] = true;
  return true;
}

export function unlockEnding(g: GameData, id: EndingId): void {
  if (!g.gallery.includes(id)) g.gallery.push(id);
}

export function addItem(g: GameData, item: GiftId, n = 1): void {
  g.inventory[item] = (g.inventory[item] ?? 0) + n;
}

export function takeItem(g: GameData, item: GiftId): boolean {
  if ((g.inventory[item] ?? 0) <= 0) return false;
  g.inventory[item] -= 1;
  return true;
}

export function startQuest(g: GameData, q: PathId): void {
  if (!g.activeQuests.includes(q)) g.activeQuests.push(q);
}

export function questStepIndex(g: GameData, q: PathId): number {
  return g.questStep[q] ?? 0;
}

export function advanceQuests(g: GameData, quests: { id: PathId; steps: { done: (x: GameData) => boolean }[] }[]): void {
  for (const q of quests) {
    const idx = questStepIndex(g, q.id);
    if (idx >= q.steps.length) continue;
    if (q.steps[idx].done(g)) {
      g.questStep[q.id] = idx + 1;
      if (idx + 1 >= q.steps.length) {
        // quest complete — resolve via its done flag handled by caller path logic
      }
    }
  }
}

/* ---------------- save / load ---------------- */

export function saveGame(g: GameData): boolean {
  return storage.set(SAVE_KEY, g), true;
}

export function loadGame(): GameData | null {
  const g = storage.get<GameData | null>(SAVE_KEY, null);
  if (!g || g.version !== 1 || typeof g.day !== "number") return null;
  return g;
}

export function hasSave(): boolean { return loadGame() !== null; }
export function clearSave(): void { storage.remove(SAVE_KEY); }

export interface Meta { endings: EndingId[]; }

export function loadMeta(): Meta {
  return storage.get<Meta>(META_KEY, { endings: [] });
}
export function recordEnding(id: EndingId): void {
  const m = loadMeta();
  if (!m.endings.includes(id)) m.endings.push(id);
  storage.set(META_KEY, m);
}
export function loadSettings(g: GameData): void {
  const s = storage.get<GameData["settings"]>(SETTINGS_KEY, g.settings);
  g.settings = { ...g.settings, ...s };
}
export function saveSettings(g: GameData): void {
  storage.set(SETTINGS_KEY, g.settings);
}
