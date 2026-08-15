
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Form, Button, Select, Tabs, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { useState } from 'react'
import { AuthSDK } from '../sdk'
import { router } from '@/main'

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
})

const signUpSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
    username: z.string(),
    displayName: z.string()
})

const AuthenticationPanel = ({ claimed }: { claimed: boolean }) => {

    const [variant, setVariant] = useState<"login" | "signup">("login")

    // Nobody owns this instance yet, so there is nothing to log in to.
    if (!claimed)
        return (
            <div className="flex flex-col gap-2 p-2">
                <div className="text-center">
                    <p className="font-semibold">Create the owner account</p>
                    <p className="text-xs text-muted-foreground">The first account owns this instance.</p>
                </div>
                <SignUpPanel/>
            </div>
        )

    return (
        <div className="flex flex-col gap-2 p-2">
            <Tabs.Root 
                defaultValue={variant}
                onValueChange={(val) => {
                    setVariant(val as "login" | "signup");
                }}
            >
                <Tabs.List>
                    <Tabs.Trigger className='w-full' value='login'>Login</Tabs.Trigger>
                    <Tabs.Trigger className='w-full' value='signup'>Sign Up</Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root>
            {variant === "login"
                ? <LoginPanel/>
                : <SignUpPanel/>
            }
        </div>
    )
}

export default AuthenticationPanel


const SignUpPanel = () => {
    const [disabled, setDisabled] = useState(false)
    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email: "",
            password: "",
            username: "",
            displayName: ""
        },
        disabled: disabled
    })

    async function onSubmit(values: z.infer<typeof signUpSchema>) {
        setDisabled(true);
        const success = await AuthSDK.actions.signup(values)
        setDisabled(false);
        if (success) {
            router.navigate({ to: "/home" })
        }
    }


    return (
        <div>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Form.Field
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Email</Form.Label>
                                <Form.Control>
                                    <Input {...field} />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Field
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Password</Form.Label>
                                <Form.Control>
                                    <Input type="password" {...field} />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Field
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Username</Form.Label>
                                <Form.Control>
                                    <Input {...field} />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Field
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Display Name</Form.Label>
                                <Form.Control>
                                    <Input {...field} />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Item>
                        <Button type="submit" disabled={disabled}>Sign up</Button>
                    </Form.Item>
                </form>
            </Form.Root>
        </div>
    )
}

const LoginPanel = () => {
    const [disabled, setDisabled] = useState(false)

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
        disabled
    })

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        setDisabled(true)
        const success = await AuthSDK.actions.login(values)
        setDisabled(false)
        if(success) {
            router.navigate({ to: "/home"})
        }
    }

    return (
        <div>
            <Form.Root {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Form.Field
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Email</Form.Label>
                                <Form.Control>
                                    <Input {...field} />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Field
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <Form.Item>
                                <Form.Label>Password</Form.Label>
                                <Form.Control>
                                    <Input type="password" {...field} />
                                </Form.Control>
                                <Form.Message />
                            </Form.Item>
                        )}
                    />
                    <Form.Item>
                        <Button type="submit" disabled={disabled}>
                            {disabled ? 
                            <>
                                <Spinner/>
                            </>
                            : <>Login</>
                            }
                        </Button>
                    </Form.Item>
                </form>
            </Form.Root>
        </div>
    )
}