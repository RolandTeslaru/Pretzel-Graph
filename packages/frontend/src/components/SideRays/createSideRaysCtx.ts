import { Renderer, Program, Triangle, Mesh } from 'ogl';

export type SideRaysOrigin =
  | 'top-center'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export interface SideRaysProps {
  speed?: number;
  rayColor1?: string;
  rayColor2?: string;
  intensity?: number;
  spread?: number;
  origin?: SideRaysOrigin;
  tilt?: number;
  saturation?: number;
  blend?: number;
  falloff?: number;
  opacity?: number;
}

export interface SideRaysCtx {
  /** The persistent WebGL canvas — reattached on every mount. */
  readonly canvas: HTMLCanvasElement;
  /** Append the canvas to `container`, size it, and start the render loop. */
  mount: (container: HTMLElement) => void;
  /** Detach the canvas and pause the render loop. Keeps WebGL resources alive. */
  unmount: () => void;
  /** Update animation props live. */
  setProps: (props: SideRaysProps) => void;
  /** Permanently tear down the WebGL context — only call when truly disposing. */
  destroy: () => void;
}

const DEFAULTS: Required<SideRaysProps> = {
  speed: 2.5,
  rayColor1: '#EAB308',
  rayColor2: '#96c8ff',
  intensity: 2,
  spread: 2,
  origin: 'top-center',
  tilt: 0,
  saturation: 1.5,
  blend: 0.75,
  falloff: 1.6,
  opacity: 1.0,
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

const originToFlip = (origin: SideRaysOrigin): [number, number] => {
  switch (origin) {
    case 'top-left':
      return [1, 0];
    case 'bottom-right':
      return [0, 1];
    case 'bottom-left':
      return [1, 1];
    default: // 'top-right' / 'top-center' (symmetric, no flip needed)
      return [0, 0];
  }
};

// 1 = top-center (source centered above, rays fan straight down);
// 0 = corner mode (source off the top-right, rays fan in at 45°, flips pick corner).
const originToMode = (origin: SideRaysOrigin): number => (origin === 'top-center' ? 1 : 0);

const VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;
uniform float iOriginMode;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  // top-center: source centered above the canvas, base ray points straight down.
  // corner: source off the top-right, base ray fans in at 45° (flips pick corner).
  bool topCenter = iOriginMode > 0.5;
  vec2 rayPos = topCenter
    ? vec2(iResolution.x * 0.5, -0.5 * iResolution.y)
    : vec2(iResolution.x * 1.1, -0.5 * iResolution.y);
  float baseAngle = topCenter ? 1.5707963 : 0.785398;

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(baseAngle + halfSpread), sin(baseAngle + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(baseAngle - halfSpread), sin(baseAngle - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`;

/**
 * Creates a self-contained SideRays WebGL context that owns the renderer,
 * program, mesh and render loop. It lives outside the React lifecycle so the
 * canvas and GPU resources survive component remounts — callers just
 * `mount`/`unmount` the already-created canvas instead of recreating everything.
 *
 * Mirrors createAuroraCtx / createLightRaysCtx. Unlike the upstream React Bits
 * component, this never tears down / rebuilds the WebGL context on visibility or
 * remount; `unmount` only pauses the RAF loop.
 */
export function createSideRaysCtx(initialProps: SideRaysProps = {}): SideRaysCtx {
  let props: Required<SideRaysProps> = { ...DEFAULTS, ...initialProps };

  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio, 2),
    alpha: true,
  });
  const gl = renderer.gl;
  gl.canvas.style.width = '100%';
  gl.canvas.style.height = '100%';
  gl.canvas.style.backgroundColor = 'transparent';

  const [flipX, flipY] = originToFlip(props.origin);
  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1] as [number, number] },
    iSpeed: { value: props.speed },
    iRayColor1: { value: hexToRgb(props.rayColor1) },
    iRayColor2: { value: hexToRgb(props.rayColor2) },
    iIntensity: { value: props.intensity },
    iSpread: { value: props.spread },
    iFlipX: { value: flipX },
    iFlipY: { value: flipY },
    iTilt: { value: props.tilt },
    iSaturation: { value: props.saturation },
    iBlend: { value: props.blend },
    iFalloff: { value: props.falloff },
    iOpacity: { value: props.opacity },
    iOriginMode: { value: originToMode(props.origin) },
  };

  const geometry = new Triangle(gl);
  const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms });
  const mesh = new Mesh(gl, { geometry, program });

  let container: HTMLElement | null = null;
  let animateId = 0;
  let running = false;
  let resizeObserver: ResizeObserver | null = null;

  function resize() {
    if (!container) return;
    renderer.dpr = Math.min(window.devicePixelRatio, 2);
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    uniforms.iResolution.value = [w * renderer.dpr, h * renderer.dpr];
  }

  const update = (t: number) => {
    animateId = requestAnimationFrame(update);
    uniforms.iTime.value = t * 0.001;
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
      uniforms.iSpeed.value = props.speed;
      uniforms.iRayColor1.value = hexToRgb(props.rayColor1);
      uniforms.iRayColor2.value = hexToRgb(props.rayColor2);
      uniforms.iIntensity.value = props.intensity;
      uniforms.iSpread.value = props.spread;
      const [fx, fy] = originToFlip(props.origin);
      uniforms.iFlipX.value = fx;
      uniforms.iFlipY.value = fy;
      uniforms.iOriginMode.value = originToMode(props.origin);
      uniforms.iTilt.value = props.tilt;
      uniforms.iSaturation.value = props.saturation;
      uniforms.iBlend.value = props.blend;
      uniforms.iFalloff.value = props.falloff;
      uniforms.iOpacity.value = props.opacity;
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
