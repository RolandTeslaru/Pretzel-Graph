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
          onDragEnd={onDragEnd}
          style={{
            borderColor: blueprint.accent
              ? `color-mix(in srgb, var(--${blueprint.accent}) 30%, var(--secondary))`
              : 'var(--secondary)'
          }}
          {...props}
        >
          <LazyIcon
            name={blueprint.icon}
            className='w-4 size-4 h-4 my-auto '
            style={{ color: blueprint.iconColor ? `var(--${blueprint.iconColor})` : undefined }}
          />
          <p className='text-sm my-auto truncate flex-1 min-w-0 select-none'>
            {blueprint.displayName}
          </p>
          <SystemIcons.GripVertical className='w-[18px] h-[18px] text-muted-foreground ml-auto my-auto ' />
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content side="left" className='max-w-[250px] gap-2' >
        <div className='flex flex-row justify-between'>
          <h4 className='font-semibold text-sm'>{blueprint.displayName}</h4>
          <LazyIcon
            name={blueprint.icon}
            className='w-[18px] h-[18px] size-4 text-muted-foreground'
            style={{ color: blueprint.iconColor ? `var(--${blueprint.iconColor})` : undefined }}
          />
        </div>
        {/* <DataViewerWrapper src={blueprint}/> */}
        <p>{blueprint.description}</p>
      </Tooltip.Content>
    </Tooltip.Root>
  )
})

DrawerItem.displayName = 'DrawerItem';

export default DrawerItem

const onDragStart: React.DragEventHandler<HTMLDivElement> = (event) => {
  const crt = event.currentTarget.cloneNode(true) as HTMLElement;
  const blueprintId = event.currentTarget.dataset.blueprintId;

  crt.style.position = "absolute";
  crt.style.width = "215px";
  crt.style.top = "-500px";
  crt.style.right = "-500px";
  crt.classList.add("cursor-grabbing");

  document.body.appendChild(crt);
  event.dataTransfer.setDragImage(crt, 0, 0);

  if (blueprintId)
    event.dataTransfer.setData("blueprintId", blueprintId);
}



const onDragEnd: React.DragEventHandler<HTMLDivElement> = (event) => {
  const dragImage = document.getElementsByClassName("cursor-grabbing")[0];
  if (dragImage)
    document.body.removeChild(dragImage);
}
