import React, { createContext, useEffect, useState } from 'react'
import { Postles } from '../Postles'
import type { PostlesConfig } from '../models'

export const PostlesContext = createContext<Postles | null | undefined>(undefined)

interface PostlesProviderProps {
    config: PostlesConfig
    children: React.ReactNode
    onReady?: (instance: Postles) => void
}

export function PostlesProvider({ config, children, onReady }: PostlesProviderProps) {
    const [instance, setInstance] = useState<Postles | null>(null)

    useEffect(() => {
        let cancelled = false

        Postles.create(config).then((inst) => {
            if (!cancelled) {
                setInstance(inst)
                onReady?.(inst)
            }
        })

        return () => {
            cancelled = true
        }
    // Only re-initialize if apiKey or urlEndpoint change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.apiKey, config.urlEndpoint])

    return (
        <PostlesContext.Provider value={instance}>
            {children}
        </PostlesContext.Provider>
    )
}
