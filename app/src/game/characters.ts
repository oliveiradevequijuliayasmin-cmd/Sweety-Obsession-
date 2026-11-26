/**
 * characters.ts — procedural anime character factory.
 * Every character is built from primitives with a canvas-painted face texture
 * (eye shape/color, expression, blush, makeup), parametric hair (7 styles × length),
 * 3 uniform types, accessories, and fully procedural animation (walk/run/idle/sit/
 * talk/phone/gift + facial expressions + blinking).
 */
import * as THREE from "three";
import type { CharLook, Gender } from "./types";

export type AnimMode = "idle" | "walk" | "run" | "sit" | "talk" | "phone" | "gift";
export type Expression = "normal" | "happy" | "angry" | "sad" | "blush" | "shock";

export interface CharacterRig {
  root: THREE.Group;
  head: THREE.Group;
  hair: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  torso: THREE.Mesh;
  faceMat: THREE.MeshBasicMaterial;
  phoneMesh: THREE.Mesh;
  giftMesh: THREE.Mesh;
  anim: { mode: AnimMode; t: number; speed: number; blink: number; blinkT: number; expr: Expression };
}

/* ------------------------------------------------------------------ */
/* Face texture                                                        */
/* ------------------------------------------------------------------ */

function drawFace(look: CharLook, expr: Expression, closed: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  const skin = "#" + new THREE.Color(look.skin).getHexString();
  g.fillStyle = skin;
  g.fillRect(0, 0, 256, 256);

  const blushOn = look.makeup === "blush" || expr === "blush" || expr === "happy";
  if (blushOn) {
    g.fillStyle = "rgba(255,120,140,0.35)";
    g.beginPath(); g.ellipse(52, 168, 22, 12, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(204, 168, 22, 12, 0, 0, 7); g.fill();
  }
  if (look.makeup === "shadow") {
    g.fillStyle = "rgba(190,110,170,0.28)";
    g.beginPath(); g.ellipse(76, 122, 26, 14, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(180, 122, 26, 14, 0, 0, 7); g.fill();
  }

  const iris = "#" + new THREE.Color(look.eyeColor).getHexString();
  const eyeY = 128, eyeDX = 42, eyeW = look.eyeShape === "round" ? 30 : look.eyeShape === "almond" ? 36 : 32;
  const eyeH = look.eyeShape === "round" ? 38 : look.eyeShape === "sharp" ? 26 : look.eyeShape === "almond" ? 24 : 30;

  for (const side of [-1, 1]) {
    const ex = 128 + side * eyeDX;
    // white
    g.fillStyle = "#ffffff";
    g.beginPath();
    if (look.eyeShape === "sharp") g.ellipse(ex, eyeY, eyeW, eyeH, side * 0.15, 0, 7);
    else g.ellipse(ex, eyeY, eyeW * 0.62, eyeH * 0.62, 0, 0, 7);
    g.fill();
    if (!closed) {
      // iris
      const grad = g.createLinearGradient(ex, eyeY - 18, ex, eyeY + 18);
      grad.addColorStop(0, lighten(iris, 0.35));
      grad.addColorStop(1, iris);
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(ex, eyeY + 2, 13, 17, 0, 0, 7); g.fill();
      g.fillStyle = "#1a1a22";
      g.beginPath(); g.ellipse(ex, eyeY + 3, 6, 9, 0, 0, 7); g.fill();
      // highlights
      g.fillStyle = "#ffffff";
      g.beginPath(); g.arc(ex - 4, eyeY - 5, 4.5, 0, 7); g.fill();
      g.beginPath(); g.arc(ex + 5, eyeY + 8, 2.2, 0, 7); g.fill();
      // upper lid line
      g.strokeStyle = "#2a2030";
      g.lineWidth = 5;
      g.beginPath();
      if (look.eyeShape === "gentle") g.arc(ex, eyeY - 4, eyeW * 0.66, Math.PI * 1.15, Math.PI * 1.85);
      else if (look.eyeShape === "sharp") { g.moveTo(ex - eyeW * 0.62, eyeY + 6); g.quadraticCurveTo(ex, eyeY - eyeH * 0.9, ex + eyeW * 0.66, eyeY - 2); }
      else g.arc(ex, eyeY - 2, eyeW * 0.64, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      // lashes
      if (look.gender === "f") {
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(ex + side * eyeW * 0.6, eyeY - 6);
        g.lineTo(ex + side * (eyeW * 0.6 + 9), eyeY - 12);
        g.stroke();
      }
    } else {
      g.strokeStyle = "#2a2030";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(ex - eyeW * 0.55, eyeY);
      g.quadraticCurveTo(ex, eyeY + 10, ex + eyeW * 0.55, eyeY);
      g.stroke();
    }
    // brows
    g.strokeStyle = "#" + new THREE.Color(look.hairColor).getHexString();
    g.lineWidth = 6;
    g.beginPath();
    const browY = eyeY - 34;
    if (expr === "angry") {
      g.moveTo(ex - side * 16, browY + 10); g.lineTo(ex + side * 14, browY - 4);
    } else if (expr === "sad") {
      g.moveTo(ex - side * 14, browY - 4); g.lineTo(ex + side * 16, browY + 8);
    } else {
      g.moveTo(ex - 15, browY); g.quadraticCurveTo(ex, browY - 6, ex + 15, browY);
    }
    g.stroke();
  }

  // mouth
  g.strokeStyle = "#b3565f";
  g.fillStyle = "#b3565f";
  g.lineWidth = 4;
  const my = 196;
  if (expr === "happy" || expr === "blush") {
    g.beginPath(); g.arc(128, my - 4, 14, 0.15, Math.PI - 0.15); g.closePath(); g.fill();
  } else if (expr === "sad") {
    g.beginPath(); g.arc(128, my + 10, 12, Math.PI + 0.3, -0.3); g.stroke();
  } else if (expr === "angry") {
    g.beginPath(); g.moveTo(112, my); g.lineTo(144, my); g.stroke();
  } else if (expr === "shock") {
    g.beginPath(); g.ellipse(128, my, 7, 10, 0, 0, 7); g.stroke();
  } else {
    g.beginPath(); g.moveTo(116, my); g.quadraticCurveTo(128, my + 6, 140, my); g.stroke();
  }
  return c;
}

function lighten(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color("#ffffff"), amt);
  return "#" + c.getHexString();
}

/* ------------------------------------------------------------------ */
/* Body construction                                                   */
/* ------------------------------------------------------------------ */

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
  return matCache.get(key)!;
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, castShadow = false): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = castShadow;
  m.receiveShadow = false;
  return m;
}

export function buildCharacter(look: CharLook): CharacterRig {
  const root = new THREE.Group();
  const f = look.gender === "f";
  const hueAccent = new THREE.Color().setHSL(look.uniformHue, 0.55, 0.38).getHex();

  /* legs */
  const legGeo = new THREE.CapsuleGeometry(0.075, 0.5, 3, 8);
  const legMat = look.uniform === "sport"
    ? mat(new THREE.Color().setHSL(look.uniformHue, 0.35, 0.32).getHex())
    : mat(f ? 0xf3d9c4 : 0x2e3444);
  const sockMat = mat(look.sockColor);
  const shoeMat = mat(look.shoeColor, { roughness: 0.5 });

  const makeLeg = (): THREE.Group => {
    const leg = new THREE.Group();
    const thigh = mesh(legGeo, legMat);
    thigh.position.y = -0.3;
    leg.add(thigh);
    const sock = mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.28, 8), sockMat);
    sock.position.y = -0.62;
    leg.add(sock);
    const shoe = mesh(new THREE.SphereGeometry(0.1, 8, 6), shoeMat);
    shoe.scale.set(1, 0.7, 1.6);
    shoe.position.set(0, -0.78, 0.05);
    leg.add(shoe);
    return leg;
  };
  const legL = makeLeg(); legL.position.set(-0.11, 0.86, 0);
  const legR = makeLeg(); legR.position.set(0.11, 0.86, 0);
  root.add(legL, legR);

  /* torso */
  const torso = new THREE.Group();
  torso.position.y = 0.86;
  const torsoMesh = (() => {
    let m: THREE.Mesh;
    if (look.uniform === "sailor") {
      m = mesh(new THREE.CapsuleGeometry(0.19, 0.3, 4, 10), mat(0xf5f2ea), true);
      const collar = mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.12, 10, 1, true), mat(hueAccent));
      collar.position.y = 0.26;
      const skirt = mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.28, 10, 1, true), mat(hueAccent, { side: THREE.DoubleSide }), true);
      skirt.position.y = -0.3;
      const kerchief = mesh(new THREE.ConeGeometry(0.07, 0.12, 4), mat(0xd8455a));
      kerchief.position.set(0, 0.24, 0.17);
      kerchief.rotation.x = 0.5;
      const g2 = new THREE.Group();
      g2.add(m, collar, skirt, kerchief);
      return g2 as unknown as THREE.Mesh;
    } else if (look.uniform === "blazer") {
      m = mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 10), mat(new THREE.Color().setHSL(look.uniformHue, 0.3, 0.25).getHex()), true);
      const shirt = mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 8), mat(0xf5f2ea));
      shirt.position.set(0, 0.2, 0.08);
      const tie = mesh(new THREE.BoxGeometry(0.05, 0.2, 0.02), mat(0x8a2f3f));
      tie.position.set(0, 0.14, 0.2);
      const pants = mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.32, 8), mat(0x2e3444), true);
      pants.position.y = -0.32;
      const g2 = new THREE.Group();
      g2.add(m, shirt, tie, pants);
      return g2 as unknown as THREE.Mesh;
    } else {
      m = mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 10), mat(new THREE.Color().setHSL(look.uniformHue, 0.6, 0.5).getHex()), true);
      const stripe = mesh(new THREE.CylinderGeometry(0.205, 0.21, 0.08, 10), mat(0xf5f2ea));
      stripe.position.y = 0.1;
      const shorts = mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.24, 8), mat(new THREE.Color().setHSL(look.uniformHue, 0.55, 0.4).getHex()), true);
      shorts.position.y = -0.28;
      const g2 = new THREE.Group();
      g2.add(m, stripe, shorts);
      return g2 as unknown as THREE.Mesh;
    }
  })();
  torso.add(torsoMesh);
  root.add(torso);

  /* arms */
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.42, 3, 8);
  const sleeveMat = look.uniform === "sailor" ? mat(0xf5f2ea)
    : look.uniform === "blazer" ? mat(new THREE.Color().setHSL(look.uniformHue, 0.3, 0.25).getHex())
    : mat(new THREE.Color().setHSL(look.uniformHue, 0.6, 0.5).getHex());
  const skinMat = mat(look.skin);
  const makeArm = (): THREE.Group => {
    const arm = new THREE.Group();
    const sleeve = mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.2, 8), sleeveMat);
    sleeve.position.y = -0.08;
    const fore = mesh(armGeo, skinMat);
    fore.position.y = -0.34;
    const hand = mesh(new THREE.SphereGeometry(0.06, 8, 6), skinMat);
    hand.position.y = -0.58;
    arm.add(sleeve, fore, hand);
    return arm;
  };
  const armL = makeArm(); armL.position.set(-0.26, 1.32, 0);
  const armR = makeArm(); armR.position.set(0.26, 1.32, 0);
  root.add(armL, armR);

  /* head */
  const head = new THREE.Group();
  head.position.y = 1.52;
  const skull = mesh(new THREE.SphereGeometry(0.24, 18, 14), skinMat, true);
  skull.scale.set(0.95, 1.05, 0.95);
  head.add(skull);

  // face plane (single texture, drawn per expression)
  const faceCanvas = drawFace(look, "normal", false);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true });
  const face = mesh(new THREE.CircleGeometry(0.2, 20), faceMat);
  face.scale.set(1, 1.15, 1);
  face.position.set(0, 0.01, 0.205);
  head.add(face);

  /* hair */
  const hair = new THREE.Group();
  const hairMat = mat(look.hairColor, { roughness: 0.6 });
  const cap = mesh(new THREE.SphereGeometry(0.265, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat, true);
  cap.position.y = 0.035;
  cap.scale.set(1.02, 1.05, 1.05);
  hair.add(cap);
  // bangs: small boxes across the forehead
  const bangs = mesh(new THREE.BoxGeometry(0.34, 0.09, 0.06), hairMat);
  bangs.position.set(0, 0.16, 0.21);
  bangs.rotation.x = 0.25;
  hair.add(bangs);
  const len = look.hairLength;
  const addTail = (x: number, y: number, z: number, s: number, rz = 0): void => {
    const tail = mesh(new THREE.CapsuleGeometry(0.07 * s, 0.5 * len + 0.15, 3, 8), hairMat);
    tail.position.set(x, y, z);
    tail.rotation.z = rz;
    tail.rotation.x = 0.35;
    hair.add(tail);
  };
  switch (look.hairStyle) {
    case "short": {
      const back = mesh(new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.5), hairMat);
      back.position.y = 0.03; back.scale.set(1.02, 1, 1.02);
      hair.add(back);
      break;
    }
    case "bob": {
      const back = mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.3 + len * 0.2, 12, 1, true), hairMat, true);
      back.position.y = -0.05;
      back.scale.set(1, 1, 1.05);
      hair.add(back);
      break;
    }
    case "long": {
      const back = mesh(new THREE.BoxGeometry(0.42, 0.5 + len * 0.5, 0.14), hairMat, true);
      back.position.set(0, -0.18 - len * 0.22, -0.2);
      hair.add(back);
      const sideL = mesh(new THREE.BoxGeometry(0.09, 0.35 + len * 0.3, 0.1), hairMat);
      sideL.position.set(-0.22, -0.1 - len * 0.15, 0.05);
      const sideR = sideL.clone();
      sideR.position.x = 0.22;
      hair.add(sideL, sideR);
      break;
    }
    case "ponytail": {
      addTail(0, 0.1, -0.28, 1.15);
      const tie = mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 10), mat(0xd8455a));
      tie.position.set(0, 0.22, -0.24);
      hair.add(tie);
      break;
    }
    case "twintails": {
      addTail(-0.26, 0.05, -0.1, 1, 0.5);
      addTail(0.26, 0.05, -0.1, 1, -0.5);
      const t1 = mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0xd8455a));
      t1.position.set(-0.24, 0.2, -0.05);
      const t2 = t1.clone(); t2.position.x = 0.24;
      hair.add(t1, t2);
      break;
    }
    case "bun": {
      const bun = mesh(new THREE.SphereGeometry(0.11, 10, 8), hairMat);
      bun.position.set(0, 0.3, -0.12);
      hair.add(bun);
      break;
    }
    case "hime": {
      const sideL = mesh(new THREE.BoxGeometry(0.1, 0.55 + len * 0.35, 0.12), hairMat, true);
      sideL.position.set(-0.24, -0.15 - len * 0.15, 0.02);
      const sideR = sideL.clone();
      sideR.position.x = 0.24;
      const back = mesh(new THREE.BoxGeometry(0.44, 0.5 + len * 0.5, 0.14), hairMat, true);
      back.position.set(0, -0.2 - len * 0.22, -0.2);
      const fringe = mesh(new THREE.BoxGeometry(0.4, 0.12, 0.06), hairMat);
      fringe.position.set(0, 0.1, 0.22);
      hair.add(sideL, sideR, back, fringe);
      break;
    }
  }
  head.add(hair);

  /* accessories */
  switch (look.accessory) {
    case "glasses": {
      const gm = mat(0x333344, { roughness: 0.3, metalness: 0.5 });
      const r1 = mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 14), gm);
      r1.position.set(-0.09, 0.02, 0.215);
      const r2 = r1.clone(); r2.position.x = 0.09;
      const bridge = mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), gm);
      bridge.position.set(0, 0.03, 0.22);
      head.add(r1, r2, bridge);
      break;
    }
    case "ribbon": {
      const rm = mat(0xd8455a);
      const c1 = mesh(new THREE.ConeGeometry(0.06, 0.12, 4), rm);
      c1.rotation.z = Math.PI / 2; c1.position.set(-0.08, 0.3, 0);
      const c2 = c1.clone(); c2.rotation.z = -Math.PI / 2; c2.position.x = 0.08;
      const cc = mesh(new THREE.SphereGeometry(0.03, 6, 5), rm);
      cc.position.set(0, 0.3, 0);
      hair.add(c1, c2, cc);
      break;
    }
    case "clip": {
      const cm = mesh(new THREE.BoxGeometry(0.05, 0.015, 0.02), mat(0xf0c84a, { metalness: 0.6, roughness: 0.3 }));
      cm.position.set(0.15, 0.2, 0.16);
      cm.rotation.z = 0.4;
      hair.add(cm);
      break;
    }
    case "choker": {
      const ch = mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 14), mat(0x22222c));
      ch.rotation.x = Math.PI / 2;
      ch.position.y = -0.18;
      head.add(ch);
      break;
    }
    case "cap": {
      const pm = mat(hueAccent);
      const top = mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.1, 12), pm);
      top.position.y = 0.22;
      const brim = mesh(new THREE.BoxGeometry(0.24, 0.02, 0.18), pm);
      brim.position.set(0, 0.18, 0.26);
      hair.add(top, brim);
      break;
    }
    default: break;
  }

  root.add(head);

  /* held items (toggled by animation) */
  const phoneMesh = mesh(new THREE.BoxGeometry(0.07, 0.12, 0.015), mat(0x222833, { emissive: 0x3355aa, emissiveIntensity: 0.5 }));
  phoneMesh.position.set(0, -0.6, 0.08);
  phoneMesh.visible = false;
  armR.add(phoneMesh);
  const giftMesh = mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), mat(0xd86a8a));
  const giftRibbon = mesh(new THREE.BoxGeometry(0.17, 0.03, 0.17), mat(0xf5e08a));
  giftMesh.add(giftRibbon);
  giftMesh.position.set(0, -0.6, 0.15);
  giftMesh.visible = false;
  armL.add(giftMesh);

  const rig: CharacterRig = {
    root, head, hair, armL, armR, legL, legR,
    torso: torso as unknown as THREE.Mesh,
    faceMat, phoneMesh, giftMesh,
    anim: { mode: "idle", t: Math.random() * 10, speed: 0, blink: 0, blinkT: 2 + Math.random() * 3, expr: "normal" },
  };
  return rig;
}

export function setExpression(rig: CharacterRig, expr: Expression, look: CharLook): void {
  if (rig.anim.expr === expr) return;
  rig.anim.expr = expr;
  const c = drawFace(look, expr, false);
  rig.faceMat.map!.image = c;
  rig.faceMat.map!.needsUpdate = true;
}

/** Advance procedural animation. Called per frame for visible characters only. */
export function updateRig(rig: CharacterRig, dt: number, look: CharLook): void {
  const a = rig.anim;
  a.t += dt * (a.mode === "run" ? 1.6 : 1);
  const t = a.t;

  // blink
  a.blinkT -= dt;
  if (a.blinkT <= 0) {
    a.blink = 0.14;
    a.blinkT = 2.2 + Math.random() * 3.5;
    const closed = drawFace(look, a.expr, true);
    rig.faceMat.map!.image = closed;
    rig.faceMat.map!.needsUpdate = true;
  }
  if (a.blink > 0) {
    a.blink -= dt;
    if (a.blink <= 0) {
      const open = drawFace(look, a.expr, false);
      rig.faceMat.map!.image = open;
      rig.faceMat.map!.needsUpdate = true;
    }
  }

  const swing = a.mode === "run" ? 0.95 : a.mode === "walk" ? 0.55 : 0;
  const rate = a.mode === "run" ? 11 : a.mode === "walk" ? 7.5 : 1.6;

  if (a.mode === "sit") {
    rig.legL.rotation.x = -1.45; rig.legR.rotation.x = -1.45;
    rig.armL.rotation.x = -0.3; rig.armR.rotation.x = -0.3;
    rig.armL.rotation.z = 0.08; rig.armR.rotation.z = -0.08;
    rig.root.position.y += 0; // y handled by controller
    rig.head.rotation.x = Math.sin(t * 0.8) * 0.03;
  } else if (a.mode === "phone") {
    rig.armR.rotation.x = -2.15 + Math.sin(t * 1.2) * 0.04;
    rig.armR.rotation.z = -0.25;
    rig.armL.rotation.x = Math.sin(t * 1.6) * 0.06;
    rig.armL.rotation.z = 0.06;
    rig.legL.rotation.x = 0; rig.legR.rotation.x = 0;
    rig.head.rotation.x = 0.32;
    rig.phoneMesh.visible = true;
  } else if (a.mode === "gift") {
    rig.armL.rotation.x = -1.35; rig.armR.rotation.x = -1.35;
    rig.armL.rotation.z = 0.12; rig.armR.rotation.z = -0.12;
    rig.legL.rotation.x = 0; rig.legR.rotation.x = 0;
    rig.head.rotation.x = 0.12;
    rig.giftMesh.visible = true;
  } else if (a.mode === "talk") {
    rig.armL.rotation.x = Math.sin(t * 1.8) * 0.12 - 0.15;
    rig.armR.rotation.x = -0.35 + Math.sin(t * 2.1) * 0.18;
    rig.armR.rotation.z = -0.15 + Math.sin(t * 1.4) * 0.1;
    rig.armL.rotation.z = 0.1;
    rig.legL.rotation.x = 0; rig.legR.rotation.x = 0;
    rig.head.rotation.x = Math.sin(t * 2.4) * 0.05;
    rig.head.rotation.z = Math.sin(t * 1.1) * 0.04;
  } else {
    rig.phoneMesh.visible = false;
    rig.giftMesh.visible = false;
    rig.head.rotation.x = Math.sin(t * 0.9) * 0.025;
    rig.head.rotation.z = 0;
    rig.legL.rotation.x = Math.sin(t * rate) * swing;
    rig.legR.rotation.x = Math.sin(t * rate + Math.PI) * swing;
    const armSwing = swing * 0.75;
    rig.armL.rotation.x = Math.sin(t * rate + Math.PI) * armSwing + (swing === 0 ? Math.sin(t * 1.5) * 0.04 : 0);
    rig.armR.rotation.x = Math.sin(t * rate) * armSwing + (swing === 0 ? Math.sin(t * 1.5 + 1) * 0.04 : 0);
    rig.armL.rotation.z = 0.07; rig.armR.rotation.z = -0.07;
    // run lean + bob
    const lean = a.mode === "run" ? 0.22 : a.mode === "walk" ? 0.06 : 0;
    rig.torso.rotation.x = lean;
    rig.root.position.y += 0;
  }

  // breathing / bob applied by controller via root.position.y; here subtle torso scale
  const br = 1 + Math.sin(a.t * 2) * 0.008;
  rig.torso.scale.set(1, br, 1);
}
