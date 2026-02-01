"use client"

import * as React from "react"
import { useState } from "react"

import {
    Example,
    ExampleWrapper,
} from '@/vx-ui/foundations/example'
import {
    AlertDialog,
} from '@/vx-ui/foundations/alertDialog'
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarImage,
} from '@/vx-ui/foundations/avatar'
import { Badge } from '@/vx-ui/foundations/Badge'
import { Button } from '@/vx-ui/foundations/button'
import {
    Card,
} from '@/vx-ui/foundations/card'
import { Checkbox } from '@/vx-ui/foundations/checkbox'
import {
    DropdownMenu,
} from '@/vx-ui/foundations/dropdownMenu'
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/vx-ui/foundations/empty'
import { Input } from '@/vx-ui/foundations/input'
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from '@/vx-ui/foundations/input-group'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from '@/vx-ui/foundations/item'
import { Label } from '@/vx-ui/foundations/label'
import {
    Popover,
} from '@/vx-ui/foundations/popover'
import {
    RadioGroup,
    RadioGroupItem,
} from '@/vx-ui/foundations/radio-group'
import {
    Select,
} from '@/vx-ui/foundations/select'
import { Separator } from '@/vx-ui/foundations/separator'
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/vx-ui/foundations/sheet'
import { Slider } from '@/vx-ui/foundations/slider'
import { Dialog, Spinner } from '@/vx-ui/foundations'
import { Switch } from '@/vx-ui/foundations/switch'
import { Textarea } from '@/vx-ui/foundations/textarea'
import {
    Tooltip,
} from '@/vx-ui/foundations/Tooltip'
import { SystemIcons } from "@/vx-ui/icons"
import { Field } from "@/vx-ui/foundations/fieldLayout"
import { ButtonGroup } from "@/vx-ui/foundations/button-group"
import { DialogSDK } from "@/vx-ui/SDKs/DialogSDK"

export default function CoverExample() {
    return (
        <div className="max-h-full overflow-y-auto">
            <ExampleWrapper>
                <ObservabilityCard />
                <SmallFormExample />
                <FormExample />
                <FieldExamples />
                <ItemExample />
                <ButtonGroupExamples />
                <EmptyAvatarGroup />
                <InputGroupExamples />
                <SheetExample />
                <BadgeExamples />
            </ExampleWrapper>
        </div>
    )
}




function FieldExamples() {
    const [gpuCount, setGpuCount] = React.useState(8)
    const [value, setValue] = useState([200, 800])
    const handleGpuAdjustment = React.useCallback((adjustment: number) => {
        setGpuCount((prevCount) =>
            Math.max(1, Math.min(99, prevCount + adjustment))
        )
    }, [])

    const handleGpuInputChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(e.target.value, 10)
            if (!isNaN(value) && value >= 1 && value <= 99) {
                setGpuCount(value)
            }
        },
        []
    )

    return (
        <Example title="Fields">
            <Field.Set className="w-full max-w-md">
                <Field.Group>
                    <Field.Set>
                        <Field.Legend>Compute Environment</Field.Legend>
                        <Field.Description>
                            Select the compute environment for your cluster.
                        </Field.Description>
                        <RadioGroup defaultValue="kubernetes">
                            <Field.Label htmlFor="kubernetes-r2h">
                                <Field.Root orientation="horizontal">
                                    <Field.Content>
                                        <Field.Title>Kubernetes</Field.Title>
                                        <Field.Description>
                                            Run GPU workloads on a K8s configured cluster. This is the
                                            default.
                                        </Field.Description>
                                    </Field.Content>
                                    <RadioGroupItem
                                        value="kubernetes"
                                        id="kubernetes-r2h"
                                        aria-label="Kubernetes"
                                    />
                                </Field.Root>
                            </Field.Label>
                            <Field.Label htmlFor="vm-z4k">
                                <Field.Root orientation="horizontal">
                                    <Field.Content>
                                        <Field.Title>Virtual Machine</Field.Title>
                                        <Field.Description>
                                            Access a VM configured cluster to run workloads. (Coming
                                            soon)
                                        </Field.Description>
                                    </Field.Content>
                                    <RadioGroupItem
                                        value="vm"
                                        id="vm-z4k"
                                        aria-label="Virtual Machine"
                                    />
                                </Field.Root>
                            </Field.Label>
                        </RadioGroup>
                    </Field.Set>
                    <Field.Separator />
                    <Field.Root orientation="horizontal">
                        <Field.Content>
                            <Field.Label htmlFor="number-of-gpus-f6l">
                                Number of GPUs
                            </Field.Label>
                            <Field.Description>You can add more later.</Field.Description>
                        </Field.Content>
                        <ButtonGroup>
                            <Input
                                id="number-of-gpus-f6l"
                                value={gpuCount}
                                onChange={handleGpuInputChange}
                                size={3}
                                maxLength={3}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                aria-label="Decrement"
                                onClick={() => handleGpuAdjustment(-1)}
                                disabled={gpuCount <= 1}
                            >
                                <SystemIcons.Minus
                                />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                aria-label="Increment"
                                onClick={() => handleGpuAdjustment(1)}
                                disabled={gpuCount >= 99}
                            >
                                <SystemIcons.Plus
                                />
                            </Button>
                        </ButtonGroup>
                    </Field.Root>
                    <Field.Separator />
                    <Field.Root orientation="horizontal">
                        <Field.Content>
                            <Field.Label htmlFor="tinting">Wallpaper Tinting</Field.Label>
                            <Field.Description>
                                Allow the wallpaper to be tinted.
                            </Field.Description>
                        </Field.Content>
                        <Switch id="tinting" defaultChecked />
                    </Field.Root>
                    <Field.Separator />
                    <Field.Label htmlFor="checkbox-demo">
                        <Field.Root orientation="horizontal">
                            <Checkbox id="checkbox-demo" defaultChecked />
                            <Field.Label htmlFor="checkbox-demo" className="line-clamp-1">
                                I agree to the terms and conditions
                            </Field.Label>
                        </Field.Root>
                    </Field.Label>
                    <Field.Separator />
                    <Field.Root>
                        <Field.Title>Price Range</Field.Title>
                        <Field.Description>
                            Set your budget range ($
                            <span className="font-medium tabular-nums">
                                {value[0]}
                            </span> -{" "}
                            <span className="font-medium tabular-nums">{value[1]}</span>).
                        </Field.Description>
                        <Slider
                            value={value}
                            onValueChange={(val) => setValue(val as number[])}
                            max={1000}
                            min={0}
                            step={10}
                            className="mt-2 w-full"
                            aria-label="Price Range"
                        />
                    </Field.Root>
                    <Field.Root orientation="horizontal">
                        <Button type="submit">Submit</Button>
                        <Button variant="outline" type="button">
                            Cancel
                        </Button>
                    </Field.Root>
                </Field.Group>
            </Field.Set>
        </Example>
    )
}






function ButtonGroupExamples() {
    const [label, setLabel] = React.useState("personal")

    return (
        <Example title="Button Group" className="items-center justify-center">
            <div className="flex flex-col gap-6">
                <ButtonGroup>
                    <ButtonGroup className="hidden sm:flex">
                        <Button variant="outline" size="icon-sm" aria-label="Go Back">
                            <SystemIcons.ArrowLeft />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="sm">
                            Archive
                        </Button>
                        <Button variant="outline" size="sm">
                            Report
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="sm">
                            Snooze
                        </Button>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    aria-label="More Options"
                                >
                                    <SystemIcons.ChevronDown />
                                </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end" className="w-48">
                                <DropdownMenu.Group>
                                    <DropdownMenu.Item>
                                        <SystemIcons.MailCheck />
                                        Mark as Read
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <SystemIcons.Archive />
                                        Archive
                                    </DropdownMenu.Item>
                                </DropdownMenu.Group>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    <DropdownMenu.Item>
                                        <SystemIcons.Clock
                                        />
                                        Snooze
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <SystemIcons.CalendarPlus
                                        />
                                        Add to Calendar
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <SystemIcons.Filter />
                                        Add to List
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Sub>
                                        <DropdownMenu.SubTrigger>
                                            <SystemIcons.Tag
                                            />
                                            Label As...
                                        </DropdownMenu.SubTrigger>
                                        <DropdownMenu.SubContent>
                                            <DropdownMenu.RadioGroup
                                                value={label}
                                                onValueChange={setLabel}
                                            >
                                                <DropdownMenu.RadioItem value="personal">
                                                    Personal
                                                </DropdownMenu.RadioItem>
                                                <DropdownMenu.RadioItem value="work">
                                                    Work
                                                </DropdownMenu.RadioItem>
                                                <DropdownMenu.RadioItem value="other">
                                                    Other
                                                </DropdownMenu.RadioItem>
                                            </DropdownMenu.RadioGroup>
                                        </DropdownMenu.SubContent>
                                    </DropdownMenu.Sub>
                                </DropdownMenu.Group>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    <DropdownMenu.Item variant="destructive">
                                        <SystemIcons.Trash2 />
                                        Trash
                                    </DropdownMenu.Item>
                                </DropdownMenu.Group>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </ButtonGroup>
                    <ButtonGroup className="hidden sm:flex">
                        <Button variant="outline" size="icon-sm" aria-label="Previous">
                            <SystemIcons.ArrowLeft
                            />
                        </Button>
                        <Button variant="outline" size="icon-sm" aria-label="Next">
                            <SystemIcons.ArrowRight />
                        </Button>
                    </ButtonGroup>
                </ButtonGroup>
                <div className="flex gap-4">
                    <ButtonGroup className="hidden sm:flex">
                        <ButtonGroup>
                            <Button variant="outline">1</Button>
                            <Button variant="outline">2</Button>
                            <Button variant="outline">3</Button>
                        </ButtonGroup>
                    </ButtonGroup>
                    <ButtonGroup>
                        <ButtonGroup>
                            <Button variant="outline">Follow</Button>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <Button variant="outline" size="icon">
                                        <SystemIcons.ChevronDown
                                        />
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content align="end" className="w-52">
                                    <DropdownMenu.Group>
                                        <DropdownMenu.Label>Quick Actions</DropdownMenu.Label>
                                        <DropdownMenu.Item>
                                            <SystemIcons.VolumeX
                                            />
                                            Mute Conversation
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item>
                                            <SystemIcons.Check
                                            />
                                            Mark as Read
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item>
                                            <SystemIcons.UserRoundX
                                            />
                                            Block User
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Group>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Group>
                                        <DropdownMenu.Label>Conversation</DropdownMenu.Label>
                                        <DropdownMenu.Item>
                                            <SystemIcons.Share />
                                            Share Conversation
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item>
                                            <SystemIcons.Copy />
                                            Copy Conversation
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item>
                                            <SystemIcons.AlertTriangle
                                            />
                                            Report Conversation
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Group>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Group>
                                        <DropdownMenu.Item variant="destructive">
                                            <SystemIcons.Trash
                                            />
                                            Delete Conversation
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Group>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Button variant="outline">
                                <SystemIcons.Bot
                                />{" "}
                                Copilot
                            </Button>
                            <Popover.Root>
                                <Popover.Trigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Open Popover"
                                    >
                                        <SystemIcons.ChevronDown
                                        />
                                    </Button>
                                </Popover.Trigger>
                                <Popover.Content align="end" className="w-96">
                                    <div className="space-y-1.5 px-4 py-2">
                                        <div className="font-semibold leading-none tracking-tight text-sm">Agent Tasks</div>
                                        <div className="text-muted-foreground text-xs">
                                            Describe your task in natural language. Copilot will work
                                            in the background and open a pull request.
                                        </div>
                                    </div>
                                    <div className="text-sm *:[p:not(:last-child)]:mb-2">
                                        <Textarea
                                            placeholder="Describe your task in natural language."
                                            className="min-h-32 resize-none"
                                        />
                                    </div>
                                </Popover.Content>
                            </Popover.Root>
                        </ButtonGroup>
                    </ButtonGroup>
                </div>
            </div>
        </Example>
    )
}



function InputGroupExamples() {
    const [isFavorite, setIsFavorite] = React.useState(false)
    const [voiceEnabled, setVoiceEnabled] = React.useState(false)

    return (
        <Example title="Input Group">
            <div className="flex flex-col gap-6">
                <InputGroup>
                    <InputGroupInput placeholder="Search..." />
                    <InputGroupAddon>
                        <SystemIcons.Search />
                    </InputGroupAddon>
                    <InputGroupAddon className=" text-nowrap!" align="inline-end">12 results</InputGroupAddon>
                </InputGroup>
                <InputGroup>
                    <InputGroupInput placeholder="example.com" className="!pl-1" />
                    <InputGroupAddon>
                        <InputGroupText>https://</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <InputGroupButton
                                    className="rounded-full"
                                    size="icon-xs"
                                    aria-label="Info"
                                >
                                    <SystemIcons.Info
                                    />
                                </InputGroupButton>
                            </Tooltip.Trigger>
                            <Tooltip.Content>This is content in a tooltip.</Tooltip.Content>
                        </Tooltip.Root>
                    </InputGroupAddon>
                </InputGroup>
                <Field.Root>
                    <Label htmlFor="input-secure-19" className="sr-only">
                        Input Secure
                    </Label>
                    <InputGroup>
                        <InputGroupInput id="input-secure-19" className="!pl-0.5" />
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <InputGroupAddon>
                                    <InputGroupButton
                                        variant="secondary"
                                        size="icon-xs"
                                        aria-label="Info"
                                    >
                                        <SystemIcons.Info
                                        />
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </Popover.Trigger>
                            <Popover.Content
                                align="start"
                                alignOffset={10}
                                className="flex flex-col gap-1 rounded-xl text-sm"
                            >
                                <p className="font-medium">Your connection is not secure.</p>
                                <p>
                                    You should not enter any sensitive information on this site.
                                </p>
                            </Popover.Content>
                        </Popover.Root>
                        <InputGroupAddon className="text-muted-foreground !pl-1">
                            https://
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                onClick={() => setIsFavorite(!isFavorite)}
                                size="icon-xs"
                                aria-label="Favorite"
                            >
                                <SystemIcons.Star data-favorite={isFavorite} className="data-[favorite=true]:fill-primary data-[favorite=true]:stroke-primary" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </Field.Root>
                <ButtonGroup className="w-full">
                    <ButtonGroup>
                        <Button className="rounded-full" variant="outline" size="icon" aria-label="Add">
                            <SystemIcons.Plus
                            />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup className="flex-1">
                        <InputGroup>
                            <InputGroupInput
                                placeholder={
                                    voiceEnabled
                                        ? "Record and send audio..."
                                        : "Send a message..."
                                }
                                disabled={voiceEnabled}
                            />
                            <InputGroupAddon align="inline-end">
                                <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                        <InputGroupButton
                                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                                            data-active={voiceEnabled}
                                            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                                            aria-pressed={voiceEnabled}
                                            size="icon-xs"
                                            aria-label="Voice Mode"
                                        >
                                            <SystemIcons.Audio
                                            />
                                        </InputGroupButton>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Voice Mode</Tooltip.Content>
                                </Tooltip.Root>
                            </InputGroupAddon>
                        </InputGroup>
                    </ButtonGroup>
                </ButtonGroup>
                <InputGroup>
                    <InputGroupTextarea placeholder="Ask, Search or Chat..." />
                    <InputGroupAddon align="block-end">
                        <InputGroupButton
                            variant="default"
                            className="style-lyra:rounded-none rounded-full"
                            size="icon-xs"
                            aria-label="Add"
                        >
                            <SystemIcons.Plus
                            />
                        </InputGroupButton>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <InputGroupButton variant="ghost">Auto</InputGroupButton>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content
                                side="top"
                                align="start"
                                className="[--radius:0.95rem]"
                            >
                                <DropdownMenu.Item>Auto</DropdownMenu.Item>
                                <DropdownMenu.Item>Agent</DropdownMenu.Item>
                                <DropdownMenu.Item>Manual</DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                        <InputGroupText className="ml-auto">52% used</InputGroupText>
                        <Separator orientation="vertical" className="h-4!" />
                        <InputGroupButton
                            variant="default"
                            className="style-lyra:rounded-none rounded-full"
                            size="icon-xs"
                        >
                            <SystemIcons.ArrowUp
                            />
                            <span className="sr-only">Send</span>
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </Example>
    )
}






function EmptyAvatarGroup() {
    return (
        <Example title="Empty">
            <Empty className="h-full flex-none border">
                <EmptyHeader>
                    <EmptyMedia>
                        <AvatarGroup className="grayscale">
                            <Avatar size="lg">
                                <AvatarImage
                                    src="https://github.com/shadcn.png"
                                    alt="@shadcn"
                                />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <Avatar size="lg">
                                <AvatarImage
                                    src="https://github.com/maxleiter.png"
                                    alt="@maxleiter"
                                />
                                <AvatarFallback>LR</AvatarFallback>
                            </Avatar>
                            <Avatar size="lg">
                                <AvatarImage
                                    src="https://github.com/evilrabbit.png"
                                    alt="@evilrabbit"
                                />
                                <AvatarFallback>ER</AvatarFallback>
                            </Avatar>
                        </AvatarGroup>
                    </EmptyMedia>
                    <EmptyTitle>No Team Members</EmptyTitle>
                    <EmptyDescription>
                        Invite your team to collaborate on this project.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex gap-2">
                        <Button variant="outline"
                            onClick={() => {
                                DialogSDK.actions.push("showDialog", (props) => (
                                    <DialogSDK.Template {...props}>
                                        <Dialog.Header>
                                            <Dialog.Title>Are you absolutely sure?</Dialog.Title>
                                            <Dialog.Description>
                                                This action cannot be undone. This will permanently delete
                                                your account and remove your data from our servers.
                                            </Dialog.Description>
                                        </Dialog.Header>
                                        <Dialog.Footer>
                                            <Dialog.Close>Cancel</Dialog.Close>
                                        </Dialog.Footer>
                                    </DialogSDK.Template>
                                ))
                            }}
                        >
                            Show Dialog
                        </Button>
           
                        <Button 
                            variant="outline"
                            onClick={() => {
                                DialogSDK.actions.push("contectMouse", (props) => (
                                    <DialogSDK.AlertTemplate type="danger" {...props}>
                                        <AlertDialog.Header>
                                            <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                                            <AlertDialog.Description>
                                                This action cannot be undone. This will permanently delete
                                                your account and remove your data from our servers.
                                            </AlertDialog.Description>
                                        </AlertDialog.Header>
                                        <AlertDialog.Footer>
                                            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                            <AlertDialog.Action>Continue</AlertDialog.Action>
                                        </AlertDialog.Footer>
                                    </DialogSDK.AlertTemplate>
                                ))
                            }}
                        >
                            Connect Mouse
                        </Button>
                     
                    </div>
                </EmptyContent>
            </Empty>
        </Example>
    )
}

function FormExample() {
    return (
        <Example title="Complex Form">
            <Card.Root className="w-full max-w-md">
                <Card.Header>
                    <Card.Title>Payment Method</Card.Title>
                    <Card.Description>
                        All transactions are secure and encrypted
                    </Card.Description>
                </Card.Header>
                <Card.Content>
                    <form>
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <fieldset className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="checkout-7j9-card-name-43j">
                                                Name on Card
                                            </Label>
                                            <Input
                                                id="checkout-7j9-card-name-43j"
                                                placeholder="John Doe"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <Label htmlFor="checkout-7j9-card-number-uw1">
                                                    Card Number
                                                </Label>
                                                <Input
                                                    id="checkout-7j9-card-number-uw1"
                                                    placeholder="1234 5678 9012 3456"
                                                    required
                                                />
                                                <p className="text-sm text-muted-foreground">
                                                    Enter your 16-digit number.
                                                </p>
                                            </div>
                                            <div className="col-span-1 space-y-2">
                                                <Label htmlFor="checkout-7j9-cvv">CVV</Label>
                                                <Input id="checkout-7j9-cvv" placeholder="123" required />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="checkout-7j9-exp-month-ts6">
                                                    Month
                                                </Label>
                                                <Select.Root defaultValue="">
                                                    <Select.Trigger id="checkout-7j9-exp-month-ts6">
                                                        <Select.Value placeholder="MM" />
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Group>
                                                            <Select.Item value="01">01</Select.Item>
                                                            <Select.Item value="02">02</Select.Item>
                                                            <Select.Item value="03">03</Select.Item>
                                                            <Select.Item value="04">04</Select.Item>
                                                            <Select.Item value="05">05</Select.Item>
                                                            <Select.Item value="06">06</Select.Item>
                                                            <Select.Item value="07">07</Select.Item>
                                                            <Select.Item value="08">08</Select.Item>
                                                            <Select.Item value="09">09</Select.Item>
                                                            <Select.Item value="10">10</Select.Item>
                                                            <Select.Item value="11">11</Select.Item>
                                                            <Select.Item value="12">12</Select.Item>
                                                        </Select.Group>
                                                    </Select.Content>
                                                </Select.Root>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="checkout-7j9-exp-year-f59">
                                                    Year
                                                </Label>
                                                <Select.Root defaultValue="">
                                                    <Select.Trigger id="checkout-7j9-exp-year-f59">
                                                        <Select.Value placeholder="YYYY" />
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        <Select.Group>
                                                            <Select.Item value="2024">2024</Select.Item>
                                                            <Select.Item value="2025">2025</Select.Item>
                                                            <Select.Item value="2026">2026</Select.Item>
                                                            <Select.Item value="2027">2027</Select.Item>
                                                            <Select.Item value="2028">2028</Select.Item>
                                                            <Select.Item value="2029">2029</Select.Item>
                                                        </Select.Group>
                                                    </Select.Content>
                                                </Select.Root>
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                            <Separator />
                            <fieldset className="space-y-4">
                                <legend className="text-sm font-medium">Billing Address</legend>
                                <p className="text-sm text-muted-foreground">
                                    The billing address associated with your payment.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <Checkbox
                                            id="checkout-7j9-same-as-shipping-wgm"
                                            defaultChecked
                                        />
                                        <Label
                                            htmlFor="checkout-7j9-same-as-shipping-wgm"
                                            className="font-normal"
                                        >
                                            Same as shipping address
                                        </Label>
                                    </div>
                                </div>
                            </fieldset>
                            <Separator />
                            <fieldset className="space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="checkout-7j9-optional-comments">
                                            Comments
                                        </Label>
                                        <Textarea
                                            id="checkout-7j9-optional-comments"
                                            placeholder="Add any additional comments"
                                        />
                                    </div>
                                </div>
                            </fieldset>
                            <div className="flex items-center justify-between gap-4">
                                <Button type="submit">Submit</Button>
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>
        </Example>
    )
}

const frameworks = [
    "Next.js",
    "SvelteKit",
    "Nuxt.js",
    "Remix",
    "Astro",
] as const

function SmallFormExample() {
    const [notifications, setNotifications] = React.useState({
        email: true,
        sms: false,
        push: true,
    })
    const [theme, setTheme] = React.useState("light")

    return (
        <Example title="Form">
            <Card.Root className="w-full max-w-md">
                <Card.Header>
                    <Card.Title>User Information</Card.Title>
                    <Card.Description>Please fill in your details below</Card.Description>
                    <Card.Action>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <Button variant="ghost" size="icon">
                                    <SystemIcons.MoveVertical
                                    />
                                    <span className="sr-only">More options</span>
                                </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content
                                align="end"
                                className="style-maia:w-56 style-mira:w-48 style-nova:w-48 style-vega:w-56 style-lyra:w-48"
                            >
                                <DropdownMenu.Group>
                                    <DropdownMenu.Label>File</DropdownMenu.Label>
                                    <DropdownMenu.Item>
                                        <SystemIcons.File
                                        />
                                        New File
                                        <DropdownMenu.Shortcut>⌘N</DropdownMenu.Shortcut>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <SystemIcons.Folder
                                        />
                                        New Folder
                                        <DropdownMenu.Shortcut>⇧⌘N</DropdownMenu.Shortcut>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Sub>
                                        <DropdownMenu.SubTrigger>
                                            <SystemIcons.FolderOpen
                                            />
                                            Open Recent
                                        </DropdownMenu.SubTrigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.SubContent>
                                                <DropdownMenu.Group>
                                                    <DropdownMenu.Label>Recent Projects</DropdownMenu.Label>
                                                    <DropdownMenu.Item>
                                                        <SystemIcons.FileCode
                                                        />
                                                        Project Alpha
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Item>
                                                        <SystemIcons.FileCode
                                                        />
                                                        Project Beta
                                                    </DropdownMenu.Item>
                                                    <DropdownMenu.Sub>
                                                        <DropdownMenu.SubTrigger>
                                                            <SystemIcons.MoveHorizontal
                                                            />
                                                            More Projects
                                                        </DropdownMenu.SubTrigger>
                                                        <DropdownMenu.Portal>
                                                            <DropdownMenu.SubContent>
                                                                <DropdownMenu.Item>
                                                                    <SystemIcons.FileCode
                                                                    />
                                                                    Project Gamma
                                                                </DropdownMenu.Item>
                                                                <DropdownMenu.Item>
                                                                    <SystemIcons.FileCode
                                                                    />
                                                                    Project Delta
                                                                </DropdownMenu.Item>
                                                            </DropdownMenu.SubContent>
                                                        </DropdownMenu.Portal>
                                                    </DropdownMenu.Sub>
                                                </DropdownMenu.Group>
                                                <DropdownMenu.Separator />
                                                <DropdownMenu.Group>
                                                    <DropdownMenu.Item>
                                                        <SystemIcons.FolderSearch
                                                        />
                                                        Browse...
                                                    </DropdownMenu.Item>
                                                </DropdownMenu.Group>
                                            </DropdownMenu.SubContent>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Sub>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Item>
                                        <SystemIcons.Save
                                        />
                                        Save
                                        <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <SystemIcons.Download
                                        />
                                        Export
                                        <DropdownMenu.Shortcut>⇧⌘E</DropdownMenu.Shortcut>
                                    </DropdownMenu.Item>
                                </DropdownMenu.Group>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    <DropdownMenu.Label>View</DropdownMenu.Label>
                                    <DropdownMenu.CheckboxItem
                                        checked={notifications.email}
                                        onCheckedChange={(checked) =>
                                            setNotifications({
                                                ...notifications,
                                                email: checked === true,
                                            })
                                        }
                                    >
                                        <SystemIcons.Eye
                                        />
                                        Show Sidebar
                                    </DropdownMenu.CheckboxItem>
                                    <DropdownMenu.CheckboxItem
                                        checked={notifications.sms}
                                        onCheckedChange={(checked) =>
                                            setNotifications({
                                                ...notifications,
                                                sms: checked === true,
                                            })
                                        }
                                    >
                                        <SystemIcons.Layers
                                        />
                                        Show Status Bar
                                    </DropdownMenu.CheckboxItem>
                                    <DropdownMenu.Sub>
                                        <DropdownMenu.SubTrigger>
                                            <SystemIcons.Pallet
                                            />
                                            Theme
                                        </DropdownMenu.SubTrigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.SubContent>
                                                <DropdownMenu.Group>
                                                    <DropdownMenu.Label>Appearance</DropdownMenu.Label>
                                                    <DropdownMenu.RadioGroup
                                                        value={theme}
                                                        onValueChange={setTheme}
                                                    >
                                                        <DropdownMenu.RadioItem value="light">
                                                            <SystemIcons.Sun
                                                            />
                                                            Light
                                                        </DropdownMenu.RadioItem>
                                                        <DropdownMenu.RadioItem value="dark">
                                                            <SystemIcons.Moon
                                                            />
                                                            Dark
                                                        </DropdownMenu.RadioItem>
                                                        <DropdownMenu.RadioItem value="system">
                                                            <SystemIcons.Monitor
                                                            />
                                                            System
                                                        </DropdownMenu.RadioItem>
                                                    </DropdownMenu.RadioGroup>
                                                </DropdownMenu.Group>
                                            </DropdownMenu.SubContent>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Sub>
                                </DropdownMenu.Group>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    <DropdownMenu.Item>
                                        <SystemIcons.Info
                                        />
                                        Help & Support
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <SystemIcons.FileText
                                        />
                                        Documentation
                                    </DropdownMenu.Item>
                                </DropdownMenu.Group>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    <DropdownMenu.Item variant="destructive">
                                        <SystemIcons.Logout
                                        />
                                        Sign Out
                                        <DropdownMenu.Shortcut>⇧⌘Q</DropdownMenu.Shortcut>
                                    </DropdownMenu.Item>
                                </DropdownMenu.Group>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </Card.Action>
                </Card.Header>
                <Card.Content>
                    <form>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="small-form-name">Name</Label>
                                    <Input
                                        id="small-form-name"
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="small-form-role">Role</Label>
                                    <Select.Root defaultValue="">
                                        <Select.Trigger id="small-form-role">
                                            <Select.Value placeholder="Select a role" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            <Select.Group>
                                                <Select.Item value="developer">Developer</Select.Item>
                                                <Select.Item value="designer">Designer</Select.Item>
                                                <Select.Item value="manager">Manager</Select.Item>
                                                <Select.Item value="other">Other</Select.Item>
                                            </Select.Group>
                                        </Select.Content>
                                    </Select.Root>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="small-form-framework">
                                    Framework
                                </Label>
                                <Select.Root>
                                    <Select.Trigger id="small-form-framework">
                                        <Select.Value placeholder="Select a framework" />
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Group>
                                            {frameworks.map((framework) => (
                                                <Select.Item key={framework} value={framework.toLowerCase()}>
                                                    {framework}
                                                </Select.Item>
                                            ))}
                                        </Select.Group>
                                    </Select.Content>
                                </Select.Root>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="small-form-comments">Comments</Label>
                                <Textarea
                                    id="small-form-comments"
                                    placeholder="Add any additional comments"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Button type="submit">Submit</Button>
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card.Content>
            </Card.Root>
        </Example>
    )
}

function ObservabilityCard() {
    return (
        <Example title="Card" className="items-center justify-center">
            <Card.Root className="relative w-full max-w-sm overflow-hidden pt-0">
                <div className="bg-primary absolute inset-0 z-30 aspect-video opacity-50 mix-blend-color" />
                <img
                    src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Photo by mymind on Unsplash"
                    title="Photo by mymind on Unsplash"
                    className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
                />
                <Card.Header>
                    <Card.Title>Observability Plus is replacing Monitoring</Card.Title>
                    <Card.Description>
                        Switch to the improved way to explore your data, with natural
                        language. Monitoring will no longer be available on the Pro plan in
                        November, 2025
                    </Card.Description>
                </Card.Header>
                <Card.Footer>
                    <Button>
                        Create Query{" "}
                        <SystemIcons.Plus data-icon="inline-end" />
                    </Button>
                    <Badge variant="secondary" className="ml-auto">
                        Warning
                    </Badge>
                </Card.Footer>
            </Card.Root>
        </Example>
    )
}

function FieldSlider() {
    const [value, setValue] = useState([200, 800])
    return (
        <Example title="Field Slider">
            <div className="w-full max-w-md">
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Price Range</h4>
                    <p className="text-sm text-muted-foreground">
                        Set your budget range ($
                        <span className="font-medium tabular-nums">{value[0]}</span> -{" "}
                        <span className="font-medium tabular-nums">{value[1]}</span>).
                    </p>
                    <Slider
                        value={value}
                        onValueChange={setValue}
                        max={1000}
                        min={0}
                        step={10}
                        className="mt-2 w-full"
                        aria-label="Price Range"
                    />
                </div>
            </div>
        </Example>
    )
}




function ItemExample() {
    return (
        <Example title="Item">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Item variant="outline">
                    <ItemContent>
                        <ItemTitle>Two-factor authentication</ItemTitle>
                        <ItemDescription className="text-pretty xl:hidden 2xl:block">
                            Verify via email or phone number.
                        </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                        <Button size="sm" variant="secondary">
                            Enable
                        </Button>
                    </ItemActions>
                </Item>
                <Item variant="outline" size="sm" asChild>
                    <a href="#">
                        <ItemMedia variant="icon">
                            <SystemIcons.ShoppingBag
                            />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>Your order has been shipped.</ItemTitle>
                        </ItemContent>
                    </a>
                </Item>
            </div>
        </Example>
    )
}



function BadgeExamples() {
    return (
        <Example title="Badge" className="items-center justify-center">
            <div className="flex items-center justify-center gap-2">
                <Badge>
                    <Spinner data-icon="inline-start" />
                    Syncing
                </Badge>
                <Badge variant="secondary">
                    <Spinner data-icon="inline-start" />
                    Updating
                </Badge>
                <Badge variant="outline">
                    <Spinner data-icon="inline-start" />
                    Loading
                </Badge>
                <Badge variant="link" className="hidden sm:flex">
                    <Spinner data-icon="inline-start" />
                    Link
                </Badge>
            </div>
        </Example>
    )
}

function EmptyWithSpinner() {
    return (
        <Example title="Empty with Spinner">
            <Empty className="w-full border">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Spinner />
                    </EmptyMedia>
                    <EmptyTitle>Processing your request</EmptyTitle>
                    <EmptyDescription>
                        Please wait while we process your request. Do not refresh the page.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex gap-2">
                        <Button size="sm">Submit</Button>
                        <Button variant="default" size="sm">
                            Cancel
                        </Button>
                    </div>
                </EmptyContent>
            </Empty>
        </Example>
    )
}

const SHEET_SIDES = ["top", "right", "bottom", "left"] as const

function SheetExample() {
    return (
        <Example title="Sheet">
            <div className="flex gap-2">
                {SHEET_SIDES.map((side) => (
                    <Sheet key={side}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="flex-1 capitalize">
                                {side}
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side={side}
                            className="data-[side=bottom]:max-h-[50vh] data-[side=top]:max-h-[50vh]"
                        >
                            <SheetHeader>
                                <SheetTitle>Edit profile</SheetTitle>
                                <SheetDescription>
                                    Make changes to your profile here. Click save when you&apos;re
                                    done.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="overflow-y-auto px-4 text-sm">
                                {Array.from({ length: 10 }).map((_, index) => (
                                    <p
                                        key={index}
                                        className="mb-4 leading-normal"
                                    >
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                                        do eiusmod tempor incididunt ut labore et dolore magna
                                        aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                                        ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                        Duis aute irure dolor in reprehenderit in voluptate velit
                                        esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
                                        occaecat cupidatat non proident, sunt in culpa qui officia
                                        deserunt mollit anim id est laborum.
                                    </p>
                                ))}
                            </div>
                            <SheetFooter>
                                <Button type="submit">Save changes</Button>
                                <SheetClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                ))}
            </div>
        </Example>
    )
}
