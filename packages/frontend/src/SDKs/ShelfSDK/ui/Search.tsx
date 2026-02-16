import { Input } from '@/vx-ui/foundations'
import React, { useMemo, useEffect, useState } from 'react'
import { ShelfSDK } from '../sdk';
import { debounce } from 'lodash';
import { SystemIcons } from '@/vx-ui/icons';


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
        <div className='px-2'>
            <Input
                value={localValue}
                onChange={handleChange}
                className='w-full rounded-xl'
                placeholder='Search for nodes'
            />
            <SystemIcons.Search  className='absolute right-4 top-[15px] h-[18px] w-[18px] text-muted-foreground'/>
        </div>
    )
}

export default Search
