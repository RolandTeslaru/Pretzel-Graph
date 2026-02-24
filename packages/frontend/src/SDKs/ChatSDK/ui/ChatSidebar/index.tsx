import { motion } from 'motion/react'
import React from 'react'
import PromptInput from './PromptInput'
import MessagesArea from './MessagesArea'

const ChatSidebar = () => {
    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
                overflow-hidden
                fixed flex flex-col z-20 right-5 top-24 bottom-24 w-87.5 bg-card/80 backdrop-blur-lg 
                border border-border rounded-2xl shadow-lg dark:shadow-black/30 light:shadow-black/10
            `}
        >
            <MessagesArea/>
            <PromptInput/>
        </motion.div>
    )
}

export default ChatSidebar