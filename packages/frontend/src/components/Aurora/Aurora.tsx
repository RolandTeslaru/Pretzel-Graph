import { useEffect, useRef } from 'react';
import type { AuroraCtx, AuroraProps } from './createAuroraCtx';

import './Aurora.css';

export type { AuroraProps };

interface Props extends AuroraProps {
  /** The Aurora WebGL context to drive. Create it outside the component (e.g.
   * module-level) so the canvas + GPU resources survive remounts. */
  ctx: AuroraCtx;
}

/**
 * Thin React wrapper around an Aurora WebGL context. Mounting only re-attaches
 * the provided ctx's persistent canvas + restarts its render loop, so remounting
 * never recreates any WebGL instances.
 */
export default function Aurora({ ctx, ...props }: Props) {
  const ctnDom = useRef<HTMLDivElement>(null);

  // Keep the ctx props in sync without re-running the mount effect.
  useEffect(() => {
    ctx.setProps(props);
  }, [ctx, props.colorStops, props.amplitude, props.blend, props.speed, props.time]);

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

  return <div ref={ctnDom} className="aurora-container" />;
}
