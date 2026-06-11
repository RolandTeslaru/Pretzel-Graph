import { Renderer, Program, Triangle, Mesh } from 'ogl';

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

export interface LightRaysProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
}

export interface LightRaysCtx {
  /** The persistent WebGL canvas — reattached on every mount. */
  readonly canvas: HTMLCanvasElement;
  /** Append the canvas to `container`, size it, and start the render loop. */
  mount: (container: HTMLElement) => void;
  /** Detach the canvas and pause the render loop. Keeps WebGL resources alive. */
  unmount: () => void;
  /** Update animation props live. */
  setProps: (props: LightRaysProps) => void;
  /** Permanently tear down the WebGL context — only call when truly disposing. */
  destroy: () => void;
}

const DEFAULTS: Required<LightRaysProps> = {
  raysOrigin: 'top-center',
  raysColor: '#ffffff',
  raysSpeed: 1,
  lightSpread: 1,
  rayLength: 2,
  pulsating: false,
  fadeDistance: 1.0,
  saturation: 1.0,
  followMouse: true,
  mouseInfluence: 0.1,
  noiseAmount: 0.0,
  distortion: 0.0,
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

const getAnchorAndDir = (
  origin: RaysOrigin,
  w: number,
  h: number
): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);

  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

/**
 * Creates a self-contained LightRays WebGL context that owns the renderer,
 * program, mesh and render loop. It lives outside the React lifecycle so the
 * canvas and GPU resources survive component remounts — callers just
 * `mount`/`unmount` the already-created canvas instead of recreating everything.
 *
 * Mirrors the createAuroraCtx pattern. Unlike the upstream React Bits LightRays
 * component, this never tears down / rebuilds the WebGL context on visibility or
 * remount; `unmount` only pauses the RAF loop.
 */
export function createLightRaysCtx(initialProps: LightRaysProps = {}): LightRaysCtx {
  let props: Required<LightRaysProps> = { ...DEFAULTS, ...initialProps };

  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio, 2),
    alpha: true,
  });
  const gl = renderer.gl;
  gl.canvas.style.width = '100%';
  gl.canvas.style.height = '100%';
  gl.canvas.style.backgroundColor = 'transparent';

  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1] as [number, number] },

    rayPos: { value: [0, 0] as [number, number] },
    rayDir: { value: [0, 1] as [number, number] },

    raysColor: { value: hexToRgb(props.raysColor) },
    raysSpeed: { value: props.raysSpeed },
    lightSpread: { value: props.lightSpread },
    rayLength: { value: props.rayLength },
    pulsating: { value: props.pulsating ? 1.0 : 0.0 },
    fadeDistance: { value: props.fadeDistance },
    saturation: { value: props.saturation },
    mousePos: { value: [0.5, 0.5] as [number, number] },
    mouseInfluence: { value: props.mouseInfluence },
    noiseAmount: { value: props.noiseAmount },
    distortion: { value: props.distortion },
  };

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms,
  });
  const mesh = new Mesh(gl, { geometry, program });

  let container: HTMLElement | null = null;
  let animateId = 0;
  let running = false;
  let resizeObserver: ResizeObserver | null = null;

  // Device-pixel dimensions used for ray anchor placement.
  let wDevice = 1;
  let hDevice = 1;

  const mouse = { x: 0.5, y: 0.5 };
  const smoothMouse = { x: 0.5, y: 0.5 };

  function resize() {
    if (!container) return;
    renderer.dpr = Math.min(window.devicePixelRatio, 2);
    const wCSS = container.clientWidth || 1;
    const hCSS = container.clientHeight || 1;
    renderer.setSize(wCSS, hCSS);

    const dpr = renderer.dpr;
    wDevice = wCSS * dpr;
    hDevice = hCSS * dpr;
    uniforms.iResolution.value = [wDevice, hDevice];

    const { anchor, dir } = getAnchorAndDir(props.raysOrigin, wDevice, hDevice);
    uniforms.rayPos.value = anchor;
    uniforms.rayDir.value = dir;
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
  };

  const update = (t: number) => {
    animateId = requestAnimationFrame(update);
    uniforms.iTime.value = t * 0.001;

    if (props.followMouse && props.mouseInfluence > 0.0) {
      const smoothing = 0.92;
      smoothMouse.x = smoothMouse.x * smoothing + mouse.x * (1 - smoothing);
      smoothMouse.y = smoothMouse.y * smoothing + mouse.y * (1 - smoothing);
      uniforms.mousePos.value = [smoothMouse.x, smoothMouse.y];
    }

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
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      container = nextContainer;
      nextContainer.appendChild(gl.canvas);

      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(nextContainer);

      window.addEventListener('mousemove', handleMouseMove);

      resize();
      start();
    },

    unmount() {
      stop();
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('mousemove', handleMouseMove);
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      container = null;
    },

    setProps(next) {
      props = { ...props, ...next };
      uniforms.raysColor.value = hexToRgb(props.raysColor);
      uniforms.raysSpeed.value = props.raysSpeed;
      uniforms.lightSpread.value = props.lightSpread;
      uniforms.rayLength.value = props.rayLength;
      uniforms.pulsating.value = props.pulsating ? 1.0 : 0.0;
      uniforms.fadeDistance.value = props.fadeDistance;
      uniforms.saturation.value = props.saturation;
      uniforms.mouseInfluence.value = props.mouseInfluence;
      uniforms.noiseAmount.value = props.noiseAmount;
      uniforms.distortion.value = props.distortion;

      // raysOrigin affects anchor/dir — recompute against current dimensions.
      const { anchor, dir } = getAnchorAndDir(props.raysOrigin, wDevice, hDevice);
      uniforms.rayPos.value = anchor;
      uniforms.rayDir.value = dir;
    },

    destroy() {
      stop();
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('mousemove', handleMouseMove);
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      container = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
