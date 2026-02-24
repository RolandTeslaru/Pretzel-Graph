
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Form, Button, Select, Tabs, Spinner } from '@/vx-ui/foundations'
import { useState } from 'react'
import { AuthSDK } from '../sdk'

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

const AuthenticationPanel = () => {

    const [variant, setVariant] = useState<"login" | "signup">("login")

    return (
        <div className="flex flex-col gap-2 p-2">
            {variant}
            <Tabs.Root 
                defaultValue={variant}
                onValueChange={(val) => {
                    setVariant(val as "login" | "signup");
                }}
            >
                <Tabs.List>
                    <Tabs.Trigger className='w-full' value='signup'>Sign Up</Tabs.Trigger>
                    <Tabs.Trigger className='w-full' value='login'>Login</Tabs.Trigger>
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
                        <Button type="submit" disabled={disabled}>Login</Button>
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