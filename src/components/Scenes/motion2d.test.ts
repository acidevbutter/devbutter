import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountMotion2D } from "./motion2d";

/** A 2D context that only records which drawing calls were made. */
function fakeContext() {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {
        calls.push(String(prop));
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

function fakeCanvas(ctx: CanvasRenderingContext2D) {
  return {
    width: 0,
    height: 0,
    parentElement: null,
    getContext: (type: string) => (type === "2d" ? ctx : null),
    getBoundingClientRect: () => ({ width: 520, height: 300 }),
  } as unknown as HTMLCanvasElement;
}

describe("mountMotion2D · distill (2D fallback of the c7 scene)", () => {
  const raf = vi.fn<(cb: FrameRequestCallback) => number>(() => 7);
  const caf = vi.fn();
  const win = {
    devicePixelRatio: 2,
    matchMedia: () => ({ matches: false }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("window", win);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("draws the flask, liquid, bubbles and a falling drop on the first frame", () => {
    const { ctx, calls } = fakeContext();
    const canvas = fakeCanvas(ctx);
    const api = mountMotion2D(canvas, "distill");

    // devicePixelRatio is capped at 1.5
    expect([canvas.width, canvas.height]).toEqual([780, 450]);
    expect(calls).toContain("clip");
    expect(calls).toContain("fillRect");
    // the pink glow at the spout plus at least one bubble below the surface
    expect(calls.filter((c) => c === "arc").length).toBeGreaterThan(1);
    expect(calls).toContain("ellipse");
    api.destroy();
  });

  it("animates while active, stops when paused and releases everything on destroy", () => {
    const { ctx, calls } = fakeContext();
    const api = mountMotion2D(fakeCanvas(ctx), "distill");
    expect(raf).toHaveBeenCalledTimes(1);

    const frame = raf.mock.calls[0][0];
    calls.length = 0;
    frame(1000);
    expect(calls).toContain("clearRect");

    api.pause(true);
    expect(caf).toHaveBeenCalled();
    api.pause(false);
    expect(raf).toHaveBeenCalledTimes(3);

    caf.mockClear();
    api.destroy();
    expect(caf).toHaveBeenCalled();
    expect(win.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    raf.mockClear();
    api.pause(false);
    api.destroy();
    expect(raf).not.toHaveBeenCalled();
  });
});
