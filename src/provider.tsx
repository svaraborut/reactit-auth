import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { AuthActionResult, AuthContext, AuthState } from './types';
import {
    useAsyncEffect,
    useLatest,
    usePromise,
    useScheduledEffect,
    useSharedPromise,
    useStorage
} from '@reactit/hooks';
import { coerceExpiration, isTokenBundleValid, Token } from './token';
import { _AuthContext } from './context';
import { StorageTypes } from '@reactit/hooks';

export interface AuthProviderProps<U, SI = any, RF = void, SO = void> {

    authStorage?: StorageTypes
    authPrefix?: string

    // Provide a development token, if present, this will be used and any call to
    // doSignIn, doRefresh, doSignOut will just use this token. When using the dev
    // token the provided prefix will be additionally prefixed with `$dev_` to
    // further isolate this environment and prevent strange behaviours.
    devToken?: string
    // When enabled the devToken will be injected by default, simulating an already
    // authenticated context to ease the development burden.
    devSignedIn?: boolean
    devUser?: U

    // Behaviour
    doSignIn?: (ctx: AuthState<U>, input: SI | undefined) => Promise<AuthActionResult<U>>
    doRenew?: (ctx: AuthState<U>, input: RF | undefined) => Promise<AuthActionResult<U>>
    doSignOut?: (ctx: AuthState<U>, input: SO | undefined) => Promise<void>

    // Side - effects
    onTokenChange?: (ctx: AuthState<U>, token: Token | undefined) => void

    renewOnMount?: boolean

}

/**
 * Authentication provider to wrap the entire application. This
 * component does contain all the behavioural logic for the entire
 * authentication workflow.
 */
export function AuthProvider<U, SI = any, RF = void, SO = void>(
    {
        authStorage = 'sessionStorage',
        authPrefix = 'auth_',
        devToken,
        devSignedIn = false,
        devUser,
        doSignIn,
        doRenew,
        doSignOut,
        onTokenChange,
        renewOnMount = false,
        children,
    }: AuthProviderProps<U, SI, RF, SO> & { children: ReactNode }
) {

    const [state, setState] = useStorage<AuthState<U>>(
        devSignedIn && devToken ? { initialized: true, auth: { token: devToken } } : { initialized: false },
        (devToken ? '$dev_' : '') + authPrefix,
        authStorage,
    )

    const isFirst = useRef(true)

    // Remove invalid tokens when they expire
    useAsyncEffect(async () => {

        const authInv = state.auth && !isTokenBundleValid(state.auth)
        const renewInv = state.renew && !isTokenBundleValid(state.renew)

        // Attempt to renew if auth when invalid. Any opinion has been removed, doRenew is
        // responsible for any validation, including absence or expiration of the renewal token
        if ((isFirst.current && renewOnMount) || !state.auth || authInv) {
            try {
                await renewTokenAsync(undefined)
                return
            } catch (e) {
                // Invalidate normally
            }
        }

        if (isFirst.current || authInv || renewInv) {
            setState({
                ...state,
                initialized: true,
                auth: authInv ? undefined : state.auth,
                renew: renewInv ? undefined : state.renew,
            })
        }

        isFirst.current = false
    }, [state])

    // Autonomous expiration of auth token
    const taskSchedulePromise = usePromise(async () => {
        // doing this action here, prevents an extra state transition
        // through the UN-AUTH state
        try {
            await renewTokenAsync(undefined)
        } catch (e) {
            setState({ ...state, auth: undefined })
        }
    })
    useScheduledEffect(taskSchedulePromise, state.auth?.expiresAt)

    // Autonomous expiration of renew token
    useScheduledEffect(() => {
        setState({ ...state, renew: undefined })
    }, state.renew?.expiresAt)

    // React on token change. On first mount if authenticated the token shall be
    // available immediately, before any subcomponent is rendered, to prevent any
    // initial request from failing.
    const mounted = useRef(false)
    if (onTokenChange && state.auth?.token && !mounted.current) {
        mounted.current = true
        onTokenChange(state, state.auth.token)
    }
    useEffect(() => {
        if (!onTokenChange) return;
        onTokenChange(state, state.auth?.token)
    }, [state.auth?.token])

    // --- Actions ---

    function processExit() {
        setState({ initialized: true })
    }

    function processResult(res: AuthActionResult<U>) {
        setState(_state => ({
            initialized: true,
            auth: {
                token: res.token,
                expiresAt: coerceExpiration(res.tokenExpiration)
            },
            renew: res.renew ? {
                token: res.renew,
                expiresAt: coerceExpiration(res.renewExpiration)
            } : _state.renew,
            user: res.user ? res.user : _state.user
        }))
    }

    /**
     * Just run the standard signIn procedure
     */

    const lastDev = useLatest({ token: devToken, user: devUser });

    const signInAsync = useSharedPromise(async (input?: SI) => {
        // ! Inject dev token if needed
        let res: AuthActionResult<U>
        if (lastDev.current?.token) {
            res = { ...lastDev.current,  tokenExpiration: undefined } as AuthActionResult<U>
        } else if (doSignIn) {
            res = await doSignIn(state, input)
        } else {
            throw new Error(`AuthProvider has no sign-in function`)
        }
        processResult(res)
        return res
    })

    /**
     * Call the refresh function and exit in any cas it is not possible
     * to complete the refresh
     */
    const renewTokenAsync = useSharedPromise(async (input?: RF) => {
        if (!doRenew) {
            throw new Error(`AuthProvider has no renew function`)
        }
        const res = await doRenew(state, input)
        processResult(res)
        return res
    })

    /**
     * Perform a sign-out
     */
    const signOutAsync = useSharedPromise(async (input?: SO) => {
        if (doSignOut) {
            try { // todo : is this ok ?
                await doSignOut(state, input)
            } catch (e) {
            }
        }
        processExit()
    })

    const signIn = usePromise(signInAsync)
    const renewToken = usePromise(renewTokenAsync)
    const signOut = usePromise(signOutAsync)

    const ctx = useMemo<AuthContext<U, SI, RF, SO>>(() => ({
        ...state,
        signIn,
        renewToken,
        signOut,
        signInAsync,
        renewTokenAsync,
        signOutAsync,
        setAuth: processResult,
    }), [state])

    return <_AuthContext.Provider value={ctx} children={children} />

}
