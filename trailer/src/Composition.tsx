import { useLayoutEffect, useRef } from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
// @ts-expect-error module JavaScript du jeu (sans types)
import { drawShot, drawBackdrop } from "./sim.js";

// Bande-annonce de Dernier Bastion (36,5 s, 1920 × 1080, 30 images/s).
// Les plans de combat sont rendus par le vrai moteur du jeu (voir sim.js).

const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
const FONT = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const ORANGE = "#e8a04a";
const DARK = "#1d130c";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Découpage (en secondes)
const T = { intro: 0, defense: 4, title: 11, push: 14.5, nest: 22.5, end: 30.5, total: 36.5 };

// ---------- Plan de jeu ----------
const GameShot: React.FC<{ shot: string }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (ref.current) drawShot(shot, frame, fps, ref.current);
  }, [shot, frame, fps]);
  return <canvas ref={ref} width={1920} height={1080} style={{ width: "100%", height: "100%" }} />;
};

const Backdrop: React.FC<{ level: number }> = ({ level }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (ref.current) drawBackdrop(level, 20 + frame / FPS, ref.current);
  }, [level, frame]);
  return <canvas ref={ref} width={1920} height={1080} style={{ width: "100%", height: "100%" }} />;
};

// ---------- Textes ----------
// Texte qui apparaît puis disparaît en fondu (from / to en images, dans la séquence)
const Caption: React.FC<{ text: string; from: number; to: number; size?: number; y?: string }> = ({
  text, from, to, size = 64, y = "50%",
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: y, textAlign: "center",
        fontFamily: FONT, fontWeight: 800, fontSize: size, color: "#f3e3c3", letterSpacing: 1,
        textShadow: `0 4px 0 ${DARK}, 0 0 24px rgba(0,0,0,0.8)`,
        opacity: interpolate(frame, [from, from + 12, to - 12, to], [0, 1, 1, 0], clamp),
        translate: interpolate(frame, [from, from + 18], ["0px 24px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      }}
    >
      {text}
    </div>
  );
};

// Gros titre façon écran titre du jeu (orange cerné de sombre)
const BigTitle: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      fontFamily: FONT, fontWeight: 900, fontSize: size, color: ORANGE, letterSpacing: 2,
      WebkitTextStroke: `${size / 16}px ${DARK}`, paintOrder: "stroke fill",
      textShadow: "0 0 40px rgba(255,140,60,0.35)",
    }}
  >
    DERNIER BASTION
  </div>
);

// ---------- Scènes ----------
const Intro: React.FC = () => (
  <AbsoluteFill>
    <Backdrop level={10} />
    <AbsoluteFill style={{ backgroundColor: "rgba(10,4,4,0.55)" }} />
    <Caption text="Le monde est tombé." from={8} to={s(2.1)} size={72} y="42%" />
    <Caption text="Les mutants sortent du Nid." from={s(2.1)} to={s(4)} size={72} y="42%" />
  </AbsoluteFill>
);

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = frame < 12 ? (12 - frame) * 1.4 : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: interpolate(frame, [0, 6, s(3.1), s(3.5)], [0, 0.6, 0.6, 0], clamp) }} />
      <AbsoluteFill style={{ backgroundColor: "#fff3d0", opacity: interpolate(frame, [0, 2, 10], [0, 0.85, 0], clamp) }} />
      <div
        style={{
          scale: interpolate(frame, [0, 10], [1.9, 1], { ...clamp, easing: Easing.bezier(0.2, 1.4, 0.4, 1), output: "perceptual-scale" }),
          translate: `${Math.sin(frame * 3.1) * shake}px ${Math.cos(frame * 2.3) * shake}px`,
          opacity: interpolate(frame, [0, 3, s(3.1), s(3.5)], [0, 1, 1, 0], clamp),
          textAlign: "center",
        }}
      >
        <BigTitle size={190} />
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 52, color: "#f3e3c3", marginTop: 6,
          textShadow: `0 3px 0 ${DARK}`,
          opacity: interpolate(frame, [12, 24], [0, 1], clamp) }}>
          Survivants contre Mutants
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const line = (i: number) => interpolate(frame, [20 + i * 10, 34 + i * 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill><Backdrop level={99} /></AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(8,4,6,0.6)" }} />
      <div style={{ textAlign: "center", opacity: interpolate(frame, [0, 14, s(5.5), s(6)], [0, 1, 1, 0], clamp),
        scale: interpolate(frame, [0, s(6)], [1.04, 1], clamp) }}>
        <BigTitle size={150} />
        {["30 niveaux · 3 commandants · mode Survie", "Jouable gratuitement sur PC et téléphone"].map((t, i) => (
          <div key={t} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 46, color: "#f3e3c3", marginTop: i ? 10 : 26,
            textShadow: `0 3px 0 ${DARK}`, opacity: line(i) }}>{t}</div>
        ))}
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: "#f2c230", marginTop: 34, opacity: line(2) }}>
          mehdinourreddine62.github.io/Dernier-bastion-
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: "#a89a88", marginTop: 14, opacity: line(3) }}>
          Bêta 0.26
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Fondu au noir autour d'une coupe (centre = image de la coupe)
const Dip: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "black", pointerEvents: "none",
      opacity: interpolate(frame, [at - 7, at, at + 7], [0, 1, 0], clamp) }} />
  );
};

export const Trailer: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <Audio src={staticFile("music.mp3")} />
    <Sequence from={s(T.intro)} durationInFrames={s(T.defense - T.intro)}><Intro /></Sequence>
    <Sequence from={s(T.defense)} durationInFrames={s(T.push - T.defense)}><GameShot shot="defense" /></Sequence>
    <Sequence from={s(T.defense) + 20} durationInFrames={s(T.title - T.defense) - 30}>
      <Caption text="Ils arrivent par milliers." from={0} to={s(T.title - T.defense) - 30} size={60} y="12%" />
    </Sequence>
    <Sequence from={s(T.title)} durationInFrames={s(T.push - T.title)}><TitleCard /></Sequence>
    <Sequence from={s(T.push)} durationInFrames={s(T.nest - T.push)}>
      <GameShot shot="push" />
      <Caption text="Recrute ton armée." from={10} to={s(3.8)} size={60} y="12%" />
      <Caption text="Contre-attaque." from={s(4.2)} to={s(7.8)} size={60} y="12%" />
    </Sequence>
    <Sequence from={s(T.nest)} durationInFrames={s(T.end - T.nest)}>
      <GameShot shot="nest" />
      <Caption text="Détruis le Nid." from={10} to={s(4)} size={64} y="12%" />
      <Caption text="Le Nid est tombé." from={s(6.1)} to={s(8)} size={64} y="12%" />
    </Sequence>
    <Sequence from={s(T.end)} durationInFrames={s(T.total - T.end)}><EndCard /></Sequence>
    {[T.defense, T.push, T.nest, T.end].map((t) => <Dip key={t} at={s(t)} />)}
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition
    id="BandeAnnonce"
    component={Trailer}
    durationInFrames={s(T.total)}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
