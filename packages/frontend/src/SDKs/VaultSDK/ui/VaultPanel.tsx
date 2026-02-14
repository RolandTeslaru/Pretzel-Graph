import React, { useEffect, useState } from 'react'
import { VaultSDK } from '../sdk'
import {
  Button,
  Input,
  Label,
  Text,
  Dialog,
  Spinner,
  AlertDialog, // Still needed for Header/Title etc if they are not exposed by standard dialog
} from '@/vx-ui/foundations'
import { Vault } from '@vx-agent-editor/shared/domain'
import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import { SystemIcons } from '@/vx-ui/icons'
import { toast } from 'sonner'

const VaultPanel = () => {
  const credentials = VaultSDK.useStore(s => s.credentials)

  useEffect(() => {
    VaultSDK.actions.refreshAll()
  }, [])

  return (
    <div className='flex flex-col h-full w-full p-4 gap-4 min-w-[600px]'>
      <div className='flex flex-row w-full gap-3'>
        <SystemIcons.Vault className=' size-10' />
        <h1 className='text-lg font-bold my-auto'>VAULT</h1>
        <Button className='ml-auto' onClick={() => {
          DialogSDK.actions.push("add-credential", (props) => (
            <DialogSDK.Template {...props}>
              <AddCredentialContent />
            </DialogSDK.Template>
          ))
        }} size='sm'>
          <SystemIcons.Plus className='mr-2 h-4 w-4' />
          Add New
        </Button>

      </div>

      <Text className='text-sm text-muted-foreground my-auto'>Manage your API keys and secrets securely.</Text>


      <div className='flex flex-col gap-2 bg-background rounded-md border border-border'>
        {credentials.length === 0 && (
          <div className='flex flex-col bg-background items-center justify-center p-8 border border-dashed rounded-md gap-2'>
            <SystemIcons.KeyRound className='h-8 w-8 text-muted-foreground' />
            <Text className='text-muted-foreground'>No credentials found. Add one to get started.</Text>
          </div>
        )}
        {credentials.map(credential => (
          <CredentialItem key={credential.id} credential={credential} />
        ))}
      </div>

      <Text className='text-sm text-muted-foreground'>
        {credentials.length} secrets stored securely
      </Text>
    </div>
  )
}

export default VaultPanel


const CredentialItem = ({ credential }: { credential: Vault.Credential }) => {
  const [localProvider, setLocalProvider] = useState(credential.provider)
  const [localName, setLocalName] = useState(credential.name)

  // Secret state
  const [isRevealed, setIsRevealed] = useState(false)
  const [localSecret, setLocalSecret] = useState('')
  const [originalSecret, setOriginalSecret] = useState('')

  const [isLoading, setIsLoading] = useState(false)

  // Update effect in case parent updates props
  useEffect(() => {
    setLocalProvider(credential.provider)
    setLocalName(credential.name)
  }, [credential])

  const handleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false)
      setLocalSecret('')
      setOriginalSecret('')
      return
    }
    setIsLoading(true)
    try {
      const value = await VaultSDK.actions.reveal(credential.id)
      setOriginalSecret(value)
      setLocalSecret(value)
      setIsRevealed(true)
    } catch (error) {
      console.error("Failed to reveal credential", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      DialogSDK.actions.push(`delete-credential-${credential.id}`, (props) => (
        <DialogSDK.AlertTemplate
          {...props}
          type="danger"
          onApprove={async () => {
            await VaultSDK.actions.remove(credential.id)
            await VaultSDK.actions.refreshAll()
            DialogSDK.actions.pop(`delete-credential-${credential.id}`)
          }}
          onCancel={() => DialogSDK.actions.pop(`delete-credential-${credential.id}`)}
        >
          <AlertDialog.Title>
            Are you absolutely sure?
          </AlertDialog.Title>
          <AlertDialog.Description>
            Deleting <span className="font-semibold text-destructive">{credential.name}</span> cannot be undone.
          </AlertDialog.Description>
        </DialogSDK.AlertTemplate>
      ))
    } catch (error) {
      console.error("Failed to delete credential", error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (localName !== credential.name || localProvider !== credential.provider) {
        await VaultSDK.actions.update.meta({ id: credential.id, name: localName, provider: localProvider })
      }
      if (isRevealed && localSecret !== originalSecret) {
        await VaultSDK.actions.update.secret({ id: credential.id, newValue: localSecret })
      }
      await VaultSDK.actions.refreshAll()

      // Update original secret if we saved it
      if (isRevealed) {
        setOriginalSecret(localSecret)
      }
    } catch (error) {
      console.error("Failed to update credential", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUndo = () => {
    setLocalName(credential.name)
    setLocalProvider(credential.provider)
    if (isRevealed) {
      setLocalSecret(originalSecret)
    }
  }

  const isDirty =
    localName !== credential.name ||
    localProvider !== credential.provider ||
    (isRevealed && localSecret !== originalSecret)

  return (
    <div className='flex flex-row w-full px-1 gap-4'>
      <Input
        value={localProvider}
        onChange={(e) => setLocalProvider(e.target.value)}
        className='text-xs border-none rounded-sm px-1 py-0.5 h-auto my-auto bg-transparent! max-w-20'
      >
      </Input>
      <Input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        className='text-xs border-none rounded-sm px-1 py-0.5 h-auto my-auto bg-transparent!'
      >
      </Input>
      <Input
        value={isRevealed ? localSecret : '••••••••••••••••••••••••'}
        onChange={(e) => setLocalSecret(e.target.value)}
        disabled={!isRevealed}
        className='text-xs border-none rounded-sm px-1 py-0.5 h-auto my-auto bg-transparent!'
      >
      </Input>

      <div className='flex flex-row gap-1'>

        {isDirty ? (
          <>
            <Button variant='ghost' size='icon' onClick={handleUndo} disabled={isLoading}>
              <SystemIcons.X className='text-red-500' />
            </Button>
            <Button variant='ghost' size='icon' onClick={handleSave} disabled={isLoading}>
              <SystemIcons.Check className='text-green-500' />
            </Button>
          </>
        ) :
          <>
            <Button variant='ghost' size='icon' onClick={handleReveal} disabled={isLoading}>
              {isLoading ? <Spinner className='h-4 w-4' /> : (
                isRevealed ? <SystemIcons.EyeOff className='h-4 w-4' /> : <SystemIcons.Eye className='h-4 w-4' />
              )}
              <span className="sr-only">Toggle visibility</span>
            </Button>
            <Button variant='ghost' size='icon' onClick={handleDelete} disabled={isLoading}>
              <SystemIcons.Trash className='text-red-500' />
              <span className="sr-only">Delete</span>
            </Button>
          </>

        }

      </div>


    </div>
  )

}

const AddCredentialContent = () => {
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [value, setValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !provider || !value) return

    setIsLoading(true)
    try {
      await VaultSDK.actions.create({ name, provider, value })
      await VaultSDK.actions.refreshAll()
      DialogSDK.actions.pop("add-credential")
      // Reset form
      setName('')
      setProvider('')
      setValue('')
    } catch (error) {
      toast.error("Failed to create credential")
      console.error("Failed to create credential", error)
      setName('')
      setProvider('')
      setValue('')
      setIsLoading(false);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='p-3 flex flex-col gap-4'>
      <Dialog.Header className='my-1'>
        <Dialog.Title>Add New Credential</Dialog.Title>
        <Dialog.Description className='text-muted-foreground'>
          Add a new API key or secret to your vault.
        </Dialog.Description>
      </Dialog.Header>

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='provider'>Provider</Label>
          <Input
            id='provider'
            placeholder='e.g. OpenAI, Google, AWS'
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            required
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='name'>Name</Label>
          <Input
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='value'>Secret Value</Label>
          <Input
            id='value'
            type='password'
            placeholder='sk-...'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>

        <Dialog.Footer>
          <Button type='button' variant='outline' onClick={() => DialogSDK.actions.pop("add-credential")}>Cancel</Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
            Save Credential
          </Button>
        </Dialog.Footer>
      </form>
    </div>
  )
}

