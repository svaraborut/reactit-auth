import { EffectCallback, useEffect } from 'react';
import { AuthContext } from './types';
import { useAuthContext } from './context';

/**
 * Provide access to all the authentication functionalities
 */

export interface UseAuthReturn<U, SI = any, RF = void, SO = void>
    extends Omit<AuthContext<U, SI, RF, SO>, 'auth' | 'renew'> {

    isAuthenticated: boolean
    isRenewEnabled: boolean

}

export function useAuth<U, SI = any, RF = void, SO = void>(): UseAuthReturn<U, SI, RF, SO> {
    const { auth, renew, ...rest } = useAuthContext<U, SI, RF, SO>()

    return {
        ...rest,
        isAuthenticated: !!auth,
        isRenewEnabled: !!renew,
    }
}

/**
 * Returns true if there is an active authentication ongoing
 */
export function useIsAuthenticated(): boolean {
    return useAuth().isAuthenticated
}

/**
 * Returns the authenticated user (as returned by the last
 * doSignIn or doRenew
 */
export function useAuthUser<U>(): U | undefined {
    return useAuth<U>().user
}

/**
 * Effect called when the authentication state changes due to
 * any reason.
 */
export function useAuthChangeEffect(effect: EffectCallback) {
    const ctx = useAuthContext()
    useEffect(effect, [ctx])
}
