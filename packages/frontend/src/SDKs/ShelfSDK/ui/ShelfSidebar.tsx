import React, { useState } from 'react'
import { Button, Input, ScrollArea, Separator } from '@/vx-ui/foundations'
import { Drawers } from './Drawers'
import SectionTabs from './SectionTabs'
import Search from './Search'
import { ShelfSDK } from '../sdk'
import { nodeColorsName } from '@/utils/styleUtils'
import { MigrationScripts } from '@/scripts/migrate'
import { supabase } from '@/libs/supabase'
import { DialogSDK } from '@/vx-ui/SDKs/DialogSDK'
import VaultPanel from '@/SDKs/VaultSDK/ui/VaultPanel'
import { MigrationDialogButton } from '@/scripts/migrationUI'

const ShelfSidebar = () => {
    // Temp Auth
    const [loginEmail, setLoginEmail] = useState("")
    const [loginPass, setLoginPass] = useState("")
    const [user, setUser] = useState<any>(null)

    const handleLogin = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPass
        })
        if (error) alert(error.message)
        else {
            setUser(data.user)
            alert("Logged In! Token is ready.")
        }
    }

    return (
        <div className={`
            flex flex-col gap-2 fixed z-20 left-5 top-24 bottom-24 w-[230px] bg-card/80 backdrop-blur-lg 
            border border-border py-2 rounded-2xl shadow-lg shadow-black/30`}
        >
            <Search />

            <Separator />
            <FilterDataTypesIndicator />

            <ScrollArea.Root className='mb-auto'>
                <Drawers />
            </ScrollArea.Root>

            <Separator />
            <MigrationDialogButton/>

            <div className='p-2 flex flex-col gap-2 border-t border-border'>
                {!user ? (
                    <>
                        <Input className='border p-1 rounded text-xs text-white' placeholder='email' value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                        <Input className='border p-1 rounded text-xs text-white' placeholder='pass' type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                        <Button size="sm" onClick={handleLogin}>Log In</Button>
                    </>
                ) : (
                    <>
                        <Button variant="destructive" onClick={() => MigrationScripts.migrateAllFlows()}>
                            Migrate Workflows ({user.email})
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => MigrationScripts.migrateBlueprints()}>
                            Migrate Blueprints
                        </Button>
                    </>
                )}
            </div>

            <Separator />

            <SectionTabs />
        </div>
    )
}

export default ShelfSidebar

const FilterDataTypesIndicator = () => {
    const dataTypes = ShelfSDK.useStore(s => s.searchFilter.dataTypes);
    if (!dataTypes) return null;
    return (
        <div className='absolute left-1/2 -translate-x-1/2 top-[51px] flex flex-row gap-2'>
            {Array.from(dataTypes).map(type => <TypeIndicator dataType={type} />)}
        </div>
    )
}

const TypeIndicator = ({ dataType }) => {
    const left = true
    const colorName = nodeColorsName[dataType] ?? "unknown";

    const style = {
        backgroundColor: left
            ? `var(--datatype-${colorName})`
            : `var(--datatype-${colorName}-foreground)`,
        color: left
            ? `var(--datatype-${colorName}-foreground)`
            : `var(--datatype-${colorName})`,
    };

    return (
        <div className='content-[" "] h-1 w-4 rounded-full animate-pulse' style={style}
            onClick={() => {
                ShelfSDK.actions.searchFilter.toggleDataType(dataType)
            }}
        />
    )
}
