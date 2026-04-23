import { CollapsiblePanel } from '@pretzel-graph/standard-ui/components/CollapsiblePanel'
import { AlertDialog, Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { DialogSDK } from '../sdk'

export const DialogSDKDebugPanel = ({defaultOpen}: {defaultOpen?: boolean}) => {
    return (
        <CollapsiblePanel.Vertical defaultOpen={defaultOpen} title="Dialogs" contentClassName='!p-2'>
            <Button variant="accent" size="lg"
                onClick={() => {
                    DialogSDK.actions.push("testDialog", (props) => <NormalDialog {...props} />)
                }}
            >
                Open Normal Dialogs
            </Button>
            <Button variant="accent" size="lg"
                onClick={() => {
                    DialogSDK.actions.push("testDialog", (props) => <AccentDialog {...props} />)
                }}
            >
                Open Accent Dialogs
            </Button>
            <Button variant="warning" size="lg"
                onClick={() => {
                    DialogSDK.actions.push("testDialog", (props) => <WarningDialog {...props} />)
                }}
            >
                Open Warning Dialogs
            </Button>
            <Button variant="destructive" size="lg"
                onClick={() => {
                    DialogSDK.actions.push("testDialog", (props) => <DangerDialog {...props} />)
                }}
            >
                Open Danger Dialog
            </Button>
        </CollapsiblePanel.Vertical>
    )
}

const DangerDialog = (props: DialogSDK.TemplateProps) => {
  return (
    <DialogSDK.AlertTemplate {...props} type="danger"
      onApprove={(event) => {
        event.preventDefault()

        DialogSDK.actions.push(`${Math.random()}`, DangerDialog)
      }}
    >
      <AlertDialog.Header>
        <AlertDialog.Title>
          ACTHUNG
        </AlertDialog.Title>
      </AlertDialog.Header>
      <AlertDialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Corporis maiores voluptates praesentium necessitatibus voluptas saepe minima quos explicabo tenetur, reprehenderit minus modi. Consectetur unde repellat similique facere! Possimus, nisi nam?
      </AlertDialog.Description>
    </DialogSDK.AlertTemplate>
  )
}


const WarningDialog = (props: DialogSDK.TemplateProps) => {
  return (
    <DialogSDK.AlertTemplate {...props} type="warning"
      onApprove={(event) => {
        event.preventDefault()

        DialogSDK.actions.push(`${Math.random()}`, WarningDialog)
      }}
    >
      <AlertDialog.Header>
        <AlertDialog.Title>
          WARNING
        </AlertDialog.Title>
      </AlertDialog.Header>
      <AlertDialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Corporis maiores voluptates praesentium necessitatibus voluptas saepe minima quos explicabo tenetur, reprehenderit minus modi. Consectetur unde repellat similique facere! Possimus, nisi nam?
      </AlertDialog.Description>
    </DialogSDK.AlertTemplate>
  )
}



const AccentDialog = (props: DialogSDK.TemplateProps) => {
  return (
    <DialogSDK.AlertTemplate {...props} type="accent"
      onApprove={(event) => {
        event.preventDefault()

        DialogSDK.actions.push(`${Math.random()}`, AccentDialog)
      }}
    >
      <AlertDialog.Header>
        <AlertDialog.Title>
          Careful
        </AlertDialog.Title>
      </AlertDialog.Header>
      <AlertDialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Corporis maiores voluptates praesentium necessitatibus voluptas saepe minima quos explicabo tenetur, reprehenderit minus modi. Consectetur unde repellat similique facere! Possimus, nisi nam?
      </AlertDialog.Description>
    </DialogSDK.AlertTemplate>
  )
}

const NormalDialog = (props: DialogSDK.TemplateProps) => {
  return (
    <DialogSDK.Template {...props}
      onApprove={(event) => {
        event.preventDefault()

        DialogSDK.actions.push(`${Math.random()}`, WarningDialog)
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          WARNING
        </Dialog.Title>
      </Dialog.Header>
      <Dialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Corporis maiores voluptates praesentium necessitatibus voluptas saepe minima quos explicabo tenetur, reprehenderit minus modi. Consectetur unde repellat similique facere! Possimus, nisi nam?
      </Dialog.Description>
    </DialogSDK.Template>
  )
}