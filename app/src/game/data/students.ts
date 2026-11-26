/**
 * data/students.ts — the 30 students of Lianhua High School (莲花中学).
 * Hero (customizable) + Senpai (customizable) + Rival + 27 unique students.
 * Every student has a distinct look (hair style/color/length, eyes, skin, uniform, accessory),
 * personality, club, preferences, friendships, gossip and an individual daily schedule.
 */
import type { CharLook, Gender, HairStyle, StudentDef, PeriodId, RoomId, GiftId, PersonalityId, EyeShape, UniformKind, Accessory } from "../types";

/* palette */
const SKINS = [0xffe3cf, 0xf5cfae, 0xe8b894];
const HAIR = [0x23232b, 0x3a2a20, 0x5d3a24, 0x7a4a2b, 0x2c3e57, 0x4a2c5a, 0x8b8f98, 0xd96a9e, 0x3f7d7a, 0xc7452f, 0xf0e6d8, 0x6b4226];
const EYES = [0x5a3a22, 0x2b2b33, 0x3a6ea5, 0x4a8a4f, 0xc98a2d, 0xb33a3a, 0x7a4a9e, 0xd9668f];
const SOCKS = [0xffffff, 0x23233a, 0x8a2f3f, 0x2f5d8a, 0x3a3a44];
const SHOES = [0x2b2b33, 0x6b4226, 0xd8d8e0, 0x8a2f3f, 0x3a5d8a];

function look(
  name: string, gender: Gender, hair: number, style: HairStyle, len: number,
  eye: number, eyeShape: EyeShape, skin: number, uniform: UniformKind, hue: number,
  acc: Accessory, personality: PersonalityId, makeup: CharLook["makeup"] = "none",
): CharLook {
  return {
    name, gender,
    skin: SKINS[skin], hairColor: HAIR[hair], hairStyle: style, hairLength: len,
    eyeColor: EYES[eye], eyeShape,
    uniform, uniformHue: hue,
    sockColor: SOCKS[(hair + eye) % SOCKS.length],
    shoeColor: SHOES[(hair + skin) % SHOES.length],
    accessory: acc, makeup, personality,
  };
}

/** Default daily schedule by home classroom + club. */
function sched(cls: string, club: string | null, clubRoom: RoomId, alt: Partial<Record<PeriodId, RoomId>> = {}): Partial<Record<PeriodId, RoomId>> {
  const classroom: RoomId = cls === "2-A" ? "sala2a" : cls === "2-B" ? "sala2b" : cls === "1-A" ? "sala1a" : "sala1b";
  const base: Partial<Record<PeriodId, RoomId>> = {
    chegada: "patio",
    aula1: classroom, aula2: classroom, aula3: classroom,
    int1: "patio", int2: "patio",
    almoco: "refeitorio",
    clubes: clubRoom,
    livre: "patio",
    saida: "rua",
  };
  return { ...base, ...alt };
}

function st(
  id: string, lk: CharLook, cls: string, role: StudentDef["role"], club: string | null,
  personality: string, likes: GiftId[], gossip: string[], friends: string[],
  schedule: Partial<Record<PeriodId, RoomId>>, seat: number,
): StudentDef {
  return { id, look: lk, cls, role, club, personality, likes, gossip, friends, schedule, seat };
}

/* ------------------------------------------------------------------ */
/* Senpai & Rival defaults (both fully re-customizable in the menu)    */
/* ------------------------------------------------------------------ */

export const DEFAULT_SENPAI_LOOK: CharLook = look(
  "Gu Ren", "m", 0, "short", 0.35, 0, "gentle", 0, "blazer", 0.6, "none", "gentle",
);
DEFAULT_SENPAI_LOOK.name = "Gu Ren";

export const DEFAULT_RIVAL_LOOK: CharLook = look(
  "Su Wan Qing", "f", 0, "hime", 0.95, 5, "almond", 0, "sailor", 0.95, "ribbon", "tsundere",
);

export const DEFAULT_HERO_LOOK: CharLook = look(
  "Tian Tian", "f", 3, "long", 0.8, 6, "round", 0, "sailor", 0.1, "clip", "gentle", "blush",
);

/* ------------------------------------------------------------------ */
/* 27 students                                                         */
/* ------------------------------------------------------------------ */

export const STUDENTS: StudentDef[] = [
  /* ---- girls (2-A) ---- */
  st("s01", look("Lin Xiao Mei", "f", 6, "bob", 0.45, 5, "round", 0, "sailor", 0.15, "none", "cheerful"),
    "2-A", "none", "Culinária", "Animada e tagarela, adora fofocas doces.",
    ["sweet", "drink"], ["rival_gostos", "senpai_gosto_doces"], ["rival", "s02"],
    sched("2-A", "Culinária", "cozinha", { clubes: "cozinha", int1: "jardim" }), 2),
  st("s02", look("Zhang Hui Ying", "f", 1, "long", 0.85, 0, "gentle", 1, "sailor", 0.2, "clip", "shy"),
    "2-A", "none", "Literatura", "Tímida, sempre com um livro de poemas escondido.",
    ["book", "flower"], ["rival_horario", "rival_secreto"], ["rival", "s01"],
    sched("2-A", "Literatura", "biblioteca", { int2: "biblioteca" }), 3),
  st("s03", look("Wang Shu Qing", "f", 0, "bun", 0.3, 1, "sharp", 0, "blazer", 0.5, "glasses", "serious"),
    "2-A", "none", "Conselho Estudantil", "Rigorosa, membro do conselho, não perdoa atrasos.",
    ["accessory", "book"], ["senpai_gosto_livros", "rival_horario"], ["s15", "rival"],
    sched("2-A", "Conselho Estudantil", "conselho", { chegada: "conselho" }), 4),
  st("s04", look("Chen Lu Yi", "f", 8, "ponytail", 0.7, 3, "sharp", 2, "sport", 0.4, "none", "cool"),
    "2-A", "none", "Esportes", "Capitã do time de basquete, direta e leal.",
    ["drink", "accessory"], ["senpai_hobby_basquete"], ["s17", "senpai"],
    sched("2-A", "Esportes", "quadra", { almoco: "quadra", livre: "quadra" }), 5),
  st("s05", look("Liu Mei Lin", "f", 4, "twintails", 0.6, 7, "tsundere" === "tsundere" ? "sharp" : "round", 0, "sailor", 0.55, "ribbon", "tsundere"),
    "2-A", "rift", "Música", "Ex-melhor amiga da rival. Orgulhosa, mas ainda guarda as cartas.",
    ["accessory", "sweet"], ["rival_amiga", "cartas"], ["s16", "rival"],
    sched("2-A", "Música", "musica", { clubes: "musica", livre: "musica" }), 6),
  st("s06", look("Zhao Qian", "f", 5, "long", 0.9, 2, "gentle", 1, "sailor", 0.35, "none", "gentle", "blush"),
    "2-A", "none", "Jardinagem", "Cuida do jardim da escola como se fosse um templo.",
    ["flower", "book"], ["rival_medos"], ["s14", "s23"],
    sched("2-A", "Jardinagem", "jardim", { int1: "jardim", int2: "jardim", almoco: "jardim" }), 7),

  /* ---- boys (2-A) ---- */
  st("s07", look("Li Ming Hao", "m", 2, "short", 0.4, 0, "round", 0, "sport", 0.05, "none", "cheerful"),
    "2-A", "none", "Esportes", "Sempre com uma bola na mão; amigo de infância do Senpai.",
    ["drink", "sweet"], ["senpai_hobby_basquete", "senpai_rotina"], ["senpai", "s04"],
    sched("2-A", "Esportes", "quadra", { int1: "quadra", livre: "quadra" }), 8),
  st("s08", look("Han Jun", "m", 1, "bob", 0.55, 2, "gentle", 1, "blazer", 0.7, "glasses", "gentle"),
    "2-A", "match", "Literatura", "Poeta silencioso. Conhece a rival desde a infância — e ainda a observa de longe.",
    ["book", "flower"], ["match_crush"], ["s02", "rival"],
    sched("2-A", "Literatura", "biblioteca", { almoco: "biblioteca", livre: "biblioteca" }), 9),
  st("s09", look("Yang Zhi Wei", "m", 0, "short", 0.3, 1, "sharp", 0, "blazer", 0.85, "cap", "cool"),
    "2-A", "none", "Fotografia", "Sempre com uma câmera pendurada no pescoço. Sabe de tudo que acontece na escola.",
    ["accessory", "drink"], ["senpai_rotina", "rumor2"], ["s21", "s10"],
    sched("2-A", "Fotografia", "sala_clubes", { int2: "patio", livre: "patio" }), 10),
  st("s10", look("Xu Jia Le", "m", 7, "short", 0.35, 4, "round", 2, "blazer", 0.3, "glasses", "shy"),
    "2-A", "none", "Ciência", "Gênio do laboratório; fala mais com béqueres do que com pessoas.",
    ["book", "sweet"], ["rival_secreto"], ["s09", "s18"],
    sched("2-A", "Ciência", "lab_ciencias", { int1: "lab_ciencias" }), 11),
  st("s11", look("Hu Peng", "m", 6, "short", 0.25, 3, "round", 1, "sport", 0.45, "none", "cheerful"),
    "2-A", "none", "Esportes", "Goleiro reserva, otimista até demais.",
    ["sweet", "drink"], ["senpai_hobby_basquete"], ["s07", "s26"],
    sched("2-A", "Esportes", "ginasio", { livre: "ginasio" }), 12),
  st("s12", look("Zhu Yi Fan", "m", 3, "short", 0.5, 1, "sharp", 0, "blazer", 0.1, "none", "serious"),
    "2-A", "none", "Conselho Estudantil", "Vice-presidente do conselho; anota tudo num caderninho preto.",
    ["book", "accessory"], ["senpai_gosto_doces", "rival_horario"], ["s03", "s15"],
    sched("2-A", "Conselho Estudantil", "conselho", { chegada: "conselho", aula1: "conselho" }), 13),
  st("s13", look("Qin Hao", "m", 10, "long", 0.75, 2, "sharp", 1, "blazer", 0.65, "choker", "cool"),
    "2-A", "none", "Música", "Guitarrista do clube de música; fala pouco, toca alto.",
    ["accessory", "drink"], ["senpai_hobby_musica"], ["s05", "s16"],
    sched("2-A", "Música", "musica", { clubes: "musica" }), 14),

  /* ---- girls (2-B) ---- */
  st("s14", look("Gao Ting Ting", "f", 9, "bob", 0.5, 4, "round", 0, "sailor", 0.05, "none", "cheerful"),
    "2-B", "none", "Teatro", "A atriz principal de toda peça da escola; dramática no palco e fora dele.",
    ["sweet", "flower"], ["rival_gostos"], ["s06", "s27"],
    sched("2-B", "Teatro", "sala_clubes", { int2: "sala_clubes" }), 2),
  st("s15", look("Luo Qing Qing", "f", 1, "hime", 0.8, 1, "almond", 2, "sailor", 0.75, "none", "serious"),
    "2-B", "none", "Conselho Estudantil", "Secretária do conselho; organizada a ponto de assustar.",
    ["accessory", "book"], ["rival_horario"], ["s03", "s12"],
    sched("2-B", "Conselho Estudantil", "conselho", { chegada: "conselho" }), 3),
  st("s16", look("Guo Xiao Tong", "f", 7, "ponytail", 0.65, 6, "gentle", 1, "sailor", 0.45, "clip", "shy"),
    "2-B", "none", "Música", "Violinista; toca perto da janela para ninguém ouvir errando.",
    ["book", "flower"], ["rival_amiga"], ["s05", "s13"],
    sched("2-B", "Música", "musica", { int1: "musica" }), 4),
  st("s17", look("He Ya Nan", "f", 2, "short", 0.3, 3, "sharp", 2, "sport", 0.5, "none", "cool"),
    "2-B", "none", "Esportes", "Veloz, sarcástica, fiel às amigas.",
    ["drink", "accessory"], ["senpai_hobby_basquete"], ["s04", "s25"],
    sched("2-B", "Esportes", "quadra", { int1: "quadra", almoco: "quadra" }), 5),
  st("s18", look("Deng Li Na", "f", 3, "long", 0.95, 0, "gentle", 0, "sailor", 0.25, "none", "gentle", "blush"),
    "2-B", "none", "Jardinagem", "Desenha flores no verso dos cadernos.",
    ["flower", "sweet"], ["rival_medos", "rival_gostos"], ["s06", "s23"],
    sched("2-B", "Jardinagem", "jardim", { int1: "jardim", int2: "jardim" }), 6),
  st("s19", look("Sun Ya Ting", "f", 10, "bun", 0.4, 2, "round", 1, "blazer", 0.6, "none", "cheerful"),
    "2-B", "photo", "Fotografia", "Presidente do clube de fotografia; o mural de fotos é território dela.",
    ["accessory", "sweet"], ["foto_origem", "rumor1", "rival_gostos"], ["s09", "s21"],
    sched("2-B", "Fotografia", "sala_clubes", { int2: "sala_clubes", livre: "sala_clubes" }), 7),

  /* ---- boys (2-B) ---- */
  st("s20", look("Tang Zi Han", "m", 4, "short", 0.45, 0, "gentle", 1, "blazer", 0.4, "none", "gentle"),
    "2-B", "none", "Teatro", "Escreve as peças que a Gao Ting Ting estrela.",
    ["book", "flower"], ["senpai_hobby_musica"], ["s14", "s27"],
    sched("2-B", "Teatro", "sala_clubes", { livre: "sala_clubes" }), 8),
  st("s21", look("Dong Xin", "m", 8, "short", 0.3, 5, "round", 2, "blazer", 0.15, "glasses", "shy"),
    "2-B", "none", "Arte", "Pinta telas grandes demais para o ateliê.",
    ["book", "sweet"], ["rival_medos", "rumor3"], ["s19", "s23"],
    sched("2-B", "Arte", "artes", { int1: "artes", int2: "artes" }), 9),
  st("s22", look("Feng Jie", "m", 0, "bun" as HairStyle, 0.2, 1, "sharp", 0, "sport", 0.2, "none", "serious"),
    "2-B", "none", "Esportes", "Levantamento de peso silencioso. Respeita horários.",
    ["drink", "sweet"], ["senpai_rotina"], ["s11", "s26"],
    sched("2-B", "Esportes", "ginasio", { clubes: "ginasio" }), 10),
  st("s23", look("Cao Jun", "m", 5, "bob", 0.5, 4, "round", 1, "sport", 0.8, "cap", "cheerful"),
    "2-B", "none", "Culinária", "Chef mirim; testa receitas novas no refeitório.",
    ["sweet", "drink"], ["senpai_gosto_doces"], ["s01", "s18"],
    sched("2-B", "Culinária", "cozinha", { almoco: "cozinha", clubes: "cozinha" }), 11),
  st("s24", look("Yuan Bo", "m", 2, "short", 0.35, 3, "sharp", 2, "sport", 0.35, "none", "cool"),
    "2-B", "none", "Esportes", "Pivô do time; rival amigável de Li Ming Hao.",
    ["drink", "accessory"], ["senpai_hobby_basquete", "senpai_rotina"], ["s07", "s17"],
    sched("2-B", "Esportes", "quadra", { livre: "quadra" }), 12),
  st("s25", look("Xu Ruo Xi", "m", 6, "long", 0.7, 6, "gentle", 0, "blazer", 0.9, "choker", "shy"),
    "2-B", "none", "Literatura", "Declama poesia de memória quando está nervoso.",
    ["book", "flower"], ["rival_secreto"], ["s16", "s08"],
    sched("2-B", "Literatura", "biblioteca", { almoco: "biblioteca" }), 13),
  st("s26", look("Zhou Xin Yi", "m", 7, "short", 0.4, 7, "round", 1, "sailor", 0.3, "clip", "cheerful", "blush"),
    "2-B", "none", "Arte", "Garota animada do clube de arte; transforma qualquer parede em mural.",
    ["flower", "sweet"], ["rumor3", "rival_gostos"], ["s21", "s14"],
    sched("2-B", "Arte", "artes", { int2: "artes" }), 14),

  /* ---- 1st years (1-A / 1-B) ---- */
  st("s27", look("Zhou An", "f", 11, "twintails", 0.55, 4, "round", 2, "sailor", 0.65, "ribbon", "cheerful"),
    "1-A", "none", "Teatro", "Caloura entusiasmada que idolatra a Gao Ting Ting.",
    ["sweet", "flower"], ["rival_gostos"], ["s14", "s20"],
    sched("1-A", "Teatro", "sala_clubes", { livre: "sala_clubes" }), 2),
  st("s28", look("Qian Duo Duo", "f", 2, "bob", 0.42, 5, "almond", 1, "sailor", 0.5, "none", "shy"),
    "1-A", "none", "Literatura", "Primeira a chegar na biblioteca todo dia.",
    ["book", "sweet"], ["senpai_gosto_livros"], ["s02", "s25"],
    sched("1-A", "Literatura", "biblioteca", { chegada: "biblioteca" }), 3),
  st("s29", look("Bai Xiao", "m", 10, "short", 0.28, 2, "gentle", 0, "blazer", 0.55, "none", "gentle"),
    "1-A", "none", "Jardinagem", "Rega as plantas do pátio antes do sino da manhã.",
    ["flower", "book"], ["rival_medos"], ["s06", "s18"],
    sched("1-A", "Jardinagem", "jardim", { chegada: "jardim", int1: "jardim" }), 4),
];

export const SENPAI_DEF: StudentDef = st(
  "senpai", DEFAULT_SENPAI_LOOK, "3-A", "senpai", "Literatura",
  "Gentil e reservado. Ama livros, basquete nas horas vagas e violão à noite.",
  ["book", "drink"], [], ["s07", "s04", "s08"],
  {
    chegada: "biblioteca",
    aula1: "sala2b", aula2: "sala2b", aula3: "sala2b", // monitors sit in on 2-B classes
    int1: "patio", int2: "quadra",
    almoco: "biblioteca",
    clubes: "biblioteca", livre: "quadra", saida: "rua",
  },
  18,
);

export const RIVAL_DEF: StudentDef = st(
  "rival", DEFAULT_RIVAL_LOOK, "2-A", "rival", "Conselho Estudantil",
  "Doce, impecável, perfeccionista. Ninguém desconfia do que ela esconde.",
  ["accessory", "sweet"],
  [],
  ["s01", "s02", "s03"],
  {
    chegada: "conselho",
    aula1: "sala2a", aula2: "sala2a", aula3: "sala2a",
    int1: "patio", int2: "conselho",
    almoco: "refeitorio",
    clubes: "conselho", livre: "jardim", saida: "rua",
  },
  1,
);

export const ALL_NPCS: StudentDef[] = [...STUDENTS, SENPAI_DEF, RIVAL_DEF];
