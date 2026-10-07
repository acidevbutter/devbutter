/** Which scene a `<SceneCanvas>` renders. `scope` only exists as a 2D sketch. */
export type SceneKind = "attention" | "scope" | "neural";

/** Kinds that have a WebGL version (the rest go straight to the 2D engine). */
export type Scene3DKind = Exclude<SceneKind, "scope">;

/** Handle returned by both engines for one mounted canvas. */
export interface SceneApi {
  /** Stop (true) or resume (false) animating this canvas. The last frame stays on screen. */
  pause(b: boolean): void;
  /** Release everything this mount holds. Safe to call more than once. */
  destroy(): void;
}
