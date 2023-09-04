import { Token, TokenBundle } from './token';

export interface AuthState<U> {
    // Determines weather the authentication has been initialized, this is
    // useful to determine when the application is still performing the first load
    initialized: boolean
    // The authentication token, if missing authentication is not present
    auth?: TokenBundle
    // The refresh token, if present refresh is supported
    renew?: TokenBundle
    // Custom user information
    user?: U
}

export interface AuthActionResult<U> {
    token: Token
    tokenExpiration: number | Date | undefined
    renew?: Token
    renewExpiration?: number | Date | undefined
    user?: U
}

export interface AuthActions<U, SI = any, RF = void, SO = void> {

    // Execution functions, they perform the standard authentication
    // process provided in the AuthProvider, followed by the default
    // behaviour.
    signIn: (input?: SI) => void
    renewToken: (input?: RF) => void
    signOut: (input?: SO) => void

    // Same as above but async twin
    signInAsync: (input?: SI) => Promise<AuthActionResult<U>>
    renewTokenAsync: (input?: RF) => Promise<AuthActionResult<U>>
    signOutAsync: (input?: SO) => Promise<void>

    // Plain setters for custom behaviour
    setAuth: (value: AuthActionResult<U>) => void

}

export interface AuthContext<U, SI = any, RF = void, SO = void> extends AuthActions<U, SI, RF, SO>, AuthState<U> {
}
