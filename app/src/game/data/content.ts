/**
 * data/content.ts — gifts, knowledge topics, dialogue trees, the 8 rival paths and the 11 endings.
 * All narrative content of SWEET OBSESSION lives here.
 */
import type { DialogNode, EndingId, GameData, GiftId, PathId, PersonalityId, QuestDef } from "../types";

/* ------------------------------------------------------------------ */
/* Gifts                                                               */
/* ------------------------------------------------------------------ */

export const GIFTS: Record<GiftId, { name: string; desc: string; icon: string }> = {
  flower: { name: "Flor do jardim", desc: "Uma flor fresca colhida no jardim da escola.", icon: "❀" },
  sweet: { name: "Doce artesanal", desc: "Um doce feito no clube de culinária.", icon: "◆" },
  book: { name: "Livro de poemas", desc: "Uma coletânea de poemas antiga e cheirosa.", icon: "▤" },
  accessory: { name: "Acessório", desc: "Um acessório delicado comprado na portaria.", icon: "◈" },
  drink: { name: "Chá gelado", desc: "Uma garrafa de chá gelado da máquina de vendas.", icon: "◉" },
  letter: { name: "Carta selada", desc: "Uma carta selada com cera vermelha. Alguém a espera.", icon: "✉" },
};

/* ------------------------------------------------------------------ */
/* Knowledge topics (phone → Estudantes → Perguntar)                   */
/* ------------------------------------------------------------------ */

export const INFO_TOPICS: Record<string, { name: string; desc: string; needFriend: number }> = {
  senpai_hobby_leitura: { name: "Hobby do Senpai: leitura", desc: "Ren passa todo almoço na biblioteca. Poesia antiga é seu ponto fraco.", needFriend: 20 },
  senpai_hobby_basquete: { name: "Hobby do Senpai: basquete", desc: "Ele joga na quadra depois das aulas. Nunca perde uma partida de 1x1 de graça.", needFriend: 20 },
  senpai_hobby_musica: { name: "Hobby do Senpai: violão", desc: "Ele compõe músicas sozinho na sala de música quando acha que ninguém ouve.", needFriend: 25 },
  senpai_gosto_doces: { name: "O Senpai tem fraqueza por doces", desc: "Doces caseiros derretem a guarda dele. Comprovado pelo clube de culinária.", needFriend: 15 },
  senpai_gosto_livros: { name: "Coleção de livros do Senpai", desc: "Ele coleciona edições antigas. Um bom livro vale mais que mil palavras.", needFriend: 15 },
  senpai_rotina: { name: "Rotina semanal do Senpai", desc: "Biblioteca no almoço, quadra no fim da tarde, violão às quartas. Previsível — e encantador.", needFriend: 30 },
  rival_horario: { name: "Agenda da Wan Qing", desc: "Conselho cedo, aulas, jardim ao fim da tarde. Sexta, 17h30: ela subiu ao telhado com uma carta.", needFriend: 30 },
  rival_gostos: { name: "Gostos da Wan Qing", desc: "Ama acessórios delicados e doces amargos. Odeia ser interrompida e odeia perder.", needFriend: 20 },
  rival_amiga: { name: "A amiga que ela perdeu", desc: "Mei Lin e Wan Qing eram inseparáveis no fundamental. Ninguém sabe por que brigaram.", needFriend: 25 },
  rival_secreto: { name: "O caderno escondido", desc: "Wan Qing escreve num caderno cor de vinho que nunca deixa ninguém ver. Perdeu um na biblioteca.", needFriend: 35 },
  rival_medos: { name: "Os medos dela", desc: "Ela tem pavor de decepcionar os pais e de ficar sozinha. A perfeição é uma armadura.", needFriend: 40 },
  match_crush: { name: "Coração em segredo", desc: "Han Jun guarda flores prensadas de quando tinham 10 anos. O poeta amou primeiro.", needFriend: 30 },
  cartas: { name: "As cartas antigas", desc: "Mei Lin ainda guarda as cartas que trocaram. A última não foi respondida.", needFriend: 20 },
  foto_origem: { name: "Quem espalhou os boatos", desc: "As postagens anônimas partiram de um perfil falso que Zhi Wei administra. Ele jurou que era brincadeira.", needFriend: 35 },
  rumor1: { name: "Postagem anônima #1", desc: "\"A princesa do conselho tem um segredo sujo.\" — postada terça à noite no mural.", needFriend: 10 },
  rumor2: { name: "Postagem anônima #2", desc: "\"Ela copiou no exame de matemática.\" — mentira grosseira, repetida quarta.", needFriend: 10 },
  rumor3: { name: "Postagem anônima #3", desc: "\"Ninguém seria amigo dela se soubessem.\" — a mais cruel. Postada quinta.", needFriend: 10 },
};

/* ------------------------------------------------------------------ */
/* Smalltalk by personality                                            */
/* ------------------------------------------------------------------ */

export const SMALLTALK: Record<PersonalityId, { greet: string[]; topics: string[] }> = {
  gentle: {
    greet: ["Ah, oi! Que bom te ver por aqui.", "Oi… espero não estar atrapalhando nada."],
    topics: [
      "Eu estava pensando em como o jardim fica bonito nessa época do ano.",
      "Você já leu o poema novo no mural da biblioteca? É lindo.",
      "Se precisar de ajuda com qualquer coisa, pode me chamar.",
    ],
  },
  cheerful: {
    greet: ["Ei ei ei! Adorei ver você!", "Opa! Hoje está um dia perfeito, não acha?"],
    topics: [
      "Você viu o que aconteceu no refeitório hoje? Hilário!",
      "Aposto que consigo fazer você rir em dez segundos.",
      "Vamos formar um grupo de estudos? Seria tão legal!",
    ],
  },
  shy: {
    greet: ["O-oi…", "Ah… olá. Desculpa, eu sou meio atrapalhada…"],
    topics: [
      "Eu… eu gosto de lugares quietos. Desculpa.",
      "Você não acha que os livros são bons ouvintes?",
      "Se você não se importa… eu prefiro conversar assim, devagar.",
    ],
  },
  serious: {
    greet: ["Olá. Tem algo que precisa?", "Sim? Seja breve, por favor."],
    topics: [
      "O horário é uma forma de respeito. Não ache que vou tolerar atrasos.",
      "Os estudos vêm primeiro. Sempre.",
      "Se for para conversar, que seja sobre algo produtivo.",
    ],
  },
  tsundere: {
    greet: ["Hmp! Não é como se eu estivesse esperando você ou algo assim.", "O-oi! Não olhe pra mim desse jeito!"],
    topics: [
      "Não pense que isso significa que gosto de sua companhia…",
      "Eu fiz cookies ontem. N-NÃO foi pensando em você!",
      "Você é… tolerável. Só isso!",
    ],
  },
  cool: {
    greet: ["Ei.", "…Olá."],
    topics: [
      "O vento está bom hoje. Bom para treinar.",
      "Não gosto de conversa fiada. Mas você é… diferente.",
      "A quadra está vazia agora. Melhor hora.",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Dialogue trees — ids are "tree:node"                                */
/* ------------------------------------------------------------------ */

export const DIALOGUES: Record<string, DialogNode> = {
  /* ------------ generic talk root (built dynamically; fallback) ------------ */
  "generic:bye": { speaker: "…", text: "Até mais!", },

  /* ------------ SENPAI ------------ */
  "senpai:root": {
    speaker: "senpai",
    text: (g) => g.flags.met_senpai
      ? "Ah, é você de novo. Fico feliz em te ver."
      : "Hm? Desculpa, a gente se conhece? …Ah, entendi. Prazer, {senpai}.",
    next: "senpai:menu",
  },
  "senpai:menu": {
    speaker: "senpai",
    text: "O que foi? Posso ajudar em algo?",
    choices: [
      { text: "Conversar", next: "senpai:chat" },
      { text: "Perguntar sobre os hobbies dele", cond: (g) => g.affinity >= 25, next: "senpai:hobbies" },
      { text: "Dar um presente", effects: () => undefined, next: "__GIFT__" },
      { text: "Flertar discretamente", cond: (g) => g.affinity >= 40, next: "senpai:flirt" },
      { text: "Ir embora", end: true },
    ],
  },
  "senpai:chat": {
    speaker: "senpai",
    text: (g) => {
      const day = g.day;
      const lines = [
        "Hoje li um poema sobre cerejeiras. Pensei no pátio daqui.",
        "Li Ming Hao me desafiou para 1x1 de novo. Ele nunca desiste.",
        "A biblioteca daqui tem uma seção antiga incrível. Já viu?",
        "Semana cheia… mas conversar com você relaxa, sabe?",
        "Você tem um jeito único de ver as coisas. Gosto disso.",
      ];
      return lines[Math.min(day, lines.length - 1)];
    },
    next: "senpai:chat2",
  },
  "senpai:chat2": {
    speaker: "senpai",
    text: "E você, como está sendo sua semana?",
    choices: [
      { text: "\"Melhor agora.\" (+afinidade)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 4); }, end: true },
      { text: "\"Complicada… mas estou bem.\" (+afinidade)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 3); }, end: true },
      { text: "\"Normal.\" ", effects: (g) => { g.affinity = Math.min(100, g.affinity + 1); }, end: true },
    ],
  },
  "senpai:hobbies": {
    speaker: "senpai",
    text: "Hobbies? Leio bastante… jogo basquete com o Ming Hao. E às vezes toco violão na sala de música. Não conta pra ninguém — é meu segredo.",
    choices: [
      { text: "\"Seu segredo está seguro comigo.\" (+afinidade)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 5); g.info.senpai_hobby_musica = true; }, end: true },
      { text: "\"Toca para mim um dia?\" (+afinidade)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 6); }, next: "senpai:violin" },
    ],
  },
  "senpai:violin": {
    speaker: "senpai",
    text: (g) => `Talvez… se você continuar aparecendo assim, ${g.heroName}. Talvez eu toque sim.`,
    next: "senpai:violin2",
  },
  "senpai:violin2": {
    speaker: "senpai",
    text: "Prometo pensar nisso. Sério.",
    choices: [{ text: "(sorrir)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 3); }, end: true }],
  },
  "senpai:flirt": {
    speaker: "senpai",
    text: (g) => {
      g.flags.flirted = true;
      return "…Você sempre diz coisas assim, ou estou sendo sortudo? Meu coração deu um passo em falso agora.";
    },
    choices: [
      { text: "\"Só com você.\" (+afinidade)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 6); }, end: true },
      { text: "\"Talvez você devesse descobrir.\" (+afinidade)", effects: (g) => { g.affinity = Math.min(100, g.affinity + 5); }, end: true },
    ],
  },

  /* ------------ RIVAL ------------ */
  "rival:root": {
    speaker: "rival",
    text: (g) => g.flags.met_rival
      ? "Você de novo. Escolha as palavras com cuidado desta vez."
      : "Hm? Desculpa, estou ocupada. …Ah, você é a aluna nova, certo? Sou Wan Qing. Prazer, suponho.",
    next: "rival:menu",
  },
  "rival:menu": {
    speaker: "rival",
    text: "Precisa de algo?",
    choices: [
      { text: "Conversar", next: "rival:chat" },
      { text: "Presentear", next: "__GIFT__" },
      { text: "Perguntar sobre ela", cond: (g) => (g.rel.rival?.friend ?? 0) >= 25, next: "rival:ask" },
      { text: "\"Quero ser sua amiga. De verdade.\"", cond: (g) => !g.rivalResolved && (g.rel.rival?.friend ?? 0) >= 40, next: "rival:friend1" },
      { text: "Devolver o caderno cor de vinho…", cond: (g) => !!g.flags.has_notebook && !g.rivalResolved, next: "rival:notebook1" },
      { text: "\"Mei Lin me pediu para entregar isto.\" (carta)", cond: (g) => !!g.flags.has_letter1 && !g.rivalResolved, next: "rival:letter1" },
      { text: "\"Alguém te admira há muito tempo…\"", cond: (g) => !!g.info.match_crush && !g.rivalResolved && !g.flags.match_rival, next: "rival:match1" },
      { text: "Sobre os boatos do mural…", cond: (g) => !!g.flags.rumor_confronted && !g.rivalResolved && !g.flags.truth_done, next: "rival:truth1" },
      { text: "Oferecer apoio sincero", cond: (g) => (g.flags.counsel_talks ?? 0) >= 3 && g.reputation >= 60 && !g.rivalResolved && !g.flags.counsel_done, next: "rival:counsel1" },
      { text: "Ir embora", end: true },
    ],
  },
  "rival:chat": {
    speaker: "rival",
    text: (g) => {
      const f = g.rel.rival?.friend ?? 0;
      if (f < 20) return "…Não tenho nada a dizer. Desculpa, foi mal-educada? Não foi. Foi honesta.";
      if (f < 50) return "Você é persistente, eu reconheço. Mas persistência não é confiança.";
      return "Sabe… você é a única pessoa que não tenta nada comigo. Só… fica. É estranho. Bom estranho.";
    },
    next: "rival:chat2",
  },
  "rival:chat2": {
    speaker: "rival",
    text: "E aí, o que me conta?",
    choices: [
      { text: "\"Só queria entender você.\" (+amizade)", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 5); }, end: true },
      { text: "\"O conselho deve ser cansativo.\" (+amizade)", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 4); }, end: true },
      { text: "\"Nada. Só passando.\" ", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 1); }, end: true },
    ],
  },
  "rival:ask": {
    speaker: "rival",
    text: "Perguntas? Sobre mim? …Está bem. Uma.",
    choices: [
      { text: "O que você mais quer? (precisa amizade 40)", cond: (g) => (g.rel.rival?.friend ?? 0) >= 40, next: "rival:ask_want" },
      { text: "Por que o Senpai? (precisa amizade 60)", cond: (g) => (g.rel.rival?.friend ?? 0) >= 60, next: "rival:ask_senpai" },
      { text: "Nada. Esquece.", end: true },
    ],
  },
  "rival:ask_want": {
    speaker: "rival",
    text: "…Que alguém olhe para mim e veja a Wan Qing, não a nota dez. Você é a primeira a perguntar isso.",
    choices: [{ text: "(ouvir em silêncio) (+amizade)", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 6); g.flags.counsel_talks = (g.flags.counsel_talks ?? 0) + 1; }, end: true }],
  },
  "rival:ask_senpai": {
    speaker: "rival",
    text: "Ele olha para as pessoas como se elas importassem. Quando meu mundo desabou no ano passado… ele foi o único que notou. Patético, não? Uma paixão construída em cima de um obrigada.",
    choices: [{ text: "\"Não é patético. Mas não é amor também.\" (+amizade)", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 8); g.flags.counsel_talks = (g.flags.counsel_talks ?? 0) + 1; }, end: true }],
  },
  /* path 1 — friendship */
  "rival:friend1": {
    speaker: "rival",
    text: "Minha amiga? Você sabe quem eu sou, certo? Wan Qing, a princesa de porcelana do conselho. A garota que vai atrás do Gu Ren como todo mundo sabe. E mesmo assim…",
    next: "rival:friend2",
  },
  "rival:friend2": {
    speaker: "rival",
    text: "…ninguém nunca me pediu isso. Todo mundo quer algo. Você quer o quê?",
    choices: [
      { text: "\"Nada. Só não quero que você se sinta sozinha.\"", next: "rival:friend3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); } },
      { text: "\"Quero que você desista dele.\" (-amizade)", next: "rival:friend_fail", effects: (g) => { g.rel.rival.friend = Math.max(0, (g.rel.rival.friend ?? 0) - 15); } },
    ],
  },
  "rival:friend3": {
    speaker: "rival",
    text: "Sozinha. É… essa palavra. Todo mundo acha que a Wan Qing tem tudo. Você olhou e viu uma garota sozinha num palco vazio.",
    next: "rival:friend4",
  },
  "rival:friend4": {
    speaker: "rival",
    text: "Está bem. Amigas, então. Mas se for mentira, eu descubro — e não perdoo duas vezes.",
    choices: [
      { text: "\"Não é mentira. Prometo.\"", effects: (g) => { g.flags.friend_done = true; g.rel.rival.friend = 100; }, next: "rival:friend_done" },
    ],
  },
  "rival:friend_done": {
    speaker: "rival",
    text: "…Sobre o Gu Ren. Você gosta dele, não gosta? Fica. Não precisa responder. Foi mal ser uma rival tão inconveniente — a partir de hoje, desisto. Que a melhor garota vença. E olha… acho que é você.",
    choices: [{ text: "(abraçá-la)", end: true }],
  },
  "rival:friend_fail": {
    speaker: "rival",
    text: "Então era isso. Todo mundo é igual. Some da minha frente.",
    choices: [{ text: "(ir embora)", end: true }],
  },
  /* path 3 — notebook */
  "rival:notebook1": {
    speaker: "rival",
    text: "Esse caderno… onde você achou?! Devolve. AGORA. …Desculpa. Por favor. Esse caderno não é seu.",
    next: "rival:notebook2",
  },
  "rival:notebook2": {
    speaker: "rival",
    text: "Você leu?",
    choices: [
      { text: "\"Li só uma página. Seus poemas são lindos.\" (+)", next: "rival:notebook3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 12); g.flags.has_notebook = false; } },
      { text: "\"Não li. É seu.\" (+)", next: "rival:notebook3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); g.flags.has_notebook = false; } },
      { text: "\"Talvez eu deva mostrar ao conselho.\" (-)", next: "rival:notebook_fail", effects: (g) => { g.reputation = Math.max(0, g.reputation - 10); g.rel.rival.friend = 0; } },
    ],
  },
  "rival:notebook3": {
    speaker: "rival",
    text: "…Ninguém nunca disse isso. Meus pais leem meus boletins, nunca meus poemas. Eu escrevo porque é o único lugar onde não preciso ser perfeita.",
    next: "rival:notebook4",
  },
  "rival:notebook4": {
    speaker: "rival",
    text: "Sabe o que é engraçado? Foi um poema que me fez gostar do Gu Ren — ele recitou um na aula de literatura no ano passado. Mas gostar dele virou… uma tarefa. Uma prova para vencer. E eu nem sei mais para quem estou estudando.",
    choices: [
      { text: "\"Talvez seja hora de escrever seu próprio final.\"", effects: (g) => { g.flags.notebook_done = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 15); }, next: "rival:notebook_done" },
    ],
  },
  "rival:notebook_done": {
    speaker: "rival",
    text: "Meu próprio final… Obrigada. Por devolver isto — e por não rir do que leu. A competição acabou. Ele é todo seu, se é isso que você quer. Eu vou ficar bem. Pela primeira vez, vou ficar bem.",
    choices: [{ text: "(devolver o caderno e sorrir)", end: true }],
  },
  "rival:notebook_fail": {
    speaker: "rival",
    text: "…Eu sabia. Eu SABIA que não podia confiar em ninguém. Saia. SAIA!",
    choices: [{ text: "(recuar)", end: true }],
  },
  /* path 5 — letters */
  "rival:letter1": {
    speaker: "rival",
    text: "Uma carta… dessa caligrafia só pode ser… da Mei Lin. Por que ela mandou VOCÊ? Ela nem olha na minha cara desde março.",
    next: "rival:letter2",
  },
  "rival:letter2": {
    speaker: "rival",
    text: "…\"Eu não devia ter dito que você se achava demais para mim. Eu só… senti sua falta, Wan. Todo dia.\"",
    next: "rival:letter3",
  },
  "rival:letter3": {
    speaker: "rival",
    text: "Ela sentiu minha falta. Eu escrevi treze cartas depois da briga. Treze. Queimei doze. A décima terceira está dentro do meu armário até hoje.",
    choices: [
      { text: "\"Escreva de volta. Eu levo.\"", next: "rival:letter4", effects: (g) => { g.flags.has_letter2 = true; g.flags.has_letter1 = false; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); } },
    ],
  },
  "rival:letter4": {
    speaker: "rival",
    text: "Você faria isso? …Está bem. Dê-me um minuto. Não olhe! …Pronto. E, ei. Obrigada. De verdade. Não sei por que está me ajudando, mas… obrigada.",
    choices: [{ text: "(pegar a resposta selada)", end: true }],
  },
  /* path 2 — matchmaking */
  "rival:match1": {
    speaker: "rival",
    text: "Admira? Quem… Não. Espera. Não me diga que é o Han Jun. Ele ainda…? A gente se conhece desde os dez anos. Ele me ensinou a assobiar num verão inteiro.",
    next: "rival:match2",
  },
  "rival:match2": {
    speaker: "rival",
    text: "Por que ele nunca disse nada? Sempre tive o Gu Ren na cabeça como um troféu. Mas o Han Jun… ele me viu antes de eu ser \"a Wan Qing\". Me viu de aparelho, chorando por um cachorro perdido.",
    choices: [
      { text: "\"Algumas histórias começam antes das finais.\"", next: "rival:match3", effects: (g) => { g.flags.match_rival = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 8); } },
      { text: "\"Ele guarda suas flores prensadas até hoje.\"", next: "rival:match3", effects: (g) => { g.flags.match_rival = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); } },
    ],
  },
  "rival:match3": {
    speaker: "rival",
    text: "…Me encontre com ele. Por favor. Se eu for sozinha, vou fugir — eu sempre fujo. A biblioteca, depois das aulas. Me prometa que ele vai estar lá.",
    choices: [{ text: "\"Vai dar tudo certo. Eu prometo.\"", end: true }],
  },
  /* path 6 — truth */
  "rival:truth1": {
    speaker: "rival",
    text: "Os boatos. Você sabe quem postou. Diga. E antes que minta: eu li cada palavra mil vezes. \"Segredo sujo\". \"Copiou no exame\". Meu pai quase me tirou da escola.",
    next: "rival:truth2",
  },
  "rival:truth2": {
    speaker: "rival",
    text: "Foi o Zhi Wei? O clube de fotografia? …Eu sabia que ele fotografava demais. E ainda assim a primeira coisa que fiz foi desconfiar de VOCÊ. Porque você fala com o Gu Ren. Como eu fui tão pequena?",
    choices: [
      { text: "\"Você estava machucada. Faz sentido.\"", next: "rival:truth3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); } },
      { text: "\"Desconfiar é humano. Perdoar também.\"", next: "rival:truth3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 8); } },
    ],
  },
  "rival:truth3": {
    speaker: "rival",
    text: "Eu passei a semana inteira competindo por um garoto que nem sabe meu poema favorito, enquanto destruíam meu nome no mural. E você — você poderia ter me destruído também. Em vez disso, trouxe a verdade.",
    next: "rival:truth4",
  },
  "rival:truth4": {
    speaker: "rival",
    text: "Desisto da competição. Não por pena — por lucidez. Obrigada… amiga. Acho que posso te chamar assim agora.",
    choices: [{ text: "(acenar, emocionada)", effects: (g) => { g.flags.truth_done = true; }, end: true }],
  },
  /* path 4 — counsel */
  "rival:counsel1": {
    speaker: "rival",
    text: "Você de novo. Você sempre aparece. Sabe o que é mais estranho? Você nunca pede nada. Nem quando a escola inteira sussurra seu nome você perde a calma. Como?",
    next: "rival:counsel2",
  },
  "rival:counsel2": {
    speaker: "rival",
    text: "Eu ensaiei a confissão para o Gu Ren umas quarenta vezes no espelho. Quarenta. E cada ensaio me deixava mais vazia. Ele merece alguém inteira. Eu nem sei mais onde estão minhas peças.",
    choices: [
      { text: "\"Você não precisa vencer ninguém para ser amada.\"", next: "rival:counsel3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 12); } },
      { text: "\"Desistir também é uma vitória, às vezes.\"", next: "rival:counsel3", effects: (g) => { g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); } },
    ],
  },
  "rival:counsel3": {
    speaker: "rival",
    text: "…Eu desisto. Não estou desistindo DELE — estou desistindo dessa versão de mim. A competição acabou. E sabe? O peito ficou leve pela primeira vez em um ano.",
    choices: [{ text: "\"Fico feliz por você.\" (+amizade)", effects: (g) => { g.flags.counsel_done = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 15); }, end: true }],
  },

  /* path 8 — distance sequence encounters */
  "distance:1": {
    speaker: "rival",
    text: "(Ela está no telhado, ensaiando sozinha.) \"…Ren, eu sempre admirei… não, patético. Desde que te conheci…\" — Quem está aí?!",
    choices: [
      { text: "\"Ninguém. Continue — estava bonito.\"", next: "distance:1b" },
      { text: "\"Desculpa! Eu não vi nada!\"", next: "distance:1c" },
    ],
  },
  "distance:1b": { speaker: "rival", text: "…Bonito. Você acha? Hmp. Vai embora antes que eu mude de ideia. Mas obrigada. Acho.", choices: [{ text: "(descer as escadas)", effects: (g) => { g.flags.d1 = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 6); }, end: true }] },
  "distance:1c": { speaker: "rival", text: "Volta aqui! …Muito bem, fuja. Todo mundo foge de mim no fim.", choices: [{ text: "(descer as escadas)", end: true }] },
  "distance:2": {
    speaker: "rival",
    text: "(Enfermaria. Ela segura uma compressa na testa.) Estou bem. Só… tontura. Fiquei sem almoçar de novo. Não olhe assim, eu disse que estou bem.",
    choices: [
      { text: "Ficar em silêncio ao lado dela.", next: "distance:2b" },
      { text: "Chamar a enfermeira.", next: "distance:2c" },
    ],
  },
  "distance:2b": { speaker: "rival", text: "…Você não foi embora. Todo mundo vai embora. Trinta minutos você ficou aí sem dizer nada. Foi… a coisa mais gentil que alguém fez por mim esse ano.", choices: [{ text: "(sorrir de leve)", effects: (g) => { g.flags.d2 = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 8); }, end: true }] },
  "distance:2c": { speaker: "rival", text: "Eu disse que estou— …Ah. Você se importa mesmo, não é? Desculpa. Sobre tudo.", choices: [{ text: "(acenar)", effects: (g) => { g.flags.d2 = true; }, end: true }] },
  "distance:3": {
    speaker: "rival",
    text: "(Ginásio vazio. Ela chuta uma bola contra a parede, uma e outra vez.) Se eu treinar o suficiente, talvez eu ganhe. É assim que funciona, não é? Treina, ganha. Não existe outro jeito.",
    choices: [
      { text: "\"Existe. Chama-se 'pedir ajuda'.\"", next: "distance:3b" },
      { text: "\"Para quem você quer ganhar?\"", next: "distance:3c" },
    ],
  },
  "distance:3b": { speaker: "rival", text: "Pedir ajuda… A última vez que pedi, a Mei Lin riu de mim. Ou eu achei que ela riu. Talvez eu nunca tenha pedido direito.", choices: [{ text: "\"Pode pedir de novo. Comigo.\"", effects: (g) => { g.flags.d3 = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 10); }, end: true }] },
  "distance:3c": { speaker: "rival", text: "Para meu pai. Para o conselho. Para… ninguém que me abraçaria se eu perdesse. Que pergunta horrível. …Que pergunta maravilhosa.", choices: [{ text: "(deixá-la pensar)", effects: (g) => { g.flags.d3 = true; g.rel.rival.friend = Math.min(100, (g.rel.rival.friend ?? 0) + 8); }, end: true }] },
  "distance:4": {
    speaker: "rival",
    text: "(Biblioteca, fim da tarde. Ela segura um folheto de intercâmbio.) Minha tia em Xangai me ofereceu uma vaga no programa de literatura. Eu inventei desculpas por um mês. Hoje eu percebi… não tenho NADA me segurando aqui. Nem ele. Nem ninguém.",
    choices: [
      { text: "\"Não é bem assim. Você tem uma amiga agora.\"", next: "distance:4b" },
      { text: "\"Vá. E escreva poemas de lá.\"", next: "distance:4c" },
    ],
  },
  "distance:4b": { speaker: "rival", text: "Uma amiga… Você. Uma garota que deveria me odiar. A vida é estranha. Talvez eu fique então. Pelo menos até o fim do ano. A competição, porém… acabou. Não vale nem seu poema.", choices: [{ text: "(rir juntas)", effects: (g) => { g.flags.d4 = true; g.flags.apart_peace = true; }, end: true }] },
  "distance:4c": { speaker: "rival", text: "Poemas de Xangai… Gostei. Vou dizer sim. E vou escrever para você, sabia? A única pessoa que me viu de verdade. Adeus, competição. Olá, vida.", choices: [{ text: "(despedir-se acenando)", effects: (g) => { g.flags.d4 = true; }, end: true }] },

  /* special NPCs */
  "rift:root": {
    speaker: "rift",
    text: (g) => g.flags.rift_met
      ? "Você de novo. Ainda carregando cartas pelos corredores?"
      : "Hm? Você é nova. Eu sou Mei Lin. Se veio fofocar sobre a Wan Qing, esquece. …Foi mal. Ousadia é meu defeito.",
    next: "rift:menu",
  },
  "rift:menu": {
    speaker: "rift",
    text: "Bom, fala. O que quer?",
    choices: [
      { text: "\"Por que vocês brigaram?\"", next: "rift:story" },
      { text: "\"Ela sente sua falta, sabe.\"", cond: (g) => (g.rel.rift?.friend ?? 0) >= 20, next: "rift:letter" },
      { text: "Nada. Só um oi.", end: true },
    ],
  },
  "rift:story": {
    speaker: "rift",
    text: "Ela mudou. No fundamental a gente dividia até o lanche. Aí ela entrou pro conselho, começou a correr atrás do Gu Ren… e um dia eu disse que ela \"se achava demais para mim\". Ela não negou. Eu fui embora antes dela terminar a frase.",
    choices: [{ text: "\"Talvez a frase inteira mudasse tudo.\"", next: "rift:story2", effects: (g) => { g.flags.rift_met = true; g.rel.rift.friend = Math.min(100, (g.rel.rift.friend ?? 0) + 6); } }],
  },
  "rift:story2": {
    speaker: "rift",
    text: "…Eu escrevi uma carta faz três semanas. Está no meu bolso desde então, amassada. E se ela rasgar na minha cara? …E se ela não rasgar?",
    choices: [
      { text: "\"Eu entrego para você.\"", next: "rift:give", cond: (g) => (g.rel.rift?.friend ?? 0) >= 25 },
      { text: "\"Guarde mais um pouco.\"", end: true },
    ],
  },
  "rift:give": {
    speaker: "rift",
    text: "Tá. Tá bom. Pega. E se ela chorar, você avisa que eu também chorei primeiro. Empate técnico.",
    choices: [{ text: "(receber a carta selada)", effects: (g) => { g.flags.has_letter1 = true; g.inventory.letter = (g.inventory.letter ?? 0) + 1; }, end: true }],
  },
  "rift:letter": {
    speaker: "rift",
    text: "Sentiu nada. Ela está ocupada demais sendo perfeita. …Desculpa. Falar nisso ainda dói mais do que eu finjo.",
    choices: [{ text: "\"Ela guarda suas cartas, Mei Lin. Todas.\"", next: "rift:letter2", cond: (g) => !!g.info.cartas || !!g.flags.rift_met, effects: (g) => { g.rel.rift.friend = Math.min(100, (g.rel.rift.friend ?? 0) + 8); } }],
  },
  "rift:letter2": {
    speaker: "rift",
    text: "…Todas? Até a última? Aquela que eu… ah. Você está com cara de quem sabe de algo. Está bem, espiã. O que ela disse?",
    choices: [
      { text: "\"Entregue a carta. O resto vem depois.\"", cond: (g) => !g.flags.has_letter1 && (g.rel.rift?.friend ?? 0) >= 25, next: "rift:give" },
      { text: "\"Ainda não sei. Mas vou descobrir.\"", end: true },
    ],
  },
  "rift:return": {
    speaker: "rift",
    text: "Ela respondeu?! Deixa eu ver— \"A décima terceira está no meu armário até hoje\"… Aquela carta. EU ESCREVI A DÉCIMA TERCEIRA! Eu nunca mandei. Estava com vergonha. E ela guardou a resposta…",
    next: "rift:return2",
  },
  "rift:return2": {
    speaker: "rift",
    text: "Jardim. Hoje, depois das aulas. Eu vou estar lá. E se ela não aparecer… bom, pelo menos eu tentei, né? Obrigada, mensageira.",
    choices: [{ text: "\"Ela vai aparecer. Tenho certeza.\"", effects: (g) => { g.flags.letters_done = true; g.inventory.letter = 0; }, end: true }],
  },
  "match:root": {
    speaker: "match",
    text: (g) => g.flags.match_han
      ? "V-você falou com ela? O que ela disse? Não, espera, não me conta — me conta sim. ME CONTA."
      : "Ah, oi. Sou Han Jun. Desculpa, eu estava lendo. …É sobre ela, não é? Sobre a Wan Qing. Todo mundo sempre é sobre ela.",
    next: "match:menu",
  },
  "match:menu": {
    speaker: "match",
    text: "O que houve?",
    choices: [
      { text: "\"Você ainda gosta dela.\" ", cond: (g) => (g.rel.match?.friend ?? 0) >= 20, next: "match:confess" },
      { text: "\"Nada. Só um oi.\"", end: true },
    ],
  },
  "match:confess": {
    speaker: "match",
    text: "…Desde os dez anos. Ela mudou de escola por um ano e eu guardei uma flor do jardim dela entre as páginas de um livro. A flor ainda está lá. Eu sou um poeta patético, eu sei.",
    choices: [{ text: "\"Ela vai se encontrar com você. Na biblioteca, hoje.\"", cond: (g) => !!g.flags.match_rival, next: "match:meet" },
      { text: "\"Talvez você deva contar a ela um dia.\"", effects: (g) => { g.flags.match_han = true; g.rel.match.friend = Math.min(100, (g.rel.match.friend ?? 0) + 10); }, end: true }],
  },
  "match:meet": {
    speaker: "match",
    text: "QUÊ. Hoje?! Eu— a minha camisa— certo. CERTO. Eu vou. Se eu travar, finjo que estou lendo. Obrigado. Obrigado! …Você é a pessoa mais boa dessa escola.",
    choices: [{ text: "(dar um tapinha no ombro)", effects: (g) => { g.flags.match_done = true; }, end: true }],
  },
  "photo:root": {
    speaker: "photo",
    text: "Oi! Viu o mural de fotos novo? Eu imprimi tudo na sala escura do clube. …Por que essa cara? Alguém postou coisas ruins, né. Eu vi. Todo mundo viu.",
    next: "photo:menu",
  },
  "photo:menu": {
    speaker: "photo",
    text: "Pode perguntar. Fotógrafos veem tudo.",
    choices: [
      { text: "\"Quem postou os boatos?\" (amizade 35+)", cond: (g) => (g.rel.photo?.friend ?? 0) >= 35 && !g.flags.rumor_confronted, next: "photo:reveal" },
      { text: "\"Só elogiar o mural.\"", end: true },
    ],
  },
  "photo:reveal": {
    speaker: "photo",
    text: "…Foi o Zhi Wei. O perfil \"@corvo_do_campus\" é dele, ele me mostrou achando engraçado. Eu devia ter contado antes. As fotos dele capturam tudo — menos consequências, aparentemente. Me promete que resolve isso sem violência? Essa escola já tem drama demais.",
    choices: [{ text: "\"Prometo. Só a verdade.\"", effects: (g) => { g.info.foto_origem = true; g.rel.photo.friend = Math.min(100, (g.rel.photo.friend ?? 0) + 10); }, end: true }],
  },
  "photo:confronted": {
    speaker: "photo",
    text: "Ele contou tudo para você? Bem feito. Ele apagou o perfil, sabe. E chorou no banheiro do clube. …Não fui eu quem vi. Foi a lente. A lente vê tudo.",
    choices: [{ text: "\"Agora é hora de consertar.\"", end: true }],
  },
  "rumor_boy:root": {
    speaker: "rumor_boy",
    text: (g) => g.flags.rumor_confronted
      ? "Você… contou para ela? Olha, eu apaguei tudo, juro. Era só para zoar. Eu não sabia que o pai dela quase a tirou da escola."
      : "Ei. Curte o mural do corvo? @corvo_do_campus posta as melhores fofocas. …Por que está me olhando assim?",
    next: "rumor_boy:menu",
  },
  "rumor_boy:menu": {
    speaker: "rumor_boy",
    text: "Que foi?",
    choices: [
      { text: "\"Eu sei que é você. Apaga tudo e confessa.\" (com prova)", cond: (g) => !!g.info.foto_origem && !g.flags.rumor_confronted, next: "rumor_boy:confront" },
      { text: "Nada.", end: true },
    ],
  },
  "rumor_boy:confront": {
    speaker: "rumor_boy",
    text: "Quem te contou— a Ya Ting, né. …Tá. Você quer a verdade? A verdade é que eu postei tudo. \"Segredo sujo\" era sobre o caderno dela que eu vi na biblioteca. \"Copiou no exame\" eu INVENTEI. Era só para ver se colava. Eu sou um idiota, você pode falar.",
    choices: [{ text: "\"Conte para a Wan Qing. Você deve isso.\"", next: "rumor_boy:confess" }],
  },
  "rumor_boy:confess": {
    speaker: "rumor_boy",
    text: "…Está bem. Eu conto. E apago o perfil. E se ela quiser que eu grite no microfone do ginásio que menti, eu grito. Desculpa. Diga a ela que eu… nem sei o que dizer. Só desculpa.",
    choices: [{ text: "\"Agora fale com ela. Hoje.\"", effects: (g) => { g.flags.rumor_confronted = true; }, end: true }],
  },
};

/* ------------------------------------------------------------------ */
/* The 8 rival paths                                                   */
/* ------------------------------------------------------------------ */

export const QUESTS: QuestDef[] = [
  {
    id: "friend", name: "Amizade Verdadeira", kind: "paz",
    steps: [
      { id: "f1", hint: "Faça amizade com Wan Qing: converse e presenteie-a (amizade 40+).", done: (g) => (g.rel.rival?.friend ?? 0) >= 40 },
      { id: "f2", hint: "Diga a ela que quer ser sua amiga de verdade.", done: (g) => !!g.flags.friend_done },
    ],
  },
  {
    id: "match", name: "Corações Alinhados", kind: "paz",
    steps: [
      { id: "m1", hint: "Descubra quem guarda um coração em segredo (fale com Han Jun, amizade 20+).", done: (g) => !!g.info.match_crush },
      { id: "m2", hint: "Sugira a Wan Qing que o passado pode ser o futuro (fale com ela).", done: (g) => !!g.flags.match_rival },
      { id: "m3", hint: "Leve a boa nova a Han Jun na biblioteca.", done: (g) => !!g.flags.match_done },
    ],
  },
  {
    id: "notebook", name: "O Caderno Perdido", kind: "paz",
    steps: [
      { id: "n1", hint: "Procure na biblioteca um caderno cor de vinho esquecido.", done: (g) => !!g.flags.has_notebook },
      { id: "n2", hint: "Devolva o caderno à Wan Qing com palavras gentis.", done: (g) => !!g.flags.notebook_done },
    ],
  },
  {
    id: "counsel", name: "Palavras que Curam", kind: "paz",
    steps: [
      { id: "c1", hint: "Alcance reputação 60+ na escola.", done: (g) => g.reputation >= 60 },
      { id: "c2", hint: "Converse com Wan Qing em momentos diferentes (3 conversas sinceras).", done: (g) => (g.flags.counsel_talks ?? 0) >= 3 },
      { id: "c3", hint: "Ofereça apoio sincero — escolha \"Oferecer apoio sincero\" ao falar com ela.", done: (g) => !!g.flags.counsel_done },
    ],
  },
  {
    id: "letters", name: "Ponte de Cartas", kind: "paz",
    steps: [
      { id: "l1", hint: "Fale com Mei Lin sobre a briga com Wan Qing.", done: (g) => !!g.flags.rift_met },
      { id: "l2", hint: "Ganhe a confiança de Mei Lin (amizade 25+) e aceite a carta.", done: (g) => !!g.flags.has_letter1 },
      { id: "l3", hint: "Entregue a carta à Wan Qing.", done: (g) => !!g.flags.has_letter2 },
      { id: "l4", hint: "Traga a resposta de volta a Mei Lin.", done: (g) => !!g.flags.letters_done },
    ],
  },
  {
    id: "truth", name: "Verdade Revelada", kind: "paz",
    steps: [
      { id: "t1", hint: "Descubra quem administra @corvo_do_campus (fale com Ya Ting, amizade 35+).", done: (g) => !!g.info.foto_origem },
      { id: "t2", hint: "Confronte Zhi Wei com a verdade.", done: (g) => !!g.flags.rumor_confronted },
      { id: "t3", hint: "Mostre a verdade à Wan Qing.", done: (g) => !!g.flags.truth_done },
    ],
  },
  {
    id: "rumor", name: "Eco Falso", kind: "suspense",
    steps: [
      { id: "r1", hint: "Encontre as 3 postagens anônimas no mural da sala de clubes.", done: (g) => (g.flags.rumor_posts ?? 0) >= 3 },
      { id: "r2", hint: "Leve as provas ao conselho estudantil — a caixa de denúncias está na sala do conselho.", done: (g) => !!g.flags.rumor_done },
    ],
  },
  {
    id: "distance", name: "Sequência do Afastamento", kind: "suspense",
    steps: [
      { id: "d1", hint: "Seg, 15h+: ela ensaia sozinha no telhado. Ouça sem julgar.", done: (g) => !!g.flags.d1 },
      { id: "d2", hint: "Ter, almoço: ela está na enfermaria. Fique ao lado dela.", done: (g) => !!g.flags.d2 },
      { id: "d3", hint: "Qua, 15h+: ela treina no ginásio. Faça a pergunta certa.", done: (g) => !!g.flags.d3 },
      { id: "d4", hint: "Qui, 16h40+: ela está na biblioteca com um folheto de intercâmbio. Coragem.", done: (g) => !!g.flags.d4 },
    ],
  },
];

/** Paths auto-activate when their first step becomes relevant. */
export function detectQuestStart(g: GameData, path: PathId): boolean {
  switch (path) {
    case "friend": return (g.rel.rival?.friend ?? 0) >= 15;
    case "match": return (g.rel.match?.friend ?? 0) >= 10 || !!g.info.match_crush;
    case "notebook": return g.day >= 0 && (g.rel.rival?.friend ?? 0) >= 10;
    case "counsel": return g.reputation >= 45;
    case "letters": return g.day >= 1 && (g.rel.rift?.friend ?? 0) >= 5;
    case "truth": return g.day >= 2;
    case "rumor": return g.day >= 2;
    case "distance": return g.day >= 0;
  }
}

/** Resolve completed paths: sets rivalResolved + messages + gallery unlocks. */
export const PATH_DONE_FLAG: Record<PathId, string> = {
  friend: "friend_done", match: "match_done", notebook: "notebook_done",
  counsel: "counsel_done", letters: "letters_done", truth: "truth_done",
  rumor: "rumor_done", distance: "d4",
};

/* ------------------------------------------------------------------ */
/* Endings                                                             */
/* ------------------------------------------------------------------ */

export const ENDINGS: Record<EndingId, { title: string; tone: "good" | "bad" | "secret"; text: (g: GameData) => string }> = {
  besties: {
    title: "Melhores Amigas", tone: "good",
    text: (g) => `Sexta-feira, 17h30, telhado. Gu Ren esperava com as mãos nos bolsos. "${g.heroName}… a Wan Qing me contou tudo. Você arrancou ela de um lugar escuro." O vento bagunçou seu cabelo. "E me arrancou também, do jeito que chegou. Quer tomar chá comigo amanhã? Só nós dois?" Atrás da porta, Wan Qing fez um joinha teatral. Ela nunca foi de perder — só mudou de jogo.`,
  },
  freeheart: {
    title: "Coração Livre", tone: "good",
    text: (g) => `A biblioteca ficou em silêncio quando Han Jun tropeçou numa pilha de livros bem na frente de Wan Qing. Ela riu — a primeira risada de verdade que a escola ouviu em um ano. No fim de semana, os dois mandaram para você um pacote com dois poemas e um brigadeiro. Na margem, a letra dele: "Obrigado por enxergar o que eu escondia há dez anos."`,
  },
  pages: {
    title: "Páginas Viradas", tone: "good",
    text: (g) => `Na sexta, Wan Qing subiu ao palco do festival de poesia em vez do telhado. Recitou um poema próprio chamado "A garota que devolveu meu caderno". O Gu Ren aplaudiu de pé, e pela primeira vez ela não olhou para ele — olhou para o horizonte. "Para quem me devolveu a voz", ela disse, e seus olhos encontraram você na plateia.`,
  },
  rivalry: {
    title: "Concorrência Encerrada", tone: "good",
    text: (g) => `Wan Qing entregou ao conselho uma carta de renúncia — não do conselho, da "competição". "Fui derrotada por gentileza", escreveu num bilhete para você, "e nunca perdi tão bem." Naquela sexta, o Gu Ren sentou-se ao seu lado no telhado sem que ninguém o convidasse. "A Wan Qing disse que devo isso a você. Obrigado por cuidar dela. E… de mim?"`,
  },
  bridge: {
    title: "Ponte de Cartas", tone: "good",
    text: (g) => `O jardim testemunhou o reencontro: duas garotas, treze cartas não-enviadas e uma décima terceira respondida. Mei Lin chorou primeiro, mas Wan Qing chorou mais alto. "A gente perdeu um ano", disse Mei Lin. "A gente ganhou o resto", respondeu Wan Qing. Elas decidiram, juntas, que nenhuma competia mais por ninguém.`,
  },
  revealed: {
    title: "Verdade Revelada", tone: "good",
    text: (g) => `Zhi Wei leu o pedido de desculpas no microfone do refeitório, voz trêmula. A escola ouviu em silêncio — e depois aplaudiu quando Wan Qing levantou e disse apenas: "Aceito o pedido. E não copiei no exame." O perfil do corvo virou nota de rodapé. O coração dela, finalmente, virou poesia de novo.`,
  },
  falsecho: {
    title: "Eco Falso", tone: "secret",
    text: (g) => `As provas chegaram ao conselho na quinta à noite. Na sexta, Wan Qing não apareceu — sua mãe a transferiu antes do sino. O mural ficou limpo, o corvo silenciado. Você venceu a competição, exatamente como planejou. Então por que o peito aperta quando o Gu Ren pergunta "onde ela está?"? Algumas vitórias ecoam vazias.`,
  },
  apart: {
    title: "A Distância", tone: "secret",
    text: (g) => `O avião de Wan Qing decolou num domingo claro. Ela deixou um caderno novo na sua mesa, com um poema em cada página da primeira semana. "Competir era mais fácil que partir", escreveu na dedicatória, "mas partir era mais honesto que fingir." O Gu Ren guardou uma foto da escola no bolso. Você guardou a carta dela no peito.`,
  },
  confession: {
    title: "A Confissão", tone: "bad",
    text: (g) => `Sexta, 17h30. Você chegou ao telhado um minuto atrasada. Wan Qing já estava lá, com a carta nas mãos tremendo, e o Gu Ren sorrindo aquele sorriso gentil que você quis tanto para si. Não havia mais o que fazer — a semana acabou, e com ela, sua chance. Algumas segundas-feiras não voltam.`,
  },
  outcast: {
    title: "Rejeitada", tone: "bad",
    text: (g) => `Sussurros seguem você pelos corredores como sombras com dentes. A reputação destruída não se conserta com desculpas. Ninguém senta perto, ninguém responde. No sábado, sua mãe assina a transferência. A escola Lianhua continua linda vista de fora do portão — de dentro, ninguém nunca mais a chama pelo nome.`,
  },
  alone: {
    title: "Sozinha, mas Inteira", tone: "secret",
    text: (g) => `Você resolveu tudo — a rival virou aliada, a semana foi vencida. Mas quando o Gu Ren estendeu a mão no telhado, percebeu que seus olhos já não buscavam mais os dele. Algumas obsessões são espelhos: quebram quando olhamos de verdade. "Vamos ser amigos", você disse. E, estranhamente, doeu pouco.`,
  },
};

/* ------------------------------------------------------------------ */
/* Calendar flavor for the phone                                       */
/* ------------------------------------------------------------------ */

export const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
export const PERIOD_NAMES: Record<string, [number, number, string]> = {
  chegada: [420, 480, "Chegada"],
  aula1: [480, 580, "Aulas 1–2"],
  int1: [580, 600, "Intervalo"],
  aula2: [600, 700, "Aulas 3–4"],
  almoco: [700, 780, "Almoço"],
  aula3: [780, 880, "Aulas 5–6"],
  int2: [880, 900, "Intervalo"],
  clubes: [900, 1000, "Clubes"],
  livre: [1000, 1050, "Tempo livre"],
  saida: [1050, 1080, "Saída"],
};

export function periodAt(minutes: number): string {
  for (const [id, [a, b]] of Object.entries(PERIOD_NAMES)) if (minutes >= a && minutes < b) return id;
  return minutes < 420 ? "chegada" : "saida";
}

export function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60), m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
