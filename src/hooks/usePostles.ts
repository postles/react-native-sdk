import { useContext } from 'react'
import { PostlesContext } from '../components/PostlesProvider'
import type { Postles } from '../Postles'

/**
 * Access the Postles SDK instance from within a PostlesProvider.
 *
 * @throws If used outside of a PostlesProvider
 */
export function usePostles(): Postles {
    const instance = useContext(PostlesContext)
    if (!instance) {
        throw new Error(
            'usePostles must be used within a <PostlesProvider>. ' +
            'Make sure your component is wrapped in <PostlesProvider>.'
        )
    }
    return instance
}
