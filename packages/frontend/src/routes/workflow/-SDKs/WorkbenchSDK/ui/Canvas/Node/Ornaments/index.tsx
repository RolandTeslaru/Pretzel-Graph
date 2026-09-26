import { Workflow } from '@pretzel-graph/shared/domain';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import { Button } from '@pretzel-graph/standard-ui/foundations';
import Tipped from '@/components/Tipped';
import { WorkbenchSDK } from '../../../../sdk';

export const NodeOrnaments = ({ hyNode, canAddInputPort }: { hyNode: Workflow.Node.Hydrated, canAddInputPort: boolean }) => {

  const isIgniter   = hyNode.blueprint.igniter ?? false
  const isPassive   = hyNode.blueprint.passive ?? false
  const listensToGateway = Boolean(hyNode.blueprint.gatewayListener)
  const hasWebhooks = Boolean(hyNode.blueprint.webhooks?.length)

  return (
    <>
      {(isIgniter || listensToGateway || hasWebhooks) &&
        <div className='absolute top-1 right-full mr-2 flex items-center gap-1'>
          {isIgniter &&
            <Tipped label={
              <div className='max-w-[220px]'>
                <p className='font-semibold'>Igniter Node</p>
                <p className='text-xs opacity-70'>A run can start from this node. Pick it as the entry point when you launch.</p>
              </div>
            }>
              <SystemIcons.Zap className='size-6 dark:text-yellow-300 text-yellow-400'/>
            </Tipped>
          }
          {listensToGateway &&
            <Tipped label={
              <div className='max-w-[220px]'>
                <p className='font-semibold'>Gateway Listener</p>
                <p className='text-xs opacity-70'>Listens for events from a persistent connection.</p>
              </div>
            }>
              <SystemIcons.ChevronsLeftRightEllipsis className='size-6 text-cyan-400 '/>
            </Tipped>
          }
          {hasWebhooks &&
            <Tipped label={
              <div className='max-w-[220px]'>
                <p className='font-semibold'>Webhook Listener</p>
                <p className='text-xs opacity-70'>Receives events through an HTTP webhook.</p>
              </div>
            }>
              <SystemIcons.Webhook className='size-6 text-cyan-400'/>
            </Tipped>
          }
        </div>
      }
      {isPassive &&
        <div className='absolute top-1 -left-8'>
          <Tipped label={
            <div className='max-w-[220px]'>
              <p className='font-semibold'>Passive Node</p>
              <p className='text-xs opacity-70'>Never starts a run and cannot be launched. It only fires when another node reaches it mid-run.</p>
            </div>
          }>
            <SystemIcons.Ambient className='size-6 dark:text-cyan-300 text-cyan-400'/>
          </Tipped>
        </div>
      }

      {canAddInputPort &&
        <Button  variant={"input"} size="icon-sm" className='absolute -left-10 top-1/2 -translate-y-1/2'
          onClick={() => {
            WorkbenchSDK.dialogs.openAddInputPort(hyNode.id)
          }}
        >
          <SystemIcons.Plus />
        </Button>
      }
    </>
  )
}
