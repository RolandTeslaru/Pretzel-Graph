import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  // Keep the colour fully saturated and let alpha alone carry the wave shape.
  // (The original intensity * rampColor darkens the colour, which looks muddy
  //  on light backgrounds.) Premultiplied so it stays consistent with the
  //  ONE / ONE_MINUS_SRC_ALPHA blend func.
  fragColor = vec4(rampColor * auroraAlpha, auroraAlpha);
}
`;

export interface AuroraProps {
  colorStops?: [string, string, string];
  amplitude?: number;
  blend?: number;
  speed?: number;
  time?: number;
}

export interface AuroraCtx {
  /** The persistent WebGL canvas — reattach this on every mount. */
  readonly canvas: HTMLCanvasElement;
  /** Append the canvas to `container`, size it, and start the render loop. */
  mount: (container: HTMLElement) => void;
  /** Detach the canvas and pause the render loop. Keeps WebGL resources alive. */
  unmount: () => void;
  /** Update animation props live (color stops, amplitude, blend, speed). */
  setProps: (props: AuroraProps) => void;
  /** Permanently tear down the WebGL context — only call when truly disposing. */
  destroy: () => void;
}

const DEFAULTS: Required<Pick<AuroraProps, 'colorStops' | 'amplitude' | 'blend' | 'speed'>> = {
  colorStops: ['#5227FF', '#7cff67', '#5227FF'],
  amplitude: 1.0,
  blend: 0.5,
  speed: 1.0,
};

function toColorArray(stops: [string, string, string]) {
  return stops.map(hex => {
    const c = new Color(hex);
    return [c.r, c.g, c.b];
  });
}

/**
 * Creates a self-contained Aurora WebGL context that owns the renderer, program,
 * mesh and render loop. It lives outside the React lifecycle so the canvas and
 * GPU resources survive component remounts — callers just `mount`/`unmount` the
 * already-created canvas instead of recreating everything.
 */
export function createAuroraCtx(initialProps: AuroraProps = {}): AuroraCtx {
  let props: AuroraProps = { ...initialProps };

  const renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.canvas.style.backgroundColor = 'transparent';
  gl.canvas.style.width = '100%';
  gl.canvas.style.height = '100%';

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) {
    delete (geometry.attributes as Record<string, unknown>).uv;
  }

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: props.amplitude ?? DEFAULTS.amplitude },
      uColorStops: { value: toColorArray(props.colorStops ?? DEFAULTS.colorStops) },
      uResolution: { value: [1, 1] },
      uBlend: { value: props.blend ?? DEFAULTS.blend },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });

  let container: HTMLElement | null = null;
  let animateId = 0;
  let running = false;

  let resizeObserver: ResizeObserver | null = null;

  function resize() {
    if (!container) return;
    const width = container.offsetWidth || 1;
    const height = container.offsetHeight || 1;
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [width, height];
  }

  const update = (t: number) => {
    animateId = requestAnimationFrame(update);
    const time = props.time ?? t * 0.01;
    const speed = props.speed ?? DEFAULTS.speed;
    program.uniforms.uTime.value = time * speed * 0.1;
    program.uniforms.uAmplitude.value = props.amplitude ?? DEFAULTS.amplitude;
    program.uniforms.uBlend.value = props.blend ?? DEFAULTS.blend;
    program.uniforms.uColorStops.value = toColorArray(props.colorStops ?? DEFAULTS.colorStops);
    renderer.render({ scene: mesh });
  };

  function start() {
    if (running) return;
    running = true;
    animateId = requestAnimationFrame(update);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animateId);
  }

  return {
    canvas: gl.canvas,

    mount(nextContainer) {
      // Detach from any previous container before re-attaching.
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      container = nextContainer;
      nextContainer.appendChild(gl.canvas);

      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(nextContainer);

      resize();
      start();
    },

    unmount() {
      stop();
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      container = null;
    },

    setProps(next) {
      props = { ...props, ...next };
    },

    destroy() {
      stop();
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      container = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
