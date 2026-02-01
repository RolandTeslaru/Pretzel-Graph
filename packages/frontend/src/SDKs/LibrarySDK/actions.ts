import { supabase } from '@/libs/supabase';
import type { LibrarySDKImpl } from './sdk';

export function _createLibraryActions_(sdk: LibrarySDKImpl) {
    return {
        project: {
            create: async () => {
                
            },
            delete: async () => {

            }
        },
        workflow: {
            create: async () => {

            },
            delete: async () => {

            }
        },
        folder: {
            create: async () => {

            },
            delete: async () => {

            }
        }
        
    }
}

export type _LibrarySDKActions = {
    
}
