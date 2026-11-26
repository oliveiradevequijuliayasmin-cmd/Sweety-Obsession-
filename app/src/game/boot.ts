/**
 * boot.ts — SWEET OBSESSION orchestration: renderer, scene, game loop, time system,
 * NPC scripting, interactions, quests/paths resolution, endings, save/load.
 */
import * as THREE from "three";
import { GameLoop } from "./engine";
import { Input } from "./input";
import { AudioSystem } from "./audio";
import { SchoolWorld, type RoomDefW } from "./world";
import { NpcManager } from "./npc";
import { Player } from "./player";
import { GameUI } from "./ui";
import { GameStateMachine, newGameData, saveGame, loadGame, hasSave, getRel, addMessage, unlockInfo, loadMeta, recordEnding, loadSettings, saveSettings } from "./state";
import { QUESTS, ENDINGS, DAY_NAMES, PERIOD_NAMES, periodAt, detectQuestStart, fmtTime } from "./data/content";
import { ALL_NPCS, RIVAL_DEF } from "./data/students";
import { TIME_SPEED, PLAYER, CAMERA } from "./config";
import { buildCharacter, setExpression } from "./characters";
import type { CharLook, EndingId, GameData, GiftId, PathId, PeriodId } from "./types";
import { mulberry32, hashSeed } from "./rng";
import { INPUT_CONFIG } from "./config";

declare global {
  interface Window {
    __gameProbe?: () => { x: number; y: number; z: number };
    __GAME_READY__?: boolean;
  }
}

let session: { dispose: () => void } | null = null;

interface Interactable {
  id: string;
  label: string;
  x: number; y: number; z: number;
  r: number;
  cond?: (g: GameData) => boolean;
  action: () => void;
}

interface Encounter {
  flag: string;
  node: string;
  day: number; from: number; to: number;
  x: number; y: number; z: number;
  expr: "sad" | "angry" | "normal" | "blush";
}

const ENCOUNTERS: Encounter[] = [
  { flag: "d1", node: "distance:1", day: 0, from: 900, to: 1000, x: 0, y: 8, z: -14, expr: "normal" },
  { flag: "d2", node: "distance:2", day: 1, from: 700, to: 780, x: 23, y: 0, z: -15, expr: "sad" },
  { flag: "d3", node: "distance:3", day: 2, from: 900, to: 1000, x: -39, y: 0, z: -7, expr: "angry" },
  { flag: "d4", node: "distance:4", day: 3, from: 1000, to: 1050, x: -22, y: 4, z: -16, expr: "sad" },
];

export function startGame(canvas: HTMLCanvasElement): void {
  stopGame();

  /* ---------------- renderer / scene ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.FOV, window.innerWidth / window.innerHeight, 0.1, 300);

  const sky = makeSky();
  scene.add(sky.mesh);

  const hemi = new THREE.HemisphereLight(0xcfe5ff, 0x8a7a5a, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.position.set(30, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const world = new SchoolWorld();
  scene.add(world.group);

  /* drifting clouds */
  const clouds = new THREE.Group();
  {
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false });
    const cg = new THREE.SphereGeometry(1, 10, 8);
    const rng = mulberry32(42);
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Mesh(cg, cm);
      c.position.set(-80 + rng() * 160, 38 + rng() * 14, -80 + rng() * 160);
      c.scale.set(6 + rng() * 8, 1.6 + rng(), 3 + rng() * 4);
      clouds.add(c);
    }
  }
  scene.add(clouds);

  /* ---------------- game data / state ---------------- */
  const sm = new GameStateMachine();
  let g: GameData = loadGame() ?? newGameData();
  loadSettings(g);

  const rng = mulberry32(hashSeed("lianhua" + Date.now()));
  const npcMgr = new NpcManager(world, rng);
  npcMgr.addTo(scene);

  const player = new Player(g.customization, 0, 14.5);
  player.group.visible = false;
  scene.add(player.group);

  const input = new Input(canvas);
  const audio = new AudioSystem();
  audio.setVolume(g.settings.volume);

  const overlay = document.getElementById("ui-overlay")!;
  const ui = new GameUI(overlay);
  ui.bind(g);
  ui.sfx = (id) => audio.sfx(id as never);
  ui.onDialogueState = (open) => {
    if (sm.is("playing")) sm.transition(open ? "dialogue" : "playing");
  };

  let prevState: "title" | "pause" = "title";
  let custReturn: "title" | "pause" | "newgame_hero" | "newgame_senpai" = "title";
  let startAfterCustomize = false;

  /* ---------------- interactables ---------------- */
  const once = (key: string) => { if (g.flags[key]) return false; g.flags[key] = true; return true; };
  const interactables: Interactable[] = [
    {
      id: "flowers", label: "Colher uma flor", x: -19, y: 0, z: 9, r: 2.2,
      action: () => {
        if (!once(`flower_${g.day}`)) { ui.toast("As flores precisam de um dia para renovar.", "info"); return; }
        g.inventory.flower = (g.inventory.flower ?? 0) + 1;
        audio.sfx("pickup"); ui.toast("+1 Flor do jardim", "good");
      },
    },
    {
      id: "sweets", label: "Pegar um doce (cozinha)", x: 35, y: 0, z: -2.5, r: 2.2,
      action: () => {
        if (!once(`sweet_${g.day}`)) { ui.toast("A cozinha já fechou por hoje.", "info"); return; }
        g.inventory.sweet = (g.inventory.sweet ?? 0) + 1;
        audio.sfx("pickup"); ui.toast("+1 Doce artesanal", "good");
      },
    },
    {
      id: "book", label: "Pegar um livro de poemas", x: -25, y: 4, z: -19, r: 2.4,
      action: () => {
        if (!once(`book_${g.day}`)) { ui.toast("Você já pegou um livro hoje.", "info"); return; }
        g.inventory.book = (g.inventory.book ?? 0) + 1;
        audio.sfx("pickup"); ui.toast("+1 Livro de poemas", "good");
      },
    },
    {
      id: "drink1", label: "Comprar chá gelado", x: 12.5, y: 0, z: -6.1, r: 2.0,
      action: () => {
        if (!once(`drink_${g.day}`)) { ui.toast("A máquina esgotou por hoje.", "info"); return; }
        g.inventory.drink = (g.inventory.drink ?? 0) + 1;
        audio.sfx("pickup"); ui.toast("+1 Chá gelado", "good");
      },
    },
    {
      id: "accessory", label: "Pegar acessório (encomenda)", x: 10, y: 0, z: 24.6, r: 2.2,
      action: () => {
        if (!once(`acc_${g.day}`)) { ui.toast("Sem encomendas hoje.", "info"); return; }
        g.inventory.accessory = (g.inventory.accessory ?? 0) + 1;
        audio.sfx("pickup"); ui.toast("+1 Acessório", "good");
      },
    },
    {
      id: "sakura", label: "Apreciar a cerejeira", x: 0, y: 0, z: 8, r: 2.6,
      action: () => {
        if (!once(`sakura_${g.day}`)) { ui.toast("A cerejeira já dividiu sua calma com você hoje.", "info"); return; }
        g.affinity = Math.min(100, g.affinity + 1);
        audio.sfx("heart");
        ui.toast("Pétalas dançam no vento… (+1 ♥)", "good");
      },
    },
    {
      id: "notebook", label: "Pegar o caderno cor de vinho", x: -20, y: 4, z: -19.5, r: 2.2,
      cond: () => g.day <= 3 && !g.flags.has_notebook && !g.flags.notebook_done,
      action: () => {
        g.flags.has_notebook = true;
        audio.sfx("pickup");
        ui.toast("Você encontrou o caderno perdido da Wan Qing. Devolva a ela com cuidado…", "good");
        startQuestIfNew("notebook");
      },
    },
    ...[1, 2, 3].map((n): Interactable => ({
      id: `post${n}`,
      label: `Ler postagem anônima #${n}`,
      x: -13 + n, y: 0, z: 29.4, r: 2.0,
      cond: () => g.day >= n && g.day >= 1 && !g.flags[`post${n}`],
      action: () => {
        g.flags[`post${n}`] = true;
        g.flags.rumor_posts = (g.flags.rumor_posts ?? 0) + 1;
        unlockInfo(g, `rumor${n}` as never);
        audio.sfx("notify");
        const count = g.flags.rumor_posts as number;
        ui.toast(`Postagem #${n} registrada (${count}/3)`, count >= 3 ? "bad" : "info");
        if (count >= 3) addMessage(g, "s03", "Três postagens no mural… isso já é assunto para o conselho. A caixa de denúncias fica na sala do conselho, 2º andar.");
        startQuestIfNew("rumor");
      },
    })),
    {
      id: "evidence", label: "Entregar provas ao conselho", x: 18, y: 4, z: -16.5, r: 2.2,
      cond: () => (g.flags.rumor_posts ?? 0) >= 3 && !g.flags.rumor_done,
      action: () => {
        g.flags.rumor_done = true;
        g.reputation = Math.max(0, g.reputation - 20);
        audio.sfx("fail");
        ui.toast("As provas foram entregues. O conselho vai investigar…", "bad");
      },
    },
  ];

  /* ---------------- quests ---------------- */
  function startQuestIfNew(q: PathId): void {
    if (!g.activeQuests.includes(q)) {
      g.activeQuests.push(q);
      const def = QUESTS.find((x) => x.id === q)!;
      ui.toast(`Nova trama: ${def.name}`, "good");
      audio.sfx("success");
    }
  }

  function questCompleted(q: PathId): boolean {
    const def = QUESTS.find((x) => x.id === q)!;
    return (g.questStep[q] ?? 0) >= def.steps.length;
  }

  function checkQuests(): void {
    for (const q of QUESTS) {
      if (g.activeQuests.includes(q.id) && !questCompleted(q.id)) {
        const idx = g.questStep[q.id] ?? 0;
        if (q.steps[idx].done(g)) {
          g.questStep[q.id] = idx + 1;
          if (idx + 1 >= q.steps.length) onPathResolved(q.id);
          else { ui.toast(`Trama atualizada: ${q.name}`, "good"); audio.sfx("success"); }
        }
      } else if (!g.activeQuests.includes(q.id) && !g.rivalResolved && detectQuestStart(g, q.id)) {
        // auto-detect only for narrative-driven paths
        if (q.id === "distance") {
          if (g.minutes >= 900 || g.day > 0) startQuestIfNew(q.id);
        } else if (q.id !== "rumor" || g.day >= 2) {
          startQuestIfNew(q.id);
        }
      }
    }
  }

  function onPathResolved(path: PathId): void {
    if (g.rivalResolved) return;
    g.rivalResolved = path;
    const def = QUESTS.find((x) => x.id === path)!;
    addMessage(g, "rival", path === "friend" ? "Obrigada… por tudo. Amiga." :
      path === "match" ? "A biblioteca. Hoje. Se eu sumir, culpe os nervos." :
      path === "notebook" ? "Meu caderno… e minha coragem. Obrigada por devolver ambos." :
      path === "counsel" ? "Você me viu inteira. Ninguém mais viu." :
      path === "letters" ? "Mei Lin e eu… obrigada por não deixar a gente perder mais um ano." :
      path === "truth" ? "A verdade dói menos que o boato. Obrigada por caçá-la." :
      path === "rumor" ? "…" : "Xangai me espera. Obrigada por me fazer querer voltar um dia.");
    audio.sfx("win");
    if (path === "rumor") {
      ui.toast("Trama concluída: Eco Falso", "bad");
      setTimeout(() => finishRun("falsecho"), 1600);
    } else if (path === "distance") {
      ui.toast("Trama concluída: A Distância", "info");
      setTimeout(() => finishRun("apart"), 1600);
    } else {
      ui.toast(`Trama resolvida: ${def.name} — encontre ${g.senpaiName} no telhado sexta, 17h30`, "good");
    }
  }

  /* ---------------- endings ---------------- */
  function finishRun(ending: EndingId): void {
    recordEnding(ending);
    g.gallery = Array.from(new Set([...g.gallery, ...loadMeta().endings]));
    audio.sfx(ending === "confession" || ending === "outcast" ? "lose" : "win");
    audio.startMusic("ending");
    sm.transition("ending");
    ui.showHUD(false);
    ui.setPrompt(null);
    ui.fade(() => ui.showEnding(ending, g));
    saveGame(g); // gallery persists
  }

  function fridayEpilogue(): void {
    const map: Partial<Record<PathId, EndingId>> = {
      friend: "besties", match: "freeheart", notebook: "pages",
      counsel: "rivalry", letters: "bridge", truth: "revealed",
    };
    const base = g.rivalResolved ? map[g.rivalResolved] : "confession";
    finishRun(g.affinity >= 30 || !base ? (base ?? "confession") : "alone");
  }

  /* ---------------- time / periods ---------------- */
  let lastPeriod: string = "";
  let autosaveT = 0;

  function onPeriodChange(period: PeriodId): void {
    audio.sfx("bell");
    if (period !== "chegada") ui.toast(`— ${(PERIOD_NAMES as Record<string, [number, number, string]>)[period]?.[2] ?? period} —`, "info");
    npcMgr.onPeriod(period, g.day);
    runScripts(period);
    saveGame(g);
  }

  function advanceDay(): void {
    if (g.day >= 4) return;
    ui.fade(() => {
      g.day += 1;
      g.minutes = 420;
      player.setSpawn(0, 14.5);
      onPeriodChange("chegada");
      ui.toast(`${DAY_NAMES[g.day]} — uma nova chance.`, "good");
      // rival & senpai reappear
      for (const id of ["rival", "senpai"]) {
        const n = npcMgr.get(id);
        if (n && n.state === "gone") n.arrive(world, 8 + Math.random() * 6, 35);
      }
      saveGame(g);
    }, 500);
  }

  /* ---------------- scripted week events ---------------- */
  interface Script { npcId: string; x: number; y: number; z: number; talkAt: number; dur: number; expr?: "sad" | "blush" | "normal" | "angry" | "happy"; face?: [number, number]; done: boolean }
  let activeScripts: Script[] = [];

  function runScripts(period: PeriodId): void {
    activeScripts = [];
    const S = (npcId: string, x: number, y: number, z: number, dur: number, expr?: Script["expr"], face?: [number, number]) =>
      activeScripts.push({ npcId, x, y, z, talkAt: 0, dur, expr, face, done: false });
    const day = g.day;
    // rival & senpai shared moments (visible drama for the player)
    if (day === 0 && period === "int1") { S("rival", 2, 0, 6, 40, "blush", [4, 6]); S("senpai", 4, 0, 6, 40, "normal", [2, 6]); }
    if (day === 1 && period === "almoco") { S("rival", 15, 0, 12, 35, "blush", [17, 12]); S("senpai", 17, 0, 12, 35, "happy", [15, 12]); }
    if (day === 2 && period === "int2") { S("rival", -12, 0, 24, 40, "sad", [-14, 24]); S("s05", -14, 0, 24, 40, "angry", [-12, 24]); }
    if (day === 4 && period === "clubes") { S("rival", -20, 0, 16, 60, "sad"); }
    // senpai habits
    if (period === "livre") S("senpai", 15, 0, 12, 55, "happy");
    // friday rooftop
    if (day === 4 && period === "saida") {
      S("senpai", 0, 8, -13, 99999, "normal", [0, -6]);
      if (g.rivalResolved) addMessage(g, "rival", `Ele está te esperando no telhado. Vai. E obrigada — de verdade.`);
      else addMessage(g, "s01", `EI. A Wan Qing subiu ao telhado com uma CARTA. 17h30. Corre!!!`);
    }
    // distance-encounter staging
    for (const e of ENCOUNTERS) {
      if (g.day === e.day && g.minutes >= e.from && g.minutes < e.to && !g.flags[e.flag]) {
        const n = npcMgr.get("rival");
        if (n) {
          n.state = "scripted";
          n.setPos(e.x, e.y, e.z);
          n.setExpression(e.expr);
          n.face(e.x, e.z + 3);
        }
      }
    }
  }

  function updateScripts(dt: number): void {
    for (const s of activeScripts) {
      const n = npcMgr.get(s.npcId);
      if (!n || s.done) continue;
      if (s.talkAt === 0) {
        s.talkAt = 1;
        n.group.visible = true;
        n.goTo(world, s.x, s.y, s.z);
        n.state = "walk";
      } else if (s.talkAt === 1 && n.state !== "walk") {
        s.talkAt = performance.now() / 1000;
        n.talkFor(s.dur);
        if (s.expr) n.setExpression(s.expr);
        if (s.face) n.face(s.face[0], s.face[1]);
      }
    }
    // encounter proximity
    for (const e of ENCOUNTERS) {
      if (g.flags[e.flag] || g.day !== e.day || g.minutes < e.from || g.minutes > e.to) continue;
      const d = Math.hypot(player.pos.x - e.x, player.pos.z - e.z) + Math.abs(player.pos.y - e.y);
      if (d < 2.6) {
        g.flags[e.flag] = true;
        startTalkWith("rival", ENCOUNTERS.indexOf(e));
      }
    }
  }

  /* ---------------- dialogue / interaction ---------------- */
  let currentNpc: string | null = null;

  function startTalkWith(npcId: string, encounterIdx = -1): void {
    const def = ALL_NPCS.find((s) => s.id === npcId);
    const n = npcMgr.get(npcId);
    if (n) { n.face(player.pos.x, player.pos.z); n.talkFor(6); }
    player.frozen = true;
    player.rig.anim.mode = "talk";
    currentNpc = npcId;
    sm.transition("dialogue");
    const ctx = {
      g,
      npcId,
      npcDef: def,
      onEnd: () => {
        player.frozen = false;
        player.rig.anim.mode = "idle";
        currentNpc = null;
        if (sm.is("dialogue")) sm.transition("playing");
        if (encounterIdx >= 0) {
          const e = ENCOUNTERS[encounterIdx];
          const rn = npcMgr.get("rival");
          if (rn) {
            rn.state = "idle";
            rn.setExpression("normal");
            const room = rn.def.schedule[periodAt(g.minutes) as PeriodId] ?? "patio";
            npcMgr.sendToRoom(rn, room, periodAt(g.minutes) as PeriodId);
          }
          checkQuests();
        }
        checkQuests();
        checkAffinityMessages();
        saveGame(g);
      },
      onGift: (id: string) => {
        ui.openGiftPicker(g, id, def, () => {
          player.frozen = false;
          player.rig.anim.mode = "idle";
          currentNpc = null;
          if (sm.is("dialogue")) sm.transition("playing");
          checkQuests();
          saveGame(g);
        });
      },
    };
    ui.startTalk(npcId, def, ctx);
  }

  function checkAffinityMessages(): void {
    for (const th of [25, 50, 75]) {
      if (g.affinity >= th && !g.flags[`aff_${th}`]) {
        g.flags[`aff_${th}`] = true;
        addMessage(g, "senpai",
          th === 25 ? "Oi. Achei que você gostaria de saber: reservei um livro na biblioteca com seu nome. — Ren" :
          th === 50 ? `Você tem algo que me deixa distraido nas aulas. Não conte pra ninguém. — ${g.senpaiName}` :
          `Sexta, depois da aula. Telhado. Tenho uma coisa pra te dizer. — ${g.senpaiName}`);
        ui.toast(`♥ ${g.senpaiName} te mandou uma mensagem!`, "good");
        audio.sfx("heart");
      }
    }
  }

  /* ---------------- UI actions ---------------- */
  ui.actions = {
    newGame() {
      const settings = g.settings;
      const gallery = g.gallery;
      // carry customized looks over from any previous session
      const heroLook = g.customization;
      const senpaiLook = g.senpaiLook;
      g = newGameData();
      g.customization = heroLook;
      g.senpaiLook = senpaiLook;
      g.heroName = heroLook.name;
      g.senpaiName = senpaiLook.name;
      g.settings = settings;
      g.gallery = gallery;
      loadSettings(g);
      ui.bind(g);
      // instant start with the current (default or previously customized) looks;
      // full customization lives behind PERSONALIZAR PERSONAGEM on the title menu
      startPlaying();
    },
    continueGame() {
      const loaded = loadGame();
      if (loaded) { g = loaded; loadSettings(g); ui.bind(g); }
      startPlaying();
    },
    customizeHero() {
      prevState = sm.is("paused") ? "pause" : "title";
      custReturn = sm.is("paused") ? "pause" : startAfterCustomize ? "newgame_hero" : "title";
      if (sm.is("title")) sm.transition("customize");
      else if (sm.is("paused")) { sm.transition("playing"); sm.transition("customize"); }
      else if (sm.is("playing")) sm.transition("customize");
      else if (sm.is("phone")) { sm.transition("playing"); sm.transition("customize"); }
      showCustomize("hero");
    },
    customizeSenpai() {
      prevState = sm.is("paused") ? "pause" : "title";
      custReturn = "pause";
      if (sm.is("phone")) { sm.transition("playing"); }
      if (sm.is("playing")) sm.transition("customize");
      else if (sm.is("paused")) { sm.transition("playing"); sm.transition("customize"); }
      showCustomize("senpai");
    },
    backToTitle() { toTitle(); },
    applyLook(look: CharLook, who: "hero" | "senpai") {
      if (who === "hero") {
        g.customization = look;
        g.heroName = look.name;
        if (player.group.parent) player.applyLook(look);
      } else {
        g.senpaiLook = look;
        g.senpaiName = look.name;
        rebuildSenpai(look);
      }
    },
    resume() { resumePlay(); },
    saveGame() { saveGame(g); saveSettings(g); },
    retry() {
      // restart the week keeping customization + gallery
      const keep = g;
      const fresh = newGameData();
      fresh.customization = keep.customization;
      fresh.senpaiLook = keep.senpaiLook;
      fresh.heroName = keep.heroName;
      fresh.senpaiName = keep.senpaiName;
      fresh.gallery = keep.gallery;
      fresh.settings = keep.settings;
      g = fresh;
      ui.bind(g);
      startPlaying();
    },
    openPhone(tab) {
      if (sm.is("playing")) sm.transition("phone");
      ui.showPhone(g, tab);
    },
    closePhone() {
      if (sm.is("phone")) sm.transition("playing");
      ui.closeScreen();
      ui.showHUD(true);
      saveGame(g);
    },
    waitUntilNextPeriod() {
      const order = Object.keys(PERIOD_NAMES);
      const cur = periodAt(g.minutes);
      const nextIdx = (order.indexOf(cur) + 1) % order.length;
      const nextId = order[nextIdx];
      const [start] = (PERIOD_NAMES as Record<string, [number, number, string]>)[nextId];
      ui.fade(() => {
        g.minutes = start + 0.1;
        if (nextId === "chegada" || g.minutes >= 1080) advanceDay();
      });
    },
    sitToggle() {
      player.rig.anim.mode = player.rig.anim.mode === "sit" ? "idle" : "sit";
      audio.sfx("ui");
    },
    interact() { doInteract(); },
    toggleRun(on) { player.runToggle = on; },
    setTimeScale(v) { g.settings.timeScale = v; saveSettings(g); },
    setVolume(v) { g.settings.volume = v; audio.setVolume(v); saveSettings(g); },
    setQuality(q) { g.settings.quality = q; applyQuality(); saveSettings(g); },
    setInvertY(b) { INPUT_CONFIG.INVERT_Y = b; saveSettings(g); },
    resetSave() { saveGame(g); },
    showGallery() { ui.showGallery(g); },
  };

  function showCustomize(who: "hero" | "senpai"): void {
    player.group.visible = true;
    player.frozen = true;
    // showcase pose in the courtyard
    player.pos.set(0, 0, 10);
    player.yaw = Math.PI; // face the camera (south)
    player.group.position.copy(player.pos);
    player.group.rotation.y = player.yaw;
    ui.showCustomize(who, who === "hero" ? g.customization : g.senpaiLook, g, (look) => {
      ui.actions!.applyLook(look, who);
      saveGame(g);
      if (custReturn === "newgame_hero") {
        custReturn = "newgame_senpai";
        ui.showCustomize("senpai", g.senpaiLook, g, (sl) => {
          ui.actions!.applyLook(sl, "senpai");
          saveGame(g);
          startPlaying();
        }, false);
      } else if (custReturn === "newgame_senpai") {
        startPlaying();
      } else if (custReturn === "pause") {
        resumePlay();
      } else {
        toTitle();
      }
    }, false);
  }

  function rebuildSenpai(look: CharLook): void {
    const senpai = npcMgr.get("senpai");
    if (!senpai) return;
    const parent = senpai.group.parent;
    const newRig = buildCharacter(look);
    senpai.rig = newRig;
    senpai.group = newRig.root;
    senpai.def.look = look;
    if (parent) { parent.remove(senpai.group); parent.add(newRig.root); }
    newRig.root.position.copy(senpai.pos);
    newRig.anim.mode = "idle";
  }

  function startPlaying(): void {
    startAfterCustomize = true;
    sm.transition("playing");
    ui.closeScreen();
    ui.showHUD(true);
    player.frozen = false;
    player.group.visible = true;
    player.applyLook(g.customization);
    if (JSON.stringify(npcMgr.get("senpai")?.def.look) !== JSON.stringify(g.senpaiLook)) rebuildSenpai(g.senpaiLook);
    player.setSpawn(0, 14.5);
    const period = periodAt(g.minutes) as PeriodId;
    npcMgr.onPeriod(period, g.day);
    runScripts(period);
    audio.startMusic("day");
    ui.toast(`${DAY_NAMES[g.day]}, 07:00 — Escola Lianhua`, "info");
    addMessage(g, "s01", "Oi!! Você é a aluna nova, certo? Sou Xiao Mei! Wan Qing é minha amiga, mas não conta pra ela que eu falei isso 😅");
  }

  function resumePlay(): void {
    if (sm.is("customize")) sm.transition("playing");
    else if (sm.is("paused")) sm.transition("playing");
    ui.closeScreen();
    ui.showHUD(true);
    player.frozen = false;
    audio.startMusic("day");
  }

  function toTitle(): void {
    if (sm.is("dialogue", "phone")) { sm.transition("playing"); }
    if (sm.is("paused", "customize", "customize_senpai", "ending", "gameover", "playing")) {
      sm.transition("title");
    }
    ui.closeDialogueDom();
    ui.showHUD(false);
    ui.setPrompt(null);
    player.frozen = true;
    startAfterCustomize = false;
    audio.startMusic("title");
    ui.showTitle(hasSave(), loadMeta().endings.length);
  }

  /* ---------------- interaction scan ---------------- */
  let scanT = 0;
  let promptTarget: { kind: "npc"; id: string } | { kind: "obj"; it: Interactable } | null = null;

  function scanInteract(): void {
    promptTarget = null;
    let bestD: number = PLAYER.INTERACT_DIST;
    // NPCs
    for (const n of npcMgr.npcs) {
      if (!n.group.visible || n.state === "gone") continue;
      const d = Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z) + Math.abs(n.pos.y - player.pos.y) * 1.5;
      if (d < bestD) { bestD = d; promptTarget = { kind: "npc", id: n.id }; }
    }
    // objects
    for (const it of interactables) {
      if (it.cond && !it.cond(g)) continue;
      const d = Math.hypot(it.x - player.pos.x, it.z - player.pos.z) + Math.abs(it.y - player.pos.y) * 1.5;
      if (d < Math.min(bestD, it.r)) { bestD = d; promptTarget = { kind: "obj", it }; }
    }
    if (promptTarget) {
      const label = promptTarget.kind === "npc" ? `Falar com ${ui.nameOf(promptTarget.id)}` : promptTarget.it.label;
      ui.setPrompt(label, ui.isTouch ? "●" : "E");
    } else {
      ui.setPrompt(null);
    }
  }

  function doInteract(): void {
    if (!promptTarget || !sm.is("playing")) return;
    audio.sfx("ui");
    if (promptTarget.kind === "npc") {
      if (promptTarget.id === "senpai" && g.day === 4 && g.minutes >= 1050 && g.rivalResolved && player.pos.y > 6) {
        // rooftop epilogue
        fridayEpilogue();
        return;
      }
      startTalkWith(promptTarget.id);
    } else {
      promptTarget.it.action();
    }
  }

  /* ---------------- quality / resize ---------------- */
  function applyQuality(): void {
    const high = g.settings.quality === "high";
    renderer.shadowMap.enabled = high;
    sun.castShadow = high;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1.25));
    renderer.shadowMap.needsUpdate = true;
  }
  INPUT_CONFIG.INVERT_Y = g.settings.invertY;

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener("resize", onResize);
  onResize();

  /* ---------------- sky by time ---------------- */
  function makeSky(): { mesh: THREE.Mesh } {
    const geo = new THREE.SphereGeometry(220, 24, 16);
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x6fb2e8) },
        mid: { value: new THREE.Color(0xbfe0f2) },
        bot: { value: new THREE.Color(0xe8f2e0) },
      },
      vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        void main(){ float h=normalize(vP).y; vec3 c = h>0.12 ? mix(mid,top,smoothstep(0.12,0.7,h)) : mix(bot,mid,smoothstep(-0.25,0.12,h));
        gl_FragColor=vec4(c,1.0); }`,
    });
    return { mesh: new THREE.Mesh(geo, m) };
  }

  const SKY_KEYS = [
    { t: 420, top: 0x7aa8d8, mid: 0xf2d8b8, bot: 0xe8e0c8 },   // dawn
    { t: 540, top: 0x6fb2e8, mid: 0xbfe0f2, bot: 0xe8f2e0 },   // morning
    { t: 780, top: 0x5aa8e8, mid: 0xa8d8f2, bot: 0xd8ecd8 },   // noon
    { t: 960, top: 0x6a98d8, mid: 0xe8c898, bot: 0xf0e0b8 },   // golden
    { t: 1080, top: 0x3a4a88, mid: 0xd88a68, bot: 0xf2b888 },  // dusk
  ];
  const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color(), _c4 = new THREE.Color(), _c5 = new THREE.Color(), _c6 = new THREE.Color();

  function updateSky(): void {
    const m = g.minutes;
    let i = 0;
    while (i < SKY_KEYS.length - 2 && m > SKY_KEYS[i + 1].t) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    const f = Math.min(1, Math.max(0, (m - a.t) / (b.t - a.t)));
    const u = (sky.mesh.material as THREE.ShaderMaterial).uniforms;
    u.top.value.copy(_c1.setHex(a.top)).lerp(_c2.setHex(b.top), f);
    u.mid.value.copy(_c3.setHex(a.mid)).lerp(_c4.setHex(b.mid), f);
    u.bot.value.copy(_c5.setHex(a.bot)).lerp(_c6.setHex(b.bot), f);
    // sun & hemi follow
    const warm = Math.min(1, Math.max(0, (m - 900) / 180));
    sun.color.setHex(0xfff2dd).lerp(_c1.setHex(0xff9a58), warm);
    sun.intensity = 1.6 - warm * 0.5;
    hemi.intensity = 0.75 - warm * 0.28;
  }

  /* ---------------- main loop ---------------- */
  const clock = new THREE.Clock();
  let hudT = 0;
  let titleAngle = 0;
  let probePos = { x: 0, y: 0, z: 0 };

  const loop = new GameLoop({
    update: (dt) => {
      const st = sm.state;
      const playing = st === "playing";

      // global keys
      if (input.consumeAction("Escape")) {
        if (st === "playing") { sm.transition("paused"); ui.showPause(); player.frozen = true; audio.sfx("ui"); }
        else if (st === "paused") { resumePlay(); }
        else if (st === "phone") { ui.actions!.closePhone(); }
      }
      if ((st === "title") && (input.consumeAction("Space") || input.consumeAction("Enter"))) {
        if (hasSave()) ui.actions!.continueGame(); else ui.actions!.newGame();
      }
      if (playing && input.consumeAction("KeyE")) doInteract();
      if (playing && input.consumeAction("KeyP")) ui.actions!.openPhone();
      if (playing && input.consumeAction("KeyT")) ui.actions!.waitUntilNextPeriod();
      if (playing && input.consumeAction("KeyC")) ui.actions!.sitToggle();

      if (playing) {
        // time
        g.minutes += dt * TIME_SPEED * g.settings.timeScale;
        const p = periodAt(g.minutes);
        if (p !== lastPeriod) { lastPeriod = p; onPeriodChange(p as PeriodId); }
        if (g.minutes >= 1080) {
          if (g.day < 4) advanceDay();
          else fridayEpilogue();
        }
        if (g.reputation <= 0 && st === "playing") { finishRun("outcast"); }

        player.update(dt, input, world, window.innerWidth < window.innerHeight && window.innerWidth < 640);
        audio.footsteps(dt, player.moving, player.running);
        if (player.stairFlash > 0.2) audio.sfx("stairs");

        npcMgr.update(dt, camera.position);
        npcMgr.sweepGone();
        updateScripts(dt);

        // interactions
        scanT -= dt;
        if (scanT <= 0) { scanT = 0.15; scanInteract(); }

        // quests ticking
        autosaveT += dt;
        if (autosaveT > 8) { autosaveT = 0; checkQuests(); }

        // music mood
        const rival = npcMgr.get("rival");
        if (rival && rival.group.visible && rival.pos.distanceToSquared(player.pos) < 64) {
          if (audio.musicMode !== "tense") audio.startMusic("tense");
        } else if (audio.musicMode === "tense") {
          audio.startMusic("day");
        }
      } else if (st === "title" || st === "customize" || st === "customize_senpai") {
        titleAngle += dt * 0.06;
        npcMgr.update(dt, camera.position);
      }

      // camera
      if (st === "title") {
        camera.position.set(Math.sin(titleAngle) * 30, 12 + Math.sin(titleAngle * 0.7) * 3, 8 + Math.cos(titleAngle) * 30);
        camera.lookAt(0, 2, 4);
      } else if (st === "customize" || st === "customize_senpai") {
        camera.position.set(player.pos.x + Math.sin(0.4) * 2.6, player.pos.y + 1.62, player.pos.z + Math.cos(0.4) * 2.6);
        camera.lookAt(player.pos.x, player.pos.y + 1.05, player.pos.z);
      } else {
        player.updateCamera(camera, window.innerWidth < window.innerHeight && window.innerWidth < 640);
      }

      clouds.position.x += dt * 0.4;

      // HUD at ~5Hz
      hudT -= dt;
      if (hudT <= 0 && (playing || st === "dialogue" || st === "phone")) {
        hudT = 0.2;
        const room: RoomDefW | null = world.roomAt(player.pos.x, player.pos.z, player.pos.y);
        // quest hint
        let hint: string | null = null;
        for (const q of QUESTS) {
          if (g.activeQuests.includes(q.id) && !questCompleted(q.id)) {
            const idx = g.questStep[q.id] ?? 0;
            hint = `${q.name}: ${q.steps[idx].hint}`;
            break;
          }
        }
        ui.updateHUD(g, room ? room.name : "Campus", hint);
        ui.updateMapPlayer(player.pos.x, player.pos.z);
      }
    },
    render: () => {
      updateSky();
      probePos = { x: player.pos.x, y: player.pos.y, z: player.pos.z };
      renderer.render(scene, camera);
      window.__GAME_READY__ = true;
    },
  });

  window.__gameProbe = () => probePos;

  /* ---------------- boot into title ---------------- */
  applyQuality();
  toTitle();
  npcMgr.onPeriod("int1", 0); // lively school behind the title
  lastPeriod = "int1";
  loop.start();

  session = {
    dispose: () => {
      loop.stop();
      window.removeEventListener("resize", onResize);
      input.dispose();
      audio.dispose();
      ui.closeDialogueDom();
      renderer.dispose();
      delete window.__gameProbe;
      window.__GAME_READY__ = false;
    },
  };
}

export function stopGame(): void {
  session?.dispose();
  session = null;
}
