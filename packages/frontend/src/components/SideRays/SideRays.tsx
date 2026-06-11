import { useEffect, useRef } from 'react';
import type { SideRaysCtx, SideRaysProps } from './createSideRaysCtx';

import './SideRays.css';

export type { SideRaysProps };

interface Props extends SideRaysProps {
  /** The SideRays WebGL context to drive. Create it outside the component (e.g.
   * module-level) so the canvas + GPU resources survive remounts. */
  ctx: SideRaysCtx;
  className?: string;
}

/**
 * Thin React wrapper around a SideRays WebGL context. Mounting only re-attaches
 * the provided ctx's persistent canvas + restarts its render loop, so remounting
 * never recreates any WebGL instances.
 */
export default function SideRays({ ctx, className = '', ...props }: Props) {
  const ctnDom = useRef<HTMLDivElement>(null);

  // Keep the ctx props in sync without re-running the mount effect.
  useEffect(() => {
    ctx.setProps(props);
  }, [
    ctx,
    props.speed,
    props.rayColor1,
    props.rayColor2,
    props.intensity,
    props.spread,
    props.origin,
    props.tilt,
    props.saturation,
    props.blend,
    props.falloff,
    props.opacity,
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

  return <div ref={ctnDom} className={`side-rays-container ${className}`.trim()} />;
}
