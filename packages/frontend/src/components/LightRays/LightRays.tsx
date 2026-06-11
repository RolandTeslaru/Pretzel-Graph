import { useEffect, useRef } from 'react';
import type { LightRaysCtx, LightRaysProps } from './createLightRaysCtx';

import './LightRays.css';

export type { LightRaysProps };

interface Props extends LightRaysProps {
  /** The LightRays WebGL context to drive. Create it outside the component (e.g.
   * module-level) so the canvas + GPU resources survive remounts. */
  ctx: LightRaysCtx;
  className?: string;
}

/**
 * Thin React wrapper around a LightRays WebGL context. Mounting only re-attaches
 * the provided ctx's persistent canvas + restarts its render loop, so remounting
 * never recreates any WebGL instances.
 */
export default function LightRays({ ctx, className = '', ...props }: Props) {
  const ctnDom = useRef<HTMLDivElement>(null);

  // Keep the ctx props in sync without re-running the mount effect.
  useEffect(() => {
    ctx.setProps(props);
  }, [
    ctx,
    props.raysOrigin,
    props.raysColor,
    props.raysSpeed,
    props.lightSpread,
    props.rayLength,
    props.pulsating,
    props.fadeDistance,
    props.saturation,
    props.followMouse,
    props.mouseInfluence,
    props.noiseAmount,
    props.distortion,
  ]);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    ctx.setProps(props);
    ctx.mount(ctn);

    return () => {
      ctx.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  return <div ref={ctnDom} className={`light-rays-container ${className}`.trim()} />;
}
