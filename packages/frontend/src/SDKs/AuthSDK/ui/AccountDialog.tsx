import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Badge, Button, Dialog, Form, Input, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Auth } from '@pretzel-graph/shared/domain'
import { DialogSDK } from '@/SDKs/DialogSDK'
import { AuthSDK } from '../sdk'

const DIALOG_ID = 'account'
const DIALOG_CLASSNAME = 'sm:max-w-[480px] w-full'

const ROW = 'flex flex-row items-center justify-between gap-4 px-1 min-h-9'
const LABEL = 'text-sm text-muted-foreground font-normal'
const FIELD = 'h-7 w-fit!'

type Values = Auth.API.Me.Update.Request

export function openAccountDialog() {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.Template {...props} className={DIALOG_CLASSNAME}>
            <AccountContent />
        </DialogSDK.Template>
    ))
}

function AccountContent() {
    const user = AuthSDK.useStore(s => s.user)
    const [isEditing, setIsEditing] = useState(false)

    if (!user) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                Not signed in.
            </div>
        )
    }

    return (
        <div className="p-3 flex flex-col gap-4">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.User size={20} className=" shrink-0" />
                    Account
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    {isEditing ? 'Update your profile details.' : 'Your account information.'}
                </Dialog.Description>
            </Dialog.Header>

            {isEditing
                ? <EditView user={user} onDone={() => setIsEditing(false)} />
                : <ReadView user={user} onEdit={() => setIsEditing(true)} />}
        </div>
    )
}

function ReadView({ user, onEdit }: { user: Auth.User; onEdit: () => void }) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <Row label="Display name" value={user.display_name} />
                <Row label="Username" value={`@${user.username}`} />
                <StaticRows user={user} />
            </div>

            <Dialog.Footer>
                <Button type="button" variant="outline" onClick={() => DialogSDK.actions.pop(DIALOG_ID)}>
                    Close
                </Button>
                <Button type="button" onClick={onEdit}>
                    <SystemIcons.SquarePen className="mr-2 size-4" />
                    Edit
                </Button>
            </Dialog.Footer>
        </div>
    )
}

function EditView({ user, onDone }: { user: Auth.User; onDone: () => void }) {
    const form = useForm<Values>({
        resolver: zodResolver(Auth.API.Me.Update.Request),
        defaultValues: {
            display_name: user.display_name,
            username: user.username,
        },
    })

    const onSubmit = async (values: Values) => {
        try {
            await AuthSDK.actions.updateMe(values)
            toast.success('Account updated')
            onDone()
        } catch (err) {
            // The unique index on lower(username) surfaces as 23505 -> CONFLICT.
            if (isAxiosError(err) && err.response?.status === 409) {
                form.setError('username', { message: 'That username is already taken' })
                return
            }

            console.error('Failed to update account', err)
            toast.error('Failed to update account')
        }
    }

    return (
        <Form.Root {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                <div className="flex flex-col">
                    <Form.Field control={form.control} name="display_name" render={({ field }) => (
                        <Form.Item className={ROW}>
                            <Form.Label className={LABEL}>Display name</Form.Label>
                            <div className="flex flex-col items-end gap-1 py-1">
                                <Form.Control><Input {...field}  className={FIELD} placeholder="Your name" autoFocus /></Form.Control>
                                <Form.Message />
                            </div>
                        </Form.Item>
                    )} />
                    <Form.Field control={form.control} name="username" render={({ field }) => (
                        <Form.Item className={ROW}>
                            <Form.Label className={LABEL}>Username</Form.Label>
                            <div className="flex flex-col items-end gap-1 py-1">
                                <Form.Control><Input {...field}  className={FIELD} placeholder="username" /></Form.Control>
                                <Form.Message />
                            </div>
                        </Form.Item>
                    )} />
                    <StaticRows user={user} />
                </div>

                <Dialog.Footer>
                    <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </Dialog.Footer>
            </form>
        </Form.Root>
    )
}

// Not editable in either mode — email is owned by supabase auth.
function StaticRows({ user }: { user: Auth.User }) {
    const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <>
            <Row label="Email" value={user.email ?? '—'} />
            <Row label="Member since" value={memberSince} />
        </>
    )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className={ROW}>
            <span className={LABEL}>{label}</span>
            <span className="text-sm font-medium truncate">{value}</span>
        </div>
    )
}
