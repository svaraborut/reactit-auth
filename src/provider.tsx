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
import { StorageTypes } from '@reactit/hooks/dist/storage/storage';

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
    doSignIn: (ctx: AuthState<U>, input: SI | undefined) => Promise<AuthActionResult<U>>
    doRenew?: (ctx: AuthState<U>, input: RF | undefined) => Promise<AuthActionResult<U>>
    doSignOut?: (ctx: AuthState<U>, input: SO | undefined) => Promise<void>

    // Side - effects
    onTokenChange?: (ctx: AuthState<U>, token: Token | undefined) => void

}

/**
 * Authentication provider to wrap the entire application. This
 * component does contain all the behavioural logic for the entire
 * authentication workflow.
 *
 * todo : force renew on mount / do not save token to Storage
 */
export function AuthProvider<U, SI = any, RF = void, SO = void>(
    {
        authStorage = 'sessionStorage',
        authPrefix = 'auth_',
        devToken,
        devSignedIn,
        devUser,
        doSignIn,
        doRenew,
        doSignOut,
        onTokenChange,
        children,
    }: AuthProviderProps<U, SI, RF, SO> & { children: ReactNode }
) {

    const [state, setState] = useStorage<AuthState<U>>(
        devSignedIn && devToken ? { auth: { token: devToken } } : {},
        (devToken ? '$dev_' : '') + authPrefix,
        authStorage,
    )

    // Remove invalid tokens when they expire
    useAsyncEffect(async () => {

        const authInv = state.auth && !isTokenBundleValid(state.auth)
        const renewInv = state.renew && !isTokenBundleValid(state.renew)

        // Attempt to renew if auth is invalid but renew is present
        // todo : this is opinionated (state.renew && !renewInv)
        if ((!state.auth || authInv) && (state.renew && !renewInv)) {
            try {
                await renewTokenAsync(undefined)
                return
            } catch (e) {
                // Invalidate normally
            }
        }

        if (authInv || renewInv) {
            setState({
                ...state,
                auth: authInv ? undefined : state.auth,
                renew: renewInv ? undefined : state.renew,
            })
        }

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
        setState({})
    }

    function processResult(res: AuthActionResult<U>) {
        const newCtx: AuthState<U> = {
            // todo : state here may be old
            auth: {
                token: res.token,
                expiresAt: coerceExpiration(res.tokenExpiration)
            },
            renew: res.renew ? {
                token: res.renew,
                expiresAt: coerceExpiration(res.renewExpiration)
            } : state.renew,
            user: res.user ? res.user : state.user
        }
        setState(newCtx)
    }

    /**
     * Just run the standard signIn procedure
     */

    const lastDev = useLatest({ token: devToken, user: devUser });

    const signInAsync = useSharedPromise(async (input?: SI) => {
        // ! Inject dev token if needed
        const res = lastDev.current?.token
            ? { ...lastDev.current,  tokenExpiration: undefined } as AuthActionResult<U>
            : await doSignIn(state, input)
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
        } else if (!state?.renew) { // todo : this is opinionated
            throw new Error(`Authentication context has no renew token`)
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
