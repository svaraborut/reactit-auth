import { ReactNode } from 'react';
import { useIsAuthenticated } from './hooks';

export interface AuthGuardProps {
    showAuth?: boolean
    showUnAuth?: boolean
    children: ReactNode
}

/**
 * A simple guard component to conditionally render the content
 * in relation to the authentication state.
 */
export function AuthGuard({ showAuth = true, showUnAuth, children }: AuthGuardProps) {
    const auth = useIsAuthenticated();
    return (
        <>
            {(auth && showAuth || !auth && showUnAuth) ? children : undefined}
        </>
    )
}
