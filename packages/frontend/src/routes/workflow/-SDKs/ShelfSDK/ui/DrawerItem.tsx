import React, { memo } from 'react'
import { ShelfSDK } from '../sdk';
import { Tooltip } from '@pretzel-graph/standard-ui/foundations';
import type { Foundations } from '@pretzel-graph/shared/domain';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon';


interface Props extends React.HTMLAttributes<HTMLDivElement> {
  blueprintId: Foundations.Blueprint.Id
}

const DrawerItem: React.FC<Props> = memo(({ blueprintId, ...props }) => {
  const blueprint = ShelfSDK.useStore(s => s.blueprints[blueprintId]);

  if (!blueprint) return null;


  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger>
        <div
          className='cursor-grab h-8 pl-2 pr-1 bg-secondary text-left rounded-lg flex flex-row gap-2 max-w-[210px] border-r-5 shadow-sm shadow-neutral-900/10'
          draggable={true}
          data-blueprint-id={blueprintId}
          onDragStart={onDragStart}
          onDragEnd={clearDragImage}
          style={{
            borderColor: blueprint.ui.accent
              ? `color-mix(in srgb, var(--${blueprint.ui.accent}) 30%, var(--secondary))`
              : 'var(--secondary)'
          }}
          {...props}
        >
          <LazyIcon
            name={blueprint.ui.icon}
            className='w-4 size-4 h-4 my-auto '
            style={{ color: blueprint.ui.iconColor ? `var(--${blueprint.ui.iconColor})` : undefined }}
          />
          <p className='text-sm my-auto truncate flex-1 min-w-0 select-none'>
            {blueprint.ui.displayName}
          </p>
          <SystemIcons.GripVertical className='w-[18px] h-[18px] text-muted-foreground ml-auto my-auto ' />
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content side="left" className='max-w-[250px] gap-2' >
        <div className='flex flex-row justify-between'>
          <h4 className='font-semibold text-sm'>{blueprint.ui.displayName}</h4>
          <LazyIcon
            name={blueprint.ui.icon}
            className='w-[18px] h-[18px] size-4 text-muted-foreground'
            style={{ color: blueprint.ui.iconColor ? `var(--${blueprint.ui.iconColor})` : undefined }}
          />
        </div>
        {/* <DataViewerWrapper src={blueprint}/> */}
        <p>{blueprint.ui.description}</p>
      </Tooltip.Content>
    </Tooltip.Root>
  )
})

DrawerItem.displayName = 'DrawerItem';

export default DrawerItem

// The drag image must be in the document when setDragImage runs, so a clone is parked
// off-screen. We hold the reference rather than looking it up again: onDragEnd does not
// fire for every cancelled drag, so the drop handler clears it too.
let dragImage: HTMLElement | null = null;

export const clearDragImage = () => {
  dragImage?.remove();
  dragImage = null;
};

const onDragStart: React.DragEventHandler<HTMLDivElement> = (event) => {
  clearDragImage();

  const item = event.currentTarget;
  const clone = item.cloneNode(true) as HTMLElement;

  clone.style.position = "absolute";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.width = `${item.offsetWidth}px`;
  clone.style.pointerEvents = "none";

  document.body.appendChild(clone);
  event.dataTransfer.setDragImage(clone, 0, 0);
  dragImage = clone;

  const blueprintId = item.dataset.blueprintId;
  if (blueprintId)
    event.dataTransfer.setData("blueprintId", blueprintId);
}
