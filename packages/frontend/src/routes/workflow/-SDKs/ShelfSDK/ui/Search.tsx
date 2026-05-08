import { Button, Input, Popover } from '@pretzel-graph/standard-ui/foundations'
import React, { useMemo, useEffect, useState } from 'react'
import { ShelfSDK } from '../sdk';
import { debounce } from 'lodash';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';


const Search = () => {

    const searchQuery = ShelfSDK.useStore(s => s.searchFilter.query);
    const [localValue, setLocalValue] = useState(searchQuery ?? '');

    const debouncedSetQuery = useMemo(
        () => debounce((value: string) => {
            ShelfSDK.actions.searchFilter.setQuery(value);
        }, 300),
        []
    );

    useEffect(() => {
        return () => {
            debouncedSetQuery.cancel();
        };
    }, [debouncedSetQuery]);

    useEffect(() => {
        setLocalValue(searchQuery ?? '');
    }, [searchQuery]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.currentTarget.value;
        setLocalValue(newValue); // Update immediately for responsive UI
        debouncedSetQuery(newValue); // Debounce the store update
    };

    return (
        <div className='p-2 relative'>
            <Input
                value={localValue}
                onChange={handleChange}
                className='w-full rounded-xl'
                placeholder='Search for nodes'
            />
            {/* {!localValue &&
                <SystemIcons.Search  className='absolute left-4 top-[15px] h-[18px] w-[18px] text-muted-foreground'/>
            } */}
            <Popover.Root>
                <Popover.Trigger asChild>
                    <Button variant='ghost' size='icon-xs' className='absolute right-3 top-3  rounded-xl text-muted-foreground'>
                        <SystemIcons.Filter/>
                    </Button>
                </Popover.Trigger>
                <Popover.Content side='right' align="start" sideOffset={18} className='w-[200px] mt-[-12px] p-2 bg-popover text-popover-foreground rounded-xl shadow-lg'>
                    <div className='text-sm'>Filter options coming soon!</div>
                </Popover.Content>
            </Popover.Root>
        </div>
    )
}

export default Search


