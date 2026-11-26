/**
 * ui.ts — every DOM screen of SWEET OBSESSION: title, customization, settings,
 * credits, pause, HUD, phone (messages/students/calendar/tasks/map/gallery/profile),
 * dialogue runner with choices, gift picker, toasts, fades, touch controls, endings.
 */
import type { CharLook, GameData, GiftId, PathId } from "./types";
import { GIFTS, DIALOGUES, QUESTS, ENDINGS, INFO_TOPICS, SMALLTALK, DAY_NAMES, PERIOD_NAMES, fmtTime, PATH_DONE_FLAG, detectQuestStart } from "./data/content";
import { ALL_NPCS, DEFAULT_HERO_LOOK, DEFAULT_SENPAI_LOOK } from "./data/students";
import { getRel, addMessage, unlockInfo } from "./state";

export interface UIActions {
  newGame(): void;
  continueGame(): void;
  customizeHero(): void;
  customizeSenpai(): void;
  backToTitle(): void;
  applyLook(look: CharLook, who: "hero" | "senpai"): void;
  resume(): void;
  saveGame(): void;
  retry(): void;
  openPhone(tab?: string): void;
  closePhone(): void;
  waitUntilNextPeriod(): void;
  sitToggle(): void;
  interact(): void;
  toggleRun(on: boolean): void;
  setTimeScale(v: number): void;
  setVolume(v: number): void;
  setQuality(q: "high" | "low"): void;
  setInvertY(b: boolean): void;
  resetSave(): void;
  showGallery(): void;
}

const SKIN_SW = [0xffe3cf, 0xf5cfae, 0xe8b894];
const HAIR_SW = [0x23232b, 0x3a2a20, 0x5d3a24, 0x7a4a2b, 0x2c3e57, 0x4a2c5a, 0x8b8f98, 0xd96a9e, 0x3f7d7a, 0xc7452f, 0xf0e6d8, 0x6b4226];
const EYE_SW = [0x5a3a22, 0x2b2b33, 0x3a6ea5, 0x4a8a4f, 0xc98a2d, 0xb33a3a, 0x7a4a9e, 0xd9668f];
const SOCK_SW = [0xffffff, 0x23233a, 0x8a2f3f, 0x2f5d8a, 0x3a3a44];
const SHOE_SW = [0x2b2b33, 0x6b4226, 0xd8d8e0, 0x8a2f3f, 0x3a5d8a];
const HAIR_STYLES: CharLook["hairStyle"][] = ["short", "bob", "long", "ponytail", "twintails", "bun", "hime"];
const HAIR_STYLE_NAMES = ["Curto", "Bob", "Longo", "Rabo de cavalo", "Maria-chiquinha", "Coque", "Hime"];
const EYE_SHAPES: CharLook["eyeShape"][] = ["round", "almond", "sharp", "gentle"];
const EYE_SHAPE_NAMES = ["Redondo", "Amendoado", "Fino", "Gentil"];
const UNIFORMS: CharLook["uniform"][] = ["sailor", "blazer", "sport"];
const UNIFORM_NAMES = ["Marinheiro", "Blazer", "Esportivo"];
const ACCESSORIES: CharLook["accessory"][] = ["none", "glasses", "ribbon", "clip", "choker", "cap"];
const ACCESSORY_NAMES = ["Nenhum", "Óculos", "Laço", "Presilha", "Gargantilha", "Boné"];
const MAKEUPS: CharLook["makeup"][] = ["none", "blush", "shadow"];
const MAKEUP_NAMES = ["Natural", "Blush", "Sombra rosa"];
const PERSONAS: CharLook["personality"][] = ["gentle", "cheerful", "shy", "serious", "tsundere", "cool"];
const PERSONA_NAMES = ["Gentil", "Alegre", "Tímida", "Séria", "Tsundere", "Fria"];

function h(tag: string, cls: string, html = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
function btn(label: string, cls = "btn"): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  return b;
}
function hex(c: number): string { return "#" + c.toString(16).padStart(6, "0"); }

/* ================================================================== */
export class GameUI {
  readonly root: HTMLElement;
  actions: UIActions | null = null;
  private g: GameData | null = null;
  private screen: HTMLElement | null = null;
  private hud: HTMLElement;
  private clockEl: HTMLElement;
  private dayEl: HTMLElement;
  private periodEl: HTMLElement;
  private locEl: HTMLElement;
  private repFill: HTMLElement;
  private affNum: HTMLElement;
  private affFill: HTMLElement;
  private promptEl: HTMLElement;
  private toastBox: HTMLElement;
  private fadeEl: HTMLElement;
  private questEl: HTMLElement;
  dialogueEl: HTMLElement | null = null;
  typeTimer: ReturnType<typeof setInterval> | null = null;
  onDialogueState: (open: boolean) => void = () => {};
  sfx: (id: string) => void = () => {};
  isTouch = false;

  constructor(overlay: HTMLElement) {
    this.root = overlay;
    this.isTouch = window.matchMedia("(pointer: coarse)").matches;

    // HUD
    this.hud = h("div", "hud hidden");
    const top = h("div", "hud-top");
    this.clockEl = h("div", "hud-clock", "07:00");
    this.dayEl = h("div", "hud-day", "Segunda");
    this.periodEl = h("div", "hud-period", "Chegada");
    const timeBox = h("div", "hud-timebox");
    timeBox.append(this.clockEl, this.dayEl, this.periodEl);
    this.locEl = h("div", "hud-loc", "Pátio Central");
    top.append(timeBox, this.locEl);

    const left = h("div", "hud-left");
    const repBox = h("div", "hud-stat");
    repBox.append(h("span", "hud-stat-label", "REPUTAÇÃO"));
    const repBar = h("div", "hud-bar");
    this.repFill = h("div", "hud-bar-fill rep");
    repBar.append(this.repFill);
    const affBox = h("div", "hud-stat");
    affBox.append(h("span", "hud-stat-label", "♥ SENPAI"));
    const affBar = h("div", "hud-bar");
    this.affFill = h("div", "hud-bar-fill aff");
    this.affNum = h("span", "hud-aff-num", "10");
    affBar.append(this.affFill, this.affNum);
    left.append(repBox, affBox);

    this.questEl = h("div", "hud-quest hidden");

    this.promptEl = h("div", "hud-prompt hidden", "");

    const quick = h("div", "hud-quick");
    const mk = (label: string, key: string, fn: () => void, cls = "") => {
      const b = btn(label, "qbtn " + cls);
      b.dataset.key = key;
      b.addEventListener("click", () => { this.sfx("ui"); fn(); });
      quick.append(b);
      return b;
    };
    mk("☰", "Esc", () => this.showPause(), "qbtn-pause");
    mk("Celular", "P", () => this.actions?.openPhone());
    mk("Tarefas", "J", () => this.actions?.openPhone("tasks"));
    mk("Aguardar", "T", () => this.actions?.waitUntilNextPeriod());
    mk("Sentar", "C", () => this.actions?.sitToggle());

    this.hud.append(top, left, this.questEl, this.promptEl, quick);
    if (this.isTouch) {
      const touch = h("div", "touch-controls");
      const run = btn("CORRER", "tbtn");
      run.addEventListener("touchstart", (e) => { e.preventDefault(); run.classList.add("on"); this.actions?.toggleRun(true); }, { passive: false });
      run.addEventListener("touchend", () => { run.classList.remove("on"); this.actions?.toggleRun(false); });
      const act = btn("E", "tbtn tbtn-act");
      act.addEventListener("touchstart", (e) => { e.preventDefault(); this.actions?.interact(); }, { passive: false });
      const phone = btn("☎", "tbtn");
      phone.addEventListener("touchstart", (e) => { e.preventDefault(); this.actions?.openPhone(); }, { passive: false });
      touch.append(run, act, phone);
      this.hud.append(touch);
      const stickHint = h("div", "stick-hint", "◀ mover · arrastar direita = câmera ▶");
      this.hud.append(stickHint);
    }

    this.toastBox = h("div", "toast-box");
    this.fadeEl = h("div", "fade");
    this.root.append(this.hud, this.toastBox, this.fadeEl);
  }

  bind(g: GameData): void { this.g = g; }

  /* ------------------------------------------------------------------ */
  /* Screen helpers                                                      */
  /* ------------------------------------------------------------------ */

  private clearScreen(): void {
    if (this.screen) { this.screen.remove(); this.screen = null; }
    this.closeDialogueDom();
  }

  /** Public: dismiss whichever full-screen panel is open (title, pause, phone…). */
  closeScreen(): void {
    this.clearScreen();
  }

  private showScreen(cls: string): HTMLElement {
    this.clearScreen();
    const s = h("div", "screen " + cls);
    this.screen = s;
    this.root.append(s);
    return s;
  }

  showHUD(show: boolean): void {
    this.hud.classList.toggle("hidden", !show);
  }

  fade(cb: () => void, dur = 350): void {
    this.fadeEl.classList.add("on");
    setTimeout(() => {
      cb();
      setTimeout(() => this.fadeEl.classList.remove("on"), 60);
    }, dur);
  }

  toast(msg: string, kind: "info" | "good" | "bad" = "info"): void {
    const t = h("div", "toast " + kind, msg);
    this.toastBox.append(t);
    this.sfx(kind === "bad" ? "fail" : kind === "good" ? "success" : "notify");
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  /* ------------------------------------------------------------------ */
  /* TITLE                                                               */
  /* ------------------------------------------------------------------ */

  showTitle(hasSave: boolean, endings: number): void {
    const s = this.showScreen("title-screen");
    const panel = h("div", "title-panel");
    panel.append(h("div", "game-logo", "SWEET<br>OBSESSION"));
    panel.append(h("div", "game-sub", "Uma semana na Escola Lianhua · 莲花中学"));
    const menu = h("div", "title-menu");
    const add = (label: string, fn: () => void, cls = "btn btn-title", disabled = false) => {
      const b = btn(label, cls);
      b.disabled = disabled;
      if (disabled) b.title = "Nenhum save encontrado";
      b.addEventListener("click", () => { this.sfx("ui"); fn(); });
      menu.append(b);
    };
    add("NOVO JOGO", () => this.actions!.newGame());
    add("CONTINUAR", () => this.actions!.continueGame(), "btn btn-title", !hasSave);
    add("PERSONALIZAR PERSONAGEM", () => this.actions!.customizeHero(), "btn btn-title btn-small");
    add("CONFIGURAÇÕES", () => this.showSettings(), "btn btn-title btn-small");
    add("CRÉDITOS", () => this.showCredits(), "btn btn-title btn-small");
    add("SAIR", () => this.showQuit(), "btn btn-title btn-small");
    panel.append(menu);
    if (endings > 0) panel.append(h("div", "title-endings", `★ ${endings}/11 finais descobertos`));
    panel.append(h("div", "title-hint", "WASD mover · Shift correr · Mouse câmera · E interagir · P celular · Esc pausa"));
    s.append(panel);
  }

  private showQuit(): void {
    const s = this.showScreen("quit-screen");
    const panel = h("div", "modal-panel");
    panel.append(h("h2", "", "Até logo!"));
    panel.append(h("p", "", "Obrigada por jogar SWEET OBSESSION. Feche a aba do navegador quando quiser — seu progresso fica salvo neste navegador."));
    const b = btn("VOLTAR AO MENU", "btn");
    b.addEventListener("click", () => { this.sfx("ui"); this.showTitle(true, 0); });
    panel.append(b);
    s.append(panel);
  }

  /* ------------------------------------------------------------------ */
  /* SETTINGS & CREDITS                                                  */
  /* ------------------------------------------------------------------ */

  showSettings(fromPause = false): void {
    const g = this.g!;
    const s = this.showScreen("settings-screen");
    const panel = h("div", "modal-panel");
    panel.append(h("h2", "", "Configurações"));
    // volume
    const volRow = h("div", "set-row");
    volRow.append(h("label", "", "Volume"));
    const vol = document.createElement("input");
    vol.type = "range"; vol.min = "0"; vol.max = "100"; vol.value = String(g.settings.volume * 100);
    vol.addEventListener("input", () => this.actions!.setVolume(Number(vol.value) / 100));
    volRow.append(vol);
    // time scale
    const tsRow = h("div", "set-row");
    tsRow.append(h("label", "", "Velocidade do tempo"));
    const sel = document.createElement("select");
    for (const [v, label] of [[0.5, "Lenta (0.5×)"], [1, "Normal (1×)"], [2, "Rápida (2×)"]] as const) {
      const o = document.createElement("option");
      o.value = String(v); o.textContent = label;
      if (g.settings.timeScale === v) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener("change", () => this.actions!.setTimeScale(Number(sel.value)));
    tsRow.append(sel);
    // quality
    const qRow = h("div", "set-row");
    qRow.append(h("label", "", "Qualidade gráfica"));
    const qsel = document.createElement("select");
    for (const [v, label] of [["high", "Alta (sombras)"], ["low", "Baixa (performance)"]] as const) {
      const o = document.createElement("option");
      o.value = v; o.textContent = label;
      if (g.settings.quality === v) o.selected = true;
      qsel.append(o);
    }
    qsel.addEventListener("change", () => this.actions!.setQuality(qsel.value as "high" | "low"));
    qRow.append(qsel);
    // invert Y
    const invRow = h("div", "set-row");
    invRow.append(h("label", "", "Inverter câmera vertical"));
    const inv = document.createElement("input");
    inv.type = "checkbox"; inv.checked = g.settings.invertY;
    inv.addEventListener("change", () => this.actions!.setInvertY(inv.checked));
    invRow.append(inv);
    panel.append(volRow, tsRow, qRow, invRow);
    const back = btn("VOLTAR", "btn");
    back.addEventListener("click", () => {
      this.sfx("ui");
      if (fromPause) this.showPause(); else this.showTitle(true, 0);
    });
    panel.append(back);
    s.append(panel);
  }

  showCredits(): void {
    const s = this.showScreen("credits-screen");
    const panel = h("div", "modal-panel");
    panel.append(h("h2", "", "Créditos"));
    panel.append(h("div", "credits-body", `
      <p><b>SWEET OBSESSION</b> — um jogo 3D de simulação escolar</p>
      <p>Design, código, arte procedural e música: gerados em tempo real para você.</p>
      <p>Personagens, história, escola e finais são originais.</p>
      <p>Renderização: Three.js · Áudio: Web Audio API</p>
      <p class="credits-dim">Todos os eventos são fictícios. Nenhum método de dano real é descrito — só drama adolescente e escolhas narrativas.</p>
    `));
    const back = btn("VOLTAR", "btn");
    back.addEventListener("click", () => { this.sfx("ui"); this.showTitle(true, 0); });
    panel.append(back);
    s.append(panel);
  }

  /* ------------------------------------------------------------------ */
  /* PAUSE                                                               */
  /* ------------------------------------------------------------------ */

  showPause(): void {
    const s = this.showScreen("pause-screen");
    const panel = h("div", "modal-panel");
    panel.append(h("h2", "", "Pausado"));
    const mk = (label: string, fn: () => void) => {
      const b = btn(label, "btn btn-title btn-small");
      b.addEventListener("click", () => { this.sfx("ui"); fn(); });
      panel.append(b);
    };
    mk("CONTINUAR", () => this.actions!.resume());
    mk("SALVAR JOGO", () => { this.actions!.saveGame(); this.toast("Jogo salvo.", "good"); });
    mk("CONFIGURAÇÕES", () => this.showSettings(true));
    mk("PERSONALIZAR PERSONAGEM", () => this.actions!.customizeHero());
    mk("REINICIAR SEMANA (volta à segunda)", () => {
      if (confirm("Voltar ao início da semana? O progresso do dia será perdido.")) this.actions!.retry();
    });
    mk("VOLTAR AO MENU", () => this.actions!.backToTitle());
    s.append(panel);
  }

  /* ------------------------------------------------------------------ */
  /* ENDING / GAME OVER                                                  */
  /* ------------------------------------------------------------------ */

  showEnding(id: keyof typeof ENDINGS, g: GameData): void {
    const e = ENDINGS[id];
    const s = this.showScreen("ending-screen tone-" + e.tone);
    const panel = h("div", "ending-panel");
    panel.append(h("div", "ending-tag", e.tone === "good" ? "FINAL BOM" : e.tone === "secret" ? "FINAL SECRETO" : "GAME OVER"));
    panel.append(h("h1", "ending-title", e.title));
    const body = h("div", "ending-text", "");
    panel.append(body);
    // typewriter
    const full = e.text(g).replace(/\n/g, "<br>");
    let i = 0;
    const plain = e.text(g);
    body.textContent = "";
    this.typeTimer = setInterval(() => {
      i += 3;
      body.textContent = plain.slice(0, i);
      if (i % 24 < 3) this.sfx("talk");
      if (i >= plain.length && this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
    }, 24);
    const stats = h("div", "ending-stats",
      `Reputação ${Math.round(g.reputation)} · Afinidade ${Math.round(g.affinity)} · Amizade c/ Wan Qing ${Math.round(g.rel.rival?.friend ?? 0)}`);
    panel.append(stats);
    const row = h("div", "ending-btns");
    const again = btn("TENTAR NOVAMENTE", "btn");
    again.addEventListener("click", () => { this.sfx("ui"); this.actions!.retry(); });
    const menu = btn("VOLTAR AO MENU", "btn btn-ghost");
    menu.addEventListener("click", () => { this.sfx("ui"); this.actions!.backToTitle(); });
    const gal = btn("VER FINAIS DESBLOQUEADOS", "btn btn-ghost");
    gal.addEventListener("click", () => { this.sfx("ui"); this.showGallery(g); });
    row.append(again, menu, gal);
    panel.append(row);
    s.append(panel);
  }

  showGallery(g: GameData): void {
    const s = this.showScreen("gallery-screen");
    const panel = h("div", "modal-panel gallery-panel");
    panel.append(h("h2", "", "Galeria de Finais"));
    const grid = h("div", "gallery-grid");
    const all = Object.keys(ENDINGS) as (keyof typeof ENDINGS)[];
    for (const id of all) {
      const has = g.gallery.includes(id);
      const cell = h("div", "gallery-cell " + (has ? "unlocked tone-" + ENDINGS[id].tone : "locked"));
      cell.append(h("div", "gallery-title", has ? ENDINGS[id].title : "???"));
      if (has) cell.append(h("div", "gallery-tone", ENDINGS[id].tone === "good" ? "★" : ENDINGS[id].tone === "secret" ? "✦" : "☠"));
      grid.append(cell);
    }
    panel.append(grid, h("div", "", `${g.gallery.length}/${all.length} finais`));
    const back = btn("VOLTAR", "btn");
    back.addEventListener("click", () => { this.sfx("ui"); this.showEnding(g.gallery[g.gallery.length - 1] as keyof typeof ENDINGS, g); });
    panel.append(back);
    s.append(panel);
  }

  /* ------------------------------------------------------------------ */
  /* HUD updates                                                         */
  /* ------------------------------------------------------------------ */

  updateHUD(g: GameData, location: string, questHint: string | null): void {
    this.clockEl.textContent = fmtTime(g.minutes);
    this.dayEl.textContent = DAY_NAMES[g.day] ?? "—";
    let periodName = "—";
    for (const [, [a, b, name]] of Object.entries(PERIOD_NAMES)) {
      if (g.minutes >= a && g.minutes < b) periodName = name;
    }
    this.periodEl.textContent = periodName;
    this.locEl.textContent = location;
    this.repFill.style.width = `${Math.max(0, Math.min(100, g.reputation))}%`;
    this.repFill.classList.toggle("low", g.reputation < 25);
    this.affNum.textContent = String(Math.round(g.affinity));
    this.affFill.style.width = `${Math.max(0, Math.min(100, g.affinity))}%`;
    if (questHint) {
      this.questEl.classList.remove("hidden");
      this.questEl.textContent = "❀ " + questHint;
    } else {
      this.questEl.classList.add("hidden");
    }
  }

  setPrompt(text: string | null, keyLabel = "E"): void {
    if (text) {
      this.promptEl.classList.remove("hidden");
      this.promptEl.innerHTML = `<span class="key">${keyLabel}</span> ${text}`;
    } else {
      this.promptEl.classList.add("hidden");
    }
  }

  /* ------------------------------------------------------------------ */
  /* CUSTOMIZATION                                                       */
  /* ------------------------------------------------------------------ */

  showCustomize(who: "hero" | "senpai", look: CharLook, g: GameData, onDone: (look: CharLook) => void, fromPause: boolean): void {
    const cur: CharLook = JSON.parse(JSON.stringify(look));
    const s = this.showScreen("customize-screen");
    const panel = h("div", "cust-panel");
    panel.append(h("h2", "", who === "hero" ? "Personalizar Personagem" : "Personalizar Senpai"));
    const form = h("div", "cust-form");

    const row = (label: string, el: HTMLElement) => {
      const r = h("div", "set-row");
      r.append(h("label", "", label));
      r.append(el);
      form.append(r);
      return r;
    };
    const swatchRow = (label: string, colors: number[], get: () => number, set: (v: number) => void) => {
      const box = h("div", "swatches");
      const render = () => {
        box.innerHTML = "";
        for (const c of colors) {
          const sw = h("button", "swatch" + (get() === c ? " on" : ""));
          sw.style.background = hex(c);
          sw.addEventListener("click", () => { set(c); this.sfx("ui"); render(); });
          box.append(sw);
        }
      };
      render();
      row(label, box);
    };
    const optionRow = <T extends string>(label: string, values: readonly T[], names: string[], get: () => T, set: (v: T) => void) => {
      const box = h("div", "opt-row");
      const render = () => {
        box.innerHTML = "";
        values.forEach((v, i) => {
          const b = btn(names[i], "opt" + (get() === v ? " on" : ""));
          b.addEventListener("click", () => { set(v); this.sfx("ui"); render(); });
          box.append(b);
        });
      };
      render();
      row(label, box);
    };
    const sliderRow = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void) => {
      const inp = document.createElement("input");
      inp.type = "range"; inp.min = String(min); inp.max = String(max); inp.step = String(step);
      inp.value = String(get());
      inp.addEventListener("input", () => { set(Number(inp.value)); });
      row(label, inp);
    };

    // name
    const nameInp = document.createElement("input");
    nameInp.type = "text"; nameInp.maxLength = 14; nameInp.value = cur.name;
    nameInp.addEventListener("input", () => { cur.name = nameInp.value || (who === "hero" ? "Tian Tian" : "Gu Ren"); push(); });
    row("Nome", nameInp);

    if (who === "hero") {
      optionRow("Gênero", ["f", "m"] as const, ["Feminino", "Masculino"], () => cur.gender, (v) => { cur.gender = v; push(); });
    }
    swatchRow("Tom de pele", SKIN_SW, () => cur.skin, (v) => { cur.skin = v; push(); });
    swatchRow("Cor do cabelo", HAIR_SW, () => cur.hairColor, (v) => { cur.hairColor = v; push(); });
    optionRow("Penteado", HAIR_STYLES, HAIR_STYLE_NAMES, () => cur.hairStyle, (v) => { cur.hairStyle = v; push(); });
    sliderRow("Comprimento do cabelo", 0, 1, 0.05, () => cur.hairLength, (v) => { cur.hairLength = v; push(); });
    swatchRow("Cor dos olhos", EYE_SW, () => cur.eyeColor, (v) => { cur.eyeColor = v; push(); });
    optionRow("Formato dos olhos", EYE_SHAPES, EYE_SHAPE_NAMES, () => cur.eyeShape, (v) => { cur.eyeShape = v; push(); });
    optionRow("Uniforme", UNIFORMS, UNIFORM_NAMES, () => cur.uniform, (v) => { cur.uniform = v; push(); });
    sliderRow("Tom do uniforme", 0, 1, 0.05, () => cur.uniformHue, (v) => { cur.uniformHue = v; push(); });
    swatchRow("Meias", SOCK_SW, () => cur.sockColor, (v) => { cur.sockColor = v; push(); });
    swatchRow("Sapatos", SHOE_SW, () => cur.shoeColor, (v) => { cur.shoeColor = v; push(); });
    optionRow("Acessório", ACCESSORIES, ACCESSORY_NAMES, () => cur.accessory, (v) => { cur.accessory = v; push(); });
    if (who === "hero") {
      optionRow("Maquiagem", MAKEUPS, MAKEUP_NAMES, () => cur.makeup, (v) => { cur.makeup = v; push(); });
    }
    optionRow("Personalidade", PERSONAS, PERSONA_NAMES, () => cur.personality, (v) => { cur.personality = v; push(); });

    panel.append(form);
    const btns = h("div", "cust-btns");
    const done = btn("CONFIRMAR", "btn");
    done.addEventListener("click", () => { this.sfx("success"); onDone(cur); });
    const back = btn("VOLTAR", "btn btn-ghost");
    back.addEventListener("click", () => { this.sfx("ui"); onDone(JSON.parse(JSON.stringify(look))); });
    btns.append(done, back);
    panel.append(btns);
    s.append(panel);

    let last = "";
    const push = () => {
      const key = JSON.stringify(cur);
      if (key === last) return;
      last = key;
      this.actions!.applyLook(JSON.parse(JSON.stringify(cur)), who);
    };
    push();
  }

  /* ------------------------------------------------------------------ */
  /* PHONE                                                               */
  /* ------------------------------------------------------------------ */

  showPhone(g: GameData, tab = "messages"): void {
    const s = this.showScreen("phone-screen");
    const frame = h("div", "phone-frame");
    const bar = h("div", "phone-bar");
    bar.append(h("span", "phone-title", "✿ Sweet Phone"));
    const close = btn("✕", "phone-close");
    close.addEventListener("click", () => { this.sfx("ui"); this.actions!.closePhone(); });
    bar.append(close);
    const body = h("div", "phone-body");
    const tabs = h("div", "phone-tabs");
    const tabDefs: [string, string][] = [
      ["messages", "Mensagens"], ["tasks", "Tarefas"], ["students", "Estudantes"],
      ["calendar", "Calendário"], ["map", "Mapa"], ["gallery", "Galeria"], ["profile", "Perfil"],
    ];
    const render = (t: string) => {
      tabs.innerHTML = "";
      for (const [id, label] of tabDefs) {
        const b = btn(label, "ptab" + (id === t ? " on" : ""));
        b.addEventListener("click", () => { this.sfx("ui"); render(id); });
        tabs.append(b);
      }
      body.innerHTML = "";
      this.renderPhoneTab(body, g, t);
    };
    render(tab);
    frame.append(bar, body, tabs);
    s.append(frame);
  }

  private renderPhoneTab(body: HTMLElement, g: GameData, tab: string): void {
    if (tab === "messages") {
      const unread = g.messages.filter((m) => !m.read).length;
      if (unread) g.messages.forEach((m) => (m.read = true));
      const list = h("div", "msg-list");
      if (!g.messages.length) list.append(h("div", "empty", "Sem mensagens."));
      for (const m of [...g.messages].reverse()) {
        const from = m.from === "senpai" ? g.senpaiName : m.from === "rival" ? "Wan Qing" : m.from === "mamae" ? "Mãe" : this.nameOf(m.from);
        const item = h("div", "msg-item" + (m.day === g.day ? "" : " old"));
        item.append(h("div", "msg-from", from));
        item.append(h("div", "msg-text", m.text));
        item.append(h("div", "msg-day", DAY_NAMES[m.day] ?? ""));
        list.append(item);
      }
      body.append(list);
      return;
    }
    if (tab === "tasks") {
      const list = h("div", "task-list");
      const act = QUESTS.filter((q) => g.activeQuests.includes(q.id) && !(g.questStep[q.id] ?? 0 >= q.steps.length));
      if (!act.length) list.append(h("div", "empty", "Nenhuma trama ativa. Explore, converse e observe a rotina da escola para descobrir caminhos."));
      for (const q of act) {
        const idx = g.questStep[q.id] ?? 0;
        const box = h("div", "task-item kind-" + q.kind);
        box.append(h("div", "task-name", (q.kind === "suspense" ? "✦ " : "❀ ") + q.name));
        const step = q.steps[Math.min(idx, q.steps.length - 1)];
        box.append(h("div", "task-hint", `${idx + 1}/${q.steps.length}: ${step.hint}`));
        list.append(box);
      }
      body.append(list);
      return;
    }
    if (tab === "students") {
      const list = h("div", "stu-list");
      for (const def of ALL_NPCS) {
        if (def.id === "senpai" || def.id === "rival") continue;
        const rel = getRel(g, def.id);
        const item = h("div", "stu-item");
        const dot = h("span", "stu-dot");
        dot.style.background = hex(def.look.hairColor);
        const name = h("span", "stu-name", def.look.name);
        const meta = h("span", "stu-meta", `${def.cls} · ${def.club ?? "Sem clube"}`);
        const hearts = h("span", "stu-hearts", "♥".repeat(Math.min(5, Math.floor(rel.friend / 20))) || "·");
        item.append(dot, name, meta, hearts);
        // gossip detail
        const known = def.gossip.filter((t) => g.info[t]);
        const avail = def.gossip.filter((t) => !g.info[t] && rel.friend >= (INFO_TOPICS[t]?.needFriend ?? 999));
        if (known.length || avail.length) {
          const det = h("div", "stu-det");
          for (const t of known) det.append(h("div", "stu-info", "✔ " + (INFO_TOPICS[t]?.name ?? t)));
          for (const t of avail) det.append(h("div", "stu-info dim", "? " + (INFO_TOPICS[t]?.name ?? t) + " — pergunte pessoalmente"));
          item.append(det);
        }
        list.append(item);
      }
      body.append(list);
      return;
    }
    if (tab === "calendar") {
      const grid = h("div", "cal-grid");
      grid.append(h("div", "cal-head", ""));
      for (let d = 0; d < 5; d++) grid.append(h("div", "cal-head" + (d === g.day ? " today" : ""), DAY_NAMES[d]));
      const periods = Object.entries(PERIOD_NAMES);
      const KNOWN: Record<string, string[]> = {
        "0|almoco": ["Wan Qing almoça no refeitório e depois vai ao pátio", "Senpai almoça na biblioteca"],
        "0|clubes": ["Wan Qing no conselho", "Senpai na biblioteca"],
        "0|livre": ["Wan Qing caminha no jardim"],
        "1|int2": ["Senpai na quadra"],
        "1|livre": ["Wan Qing no jardim"],
        "2|almoco": ["Wan Qing sozinha (telhado?) — dizem que ela gosta de ficar sozinha às quartas"],
        "3|aula3": ["Wan Qing passou mal — enfermaria?"],
        "3|clubes": ["Wan Qing no conselho"],
        "4|clubes": ["Wan Qing ensaia algo sozinha"],
        "4|saida": ["17h30 — Wan Qing foi vista subindo ao telhado com uma carta"],
      };
      for (const [pid, [, , pname]] of periods) {
        grid.append(h("div", "cal-head", pname));
        for (let d = 0; d < 5; d++) {
          const cell = h("div", "cal-cell" + (d === g.day ? " today" : ""));
          const evs = KNOWN[`${d}|${pid}`];
          if (evs && (g.info.rival_horario || d <= g.day)) {
            for (const e of evs) cell.append(h("div", "cal-ev", e));
          }
          grid.append(cell);
        }
      }
      body.append(h("div", "cal-note", g.info.rival_horario ? "Agenda completa da Wan Qing desbloqueada." : "Descubra a agenda dela conversando com amigas dela (conselho, sala 2-A)."));
      body.append(grid);
      return;
    }
    if (tab === "map") {
      body.append(h("div", "map-note", "Você está no ponto rosa. O telhado fica acessível pelas escadas dos lados do prédio principal."));
      const map = h("div", "school-map");
      // world x[-50,50] → %left, z[-26,38] → %top
      const zone = (cls: string, label: string, x: number, z: number, w: number, d: number) => {
        const el = h("div", "mz " + cls, label);
        el.style.left = (x + 50) + "%";
        el.style.top = ((z + 26) / 64 * 100) + "%";
        el.style.width = w + "%";
        el.style.height = (d / 64 * 100) + "%";
        map.append(el);
      };
      zone("mz-main", "Prédio Principal · 2º andar: biblioteca, labs, música, artes, conselho", -30, -22, 60, 16);
      zone("mz-garden", "Jardim", -24, 6, 20, 14);
      zone("mz-court", "Quadra", 6, 6, 18, 14);
      zone("mz-gym", "Ginásio · Vestiários", -46, -18, 14, 28);
      zone("mz-cafe", "Refeitório · Cozinha", 32, -18, 14, 20);
      zone("mz-annex", "Banheiros", -30, 22, 10, 8);
      zone("mz-annex", "Sala de Clubes", -20, 22, 16, 8);
      zone("mz-annex", "Portaria", 4, 22, 12, 8);
      const tree = h("div", "mz-tree", "✿");
      tree.style.left = "49.4%";
      tree.style.top = "51.5%";
      map.append(tree);
      const gate = h("div", "mz-gate", "Portão principal — rua");
      gate.style.left = "38%";
      gate.style.top = "87%";
      map.append(gate);
      map.append(h("div", "map-player-dot", ""));
      body.append(map);
      return;
    }
    if (tab === "gallery") {
      const grid = h("div", "gallery-grid");
      const all = Object.keys(ENDINGS) as (keyof typeof ENDINGS)[];
      for (const id of all) {
        const has = g.gallery.includes(id);
        const cell = h("div", "gallery-cell " + (has ? "unlocked tone-" + ENDINGS[id].tone : "locked"));
        cell.append(h("div", "gallery-title", has ? ENDINGS[id].title : "???"));
        if (has) cell.append(h("div", "gallery-tone", ENDINGS[id].tone === "good" ? "★" : ENDINGS[id].tone === "secret" ? "✦" : "☠"));
        grid.append(cell);
      }
      body.append(grid, h("div", "", `${g.gallery.length}/${all.length} finais descobertos`));
      return;
    }
    if (tab === "profile") {
      const c = g.customization;
      const box = h("div", "profile-box");
      box.append(h("div", "prof-name", g.heroName));
      box.append(h("div", "prof-line", `Personalidade: ${PERSONA_NAMES[PERSONAS.indexOf(c.personality)]}`));
      box.append(h("div", "prof-line", `Reputação: ${Math.round(g.reputation)}/100`));
      box.append(h("div", "prof-line", `Afinidade com ${g.senpaiName}: ${Math.round(g.affinity)}/100`));
      box.append(h("div", "prof-line", `Amizade com Wan Qing: ${Math.round(g.rel.rival?.friend ?? 0)}/100`));
      box.append(h("div", "prof-line", `Inventário: ${Object.entries(g.inventory).filter(([, n]) => n > 0).map(([k, n]) => `${GIFTS[k as GiftId].name} ×${n}`).join(" · ") || "vazio"}`));
      const edit = btn("EDITAR APARÊNCIA", "btn btn-small");
      edit.addEventListener("click", () => { this.sfx("ui"); this.actions!.customizeHero(); });
      const editS = btn("EDITAR SENPAI", "btn btn-small");
      editS.addEventListener("click", () => { this.sfx("ui"); this.actions!.customizeSenpai(); });
      box.append(edit, editS);
      body.append(box);
      return;
    }
  }

  updateMapPlayer(x: number, z: number): void {
    const dot = this.root.querySelector(".map-player-dot") as HTMLElement | null;
    if (!dot) return;
    const nx = Math.max(1, Math.min(99, ((x + 50) / 100) * 100));
    const nz = Math.max(1, Math.min(99, ((z + 26) / 64) * 100));
    dot.style.left = nx + "%";
    dot.style.top = nz + "%";
  }

  nameOf(id: string): string {
    if (id === "senpai") return this.g?.senpaiName ?? "Senpai";
    const d = ALL_NPCS.find((s) => s.id === id);
    return d ? d.look.name : id;
  }
}

/* ================================================================== */
/* Dialogue + interaction logic (appended to GameUI)                   */
/* ================================================================== */

import type { StudentDef } from "./types";

export interface DialogueCtx {
  g: GameData;
  npcId: string;
  npcDef?: StudentDef;
  onEnd: () => void;
  onGift: (npcId: string) => void;
}

declare module "./ui" {
  interface GameUI {
    startTalk(npcId: string, def: StudentDef | undefined, ctx: DialogueCtx): void;
    openDialogue(startNode: string, ctx: DialogueCtx): void;
    closeDialogueDom(): void;
    renderNode(nodeId: string, ctx: DialogueCtx): void;
    openDialogueDyn(node: import("./types").DialogNode, ctx: DialogueCtx, nodeId?: string): void;
  }
}

GameUI.prototype.closeDialogueDom = function (this: GameUI): void {
  if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
  if (this.dialogueEl) { this.dialogueEl.remove(); this.dialogueEl = null; }
  this.onDialogueState(false);
};

GameUI.prototype.startTalk = function (this: GameUI, npcId: string, def: StudentDef | undefined, ctx: DialogueCtx): void {
  const g = ctx.g;
  const rel = getRel(g, npcId);
  const firstTime = !rel.met;
  rel.met = true;
  if (!def) { ctx.onEnd(); return; }

  // Senpai, rival and special-role NPCs have authored trees
  if (npcId === "senpai") { if (firstTime) g.flags.met_senpai = true; this.openDialogue("senpai:root", ctx); return; }
  if (npcId === "rival") { if (firstTime) g.flags.met_rival = true; this.openDialogue("rival:root", ctx); return; }
  if (def.role === "rift") { this.openDialogue("rift:root", ctx); return; }
  if (def.role === "match") { this.openDialogue("match:root", ctx); return; }
  if (def.role === "photo") {
    if (g.flags.rumor_confronted) { this.openDialogue("photo:confronted", ctx); return; }
    this.openDialogue("photo:root", ctx); return;
  }
  if (def.id === "s09") { this.openDialogue("rumor_boy:root", ctx); return; }

  // ---------- generic student: dynamic menu ----------
  const persona = SMALLTALK[def.look.personality] ?? SMALLTALK.gentle;
  const talkKey = `talk_${npcId}_${g.day}`;
  const giftKey = `gifted_${npcId}_${g.day}`;
  const hangoutKey = `hang_${npcId}_${g.day}`;
  const node: import("./types").DialogNode = {
    speaker: npcId,
    text: firstTime ? `Oi! Eu sou ${def.look.name}. ${def.personality}` : persona.greet[Math.floor(Math.random() * persona.greet.length)],
    choices: [
      {
        text: "Conversar",
        cond: () => !g.flags[talkKey],
        effects: () => {
          g.flags[talkKey] = true;
          const gain = 3 + Math.floor(Math.random() * 3);
          rel.friend = Math.min(100, rel.friend + gain);
          rel.lastTalkDay = g.day;
          return `${def.look.name} gostou da conversa (+${gain} amizade)`;
        },
        next: "__SMALLTALK__",
      },
      {
        text: "Presentear",
        cond: () => Object.values(g.inventory).some((n) => n > 0),
        next: "__GIFT__",
      },
      ...def.gossip
        .filter((t) => !g.info[t] && rel.friend >= (INFO_TOPICS[t]?.needFriend ?? 999))
        .map((t) => ({
          text: `Perguntar: ${INFO_TOPICS[t]?.name ?? t}`,
          effects: () => {
            unlockInfo(g, t);
            rel.friend = Math.min(100, rel.friend + 5);
            g.flags[talkKey] = true;
            return `Informação desbloqueada: ${INFO_TOPICS[t]?.name}`;
          },
          next: `__INFO__${t}`,
        })),
      {
        text: "Convidar para passear",
        cond: () => !g.flags[hangoutKey] && !["senpai", "rival"].includes(npcId),
        effects: () => {
          g.flags[hangoutKey] = true;
          rel.friend = Math.min(100, rel.friend + 5);
          g.minutes += 12;
          return `Vocês passearam juntos (+5 amizade, 12 min)`;
        },
        next: "__HANGOUT__",
      },
      { text: "Ir embora", end: true },
    ],
  };
  this.openDialogueDyn(node, ctx);
};

GameUI.prototype.openDialogue = function (this: GameUI, startNode: string, ctx: DialogueCtx): void {
  this.renderNode(startNode, ctx);
};

/** Render a node from the DIALOGUES table or a dynamic node. */
GameUI.prototype.renderNode = function (this: GameUI, nodeId: string, ctx: DialogueCtx): void {
  const g = ctx.g;
  if (nodeId === "__END__" || nodeId === undefined) { this.closeDialogueDom(); ctx.onEnd(); return; }
  // dynamic pseudo-nodes
  if (nodeId.startsWith("__INFO__")) {
    const t = nodeId.slice(8);
    this.openDialogueDyn({
      speaker: ctx.npcId,
      text: INFO_TOPICS[t]?.desc ?? "…",
      choices: [{ text: "Entendi", end: true }],
    }, ctx);
    return;
  }
  if (nodeId === "__SMALLTALK__" || nodeId === "__HANGOUT__") {
    const def = ctx.npcDef;
    const persona = def ? SMALLTALK[def.look.personality] : SMALLTALK.gentle;
    const line = nodeId === "__HANGOUT__"
      ? "Claro! Um passeio cai bem agora. Obrigada por pensar em mim!"
      : persona.topics[Math.floor(Math.random() * persona.topics.length)];
    this.openDialogueDyn({ speaker: ctx.npcId, text: line, choices: [{ text: "(continuar)", end: true }] }, ctx);
    return;
  }
  if (nodeId === "__GIFT__") { this.closeDialogueDom(); ctx.onGift(ctx.npcId); return; }

  const node = DIALOGUES[nodeId];
  if (!node) { this.closeDialogueDom(); ctx.onEnd(); return; }
  this.openDialogueDyn(node, ctx, nodeId);
};

/** Core dialogue DOM runner. */
GameUI.prototype.openDialogueDyn = function (this: GameUI, node: import("./types").DialogNode, ctx: DialogueCtx, nodeId?: string): void {
  const g = ctx.g;
  this.onDialogueState(true);
  if (this.dialogueEl) this.dialogueEl.remove();
  const el = h("div", "dialogue");
  this.dialogueEl = el;
  this.root.append(el);
  el.innerHTML = "";
  el.classList.remove("hidden");

  const speakerName = node.speaker === ctx.npcId ? this.nameOf(node.speaker)
    : node.speaker === "senpai" ? g.senpaiName
    : node.speaker === "rival" ? "Wan Qing"
    : node.speaker === "rift" ? this.nameOf("s05")
    : node.speaker === "match" ? this.nameOf("s08")
    : node.speaker === "photo" ? this.nameOf("s19")
    : node.speaker === "rumor_boy" ? this.nameOf("s09")
    : this.nameOf(node.speaker);

  el.append(h("div", "dlg-speaker", speakerName));
  const textEl = h("div", "dlg-text", "");
  el.append(textEl);
  const choiceBox = h("div", "dlg-choices");
  el.append(choiceBox);

  let raw = typeof node.text === "function" ? node.text(g) : node.text;
  raw = raw.split("{senpai}").join(g.senpaiName).split("{heroName}").join(g.heroName);

  // typewriter
  if (this.typeTimer) clearInterval(this.typeTimer);
  let i = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
    textEl.textContent = raw;
    showChoices();
  };
  this.typeTimer = setInterval(() => {
    i += 2;
    textEl.textContent = raw.slice(0, i);
    if (i % 14 < 2) this.sfx("talk");
    if (i >= raw.length) finish();
  }, 18);
  el.addEventListener("click", finish);
  const keyHandler = (e: KeyboardEvent) => {
    if ((e.code === "Space" || e.code === "Enter" || e.code === "KeyE") && !done) { e.preventDefault(); finish(); }
  };
  window.addEventListener("keydown", keyHandler, { once: false });
  const cleanup = () => window.removeEventListener("keydown", keyHandler);

  const showChoices = () => {
    choiceBox.innerHTML = "";
    const choices = (node.choices ?? []).filter((c) => !c.cond || c.cond(g));
    if (choices.length === 0) {
      if (node.next) {
        const b = btn("▶", "btn dlg-next");
        b.addEventListener("click", () => { this.sfx("ui"); cleanup(); this.renderNode(node.next!, ctx); });
        choiceBox.append(b);
        const kh = (e: KeyboardEvent) => {
          if (e.code === "Space" || e.code === "Enter" || e.code === "KeyE") { e.preventDefault(); cleanup(); window.removeEventListener("keydown", kh); this.sfx("ui"); this.renderNode(node.next!, ctx); }
        };
        window.addEventListener("keydown", kh);
      } else {
        const b = btn("Encerrar", "btn dlg-next");
        b.addEventListener("click", () => { this.sfx("ui"); cleanup(); this.closeDialogueDom(); ctx.onEnd(); });
        choiceBox.append(b);
      }
      return;
    }
    for (const c of choices) {
      const b = btn(c.text, "btn dlg-choice");
      b.addEventListener("click", () => {
        cleanup();
        this.sfx("ui");
        const msg = c.effects?.(g);
        if (typeof msg === "string" && msg) this.toast(msg, "good");
        if (c.end) { this.closeDialogueDom(); ctx.onEnd(); }
        else if (c.next) this.renderNode(c.next, ctx);
        else { this.closeDialogueDom(); ctx.onEnd(); }
      });
      choiceBox.append(b);
    }
  };
};

/* ------------------------------------------------------------------ */
/* Gift picker                                                          */
/* ------------------------------------------------------------------ */

declare module "./ui" {
  interface GameUI {
    openGiftPicker(g: GameData, npcId: string, npcDef: StudentDef | undefined, onDone: () => void): void;
  }
}

GameUI.prototype.openGiftPicker = function (this: GameUI, g: GameData, npcId: string, npcDef: StudentDef | undefined, onDone: () => void): void {
  const items = (Object.keys(GIFTS) as GiftId[]).filter((k) => (g.inventory[k] ?? 0) > 0);
  if (!items.length) { this.toast("Você não tem presentes. Procure flores no jardim, doces na cozinha, livros na biblioteca…", "bad"); onDone(); return; }
  const rel = getRel(g, npcId);
  const node: import("./types").DialogNode = {
    speaker: npcId,
    text: `Escolha um presente para dar a ${this.nameOf(npcId)}.`,
    choices: [
      ...items.map((k) => ({
        text: `${GIFTS[k].icon} ${GIFTS[k].name} ×${g.inventory[k]}`,
        effects: () => {
          g.inventory[k] -= 1;
          const liked = npcDef?.likes.includes(k) ?? false;
          const alreadyToday = rel.lastGiftDay === g.day;
          let msg = "";
          if (npcId === "senpai") {
            const gain = alreadyToday ? 2 : liked ? 9 : 5;
            g.affinity = Math.min(100, g.affinity + gain);
            msg = liked ? `${g.senpaiName} ADOROU o presente! (♥ +${gain})` : `${g.senpaiName} aceitou com um sorriso. (♥ +${gain})`;
            if (liked && !alreadyToday) this.sfx("heart");
          } else {
            const gain = alreadyToday ? 2 : liked ? 10 : 4;
            rel.friend = Math.min(100, rel.friend + gain);
            msg = liked ? `Presente perfeito! ${this.nameOf(npcId)} ficou radiante (+${gain})` : `${this.nameOf(npcId)} agradeceu. (+${gain})`;
          }
          if (!alreadyToday) rel.lastGiftDay = g.day;
          this.sfx("gift");
          return msg;
        },
        next: `__GIFT_DONE__${k}`,
      })),
      { text: "Cancelar", end: true },
    ],
  };
  // custom render for gift follow-up line
  const self = this;
  this.openDialogueDyn(node, {
    g, npcId, npcDef,
    onEnd: onDone,
    onGift: () => onDone(),
  });
  // intercept __GIFT_DONE__ render via monkey patch of renderNode is complex; simpler: use info node
  const origRender = this.renderNode;
  this.renderNode = function (nid: string, c: DialogueCtx) {
    if (nid.startsWith("__GIFT_DONE__")) {
      const k = nid.slice(13) as GiftId;
      const liked = npcDef?.likes.includes(k) ?? false;
      const line = npcId === "senpai"
        ? (liked ? `"${k === "book" ? "Um livro de poemas… como você sabia? Este é o meu favorito." : "Nossa… é exatamente o que eu gosto. Você me conhece bem."}"` : `"Para mim? Obrigado, de verdade."`)
        : (liked ? `"Para MIM? Como você sabia que eu amo isso?! Obrigada!"` : `"Que gentil! Obrigada."`);
      self.openDialogueDyn({ speaker: npcId, text: line, choices: [{ text: "(continuar)", end: true }] }, c);
      return;
    }
    origRender.call(self, nid, c);
  };
  // restore after dialogue closes
  const origClose = this.closeDialogueDom;
  this.closeDialogueDom = function (this: GameUI) {
    self.renderNode = origRender;
    self.closeDialogueDom = origClose;
    origClose.call(self);
  };
};
