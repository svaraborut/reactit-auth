
# 🔒 Ultimate token authentication for React 🔒
This library is the most versatile and un-opinionated solution available to integrate
token-based authentication into your `React` project.

# Comparison


# Axios Example

Example of minimal `axios` integration
```tsx
<AuthProvider
    doSignIn={async (ctx, credentials?: AuthRequest) => {
        const res = (await axios.post(`${AUTH_URL}/login`, credentials)).data
        return {
            token: res.authToken,
            tokenExpiration: res.authExpiresIn,
        }
    }}
    doSignOut={async (ctx) => {
        // Call the server if a log-out api exists
        await axios.post(`${AUTH_URL}/logout`)
    }}
    onTokenChange={async (ctx, token) => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } else {
            delete axios.defaults.headers.common['Authorization']
        }
    }}
>
    ...
</AuthProvider>
```


# Description
This library aims to be the less opinionated and more versatile React authentication solution. The solution
autonomously handles the tokens, their storage and expiration, user should provide any behavioural logic to
retrieve/generate the tokens and insert them in their intended usage configuration (todo Cookies).

## Just authenticate
To configure the simplest form of authentication provide the `doSignIn` function. Somewhere within the
application (probably on submit of a LogIn form) should then call `signIn` (from `useAuth()` hook) passing 
the credential data `doSignIn`. The `token` returned by `doSignIn` will then be taken care of by the library.
The token will be stored in the browser storage for future use, and automatically loaded on page reload.
Whenever the user will then invoke `signOut` the token will be destroyed and the authentication will be
interrupted.

> Whenever the token will be added (`signIn`) removed (`signOut`) or loaded from the storage due to page
> reload the function `onTokenChange` will be called. This function is hence a handy solution to take the
> token and use it to configure any system that may need it (for example `axios` or the `Cookie` store).
> Alternatively the effect `useAuthChangeEffect` may be use for the same purpose.

## Expire the token
If the `token` returned by `doSignIn` has an expiration the function shall also return `tokenExpiration`.
Upon expiration the token will be automatically deleted form the store and the session will sign out.

> Note that upon token expiration `doSignOut` is not called but `onTokenChange` with an `undefined` token
> is still called to reset the authenticated media.

## Renew the token
If the authentication system supports token renewal, then a `doRenew` function shall be provided. When the
token expires (todo : opinionated) and a renewal token is available, the system will call this function. This function is then in turn expected to return a new
`token` (and optionally other parameters) that will become then effective and replace the old one. If this
function is not available or fails to execute the original expiration will result in the sign-out and
destruction of any stored token.

> This function is called whenever attempting to restore an expired token. This includes expiration due
> to `tokenExpiration`, but also immediately on page mount when a valid (todo : opinionated) renew token is
> found in the storage.

## Renew with expired token
todo

## Passive expiration
As described [here](https://stackoverflow.com/questions/69359599) some systems my use different means than
temporal expiration to determine the expiration (or invalidity) of a token. This is why `renewTokenAsync`
function is available. Such function can be called upon a `HTPP 401` error to attempt to renew a clearly
expired authentication, and also have the ability to replay the same request.

_For example this is a very neat way to handle `JWT` expiration without having to worry about time jitter
or sessions being kicked out by proxies or administrators. This `interceptor` will attempt to renew the
token whenever detects a `401` error, if not possible will sign-out_
```ts
const { renewAsync, signOutAsync } = useAuth()

useEffect(() => {
    async function onReject(error: AxiosError) {
        if (
            !error.config.params?.repeating // prevent infinite loops
            && error.response?.status === 401
        ) {
            error.config.params = { ...(error.config.params || {}), repeating: true }
            try {
                await renewAsync();
                console.log('[auth] Auto renew succss - Repeating query')
                return axios.request(error.config)

            } catch (e) {
                console.log('[auth] Auto renew failsed - Logging out')
                await signOutAsync()
            }
        }
        return Promise.reject(error)
    }
    // Register axios interceptors
    const ref = axios.interceptors.response.use(undefined, onReject)
    return () => axios.interceptors.response.eject(ref)
}, [])
```

## Custom logic 
If your logic is yet more complex, then `setAuth` function is made available. This function shall be
called with the very same payload that is usually returned from `doSignIn` and can be used to update
any part of the authentication state at any given instant.


# API

## `<AuthProvider>`

| Propery           | Type            | Description                                                                                      |
|-------------------|-----------------|--------------------------------------------------------------------------------------------------|
| `authStorage`     | `?StorageTypes` | Property discriminating where to store the authentication context (defaults to `sessionStorage`) |
| `authPrefix`      | `?string`       | A prefix used to prefix all the authentication keys in the storage (defaults to `auth_`)         |
| `doSignIn`        |                 | Async function called to perform the sign in                                                     |
| `doRenew`         |                 | Async function called to perform the token renewal                                               |
| `doSignOut`       |                 | Async function to sign out                                                                       |
| `onTokenChange`   |                 | Async function called whenever the authentication toke is updated                                |

### `authStorage`
Property indicating where to store the authentication context. Possible values are `'sessionStorage'` and
`'localStorage'`. This value can be changed dynamically to have the values move to another storage (session
will be preserved).

### `authPrefix`
Prefix used to prefix variable in the `Storage`.

### `doSignIn`
```ts
function doSignIn(ctx: AuthState<U>, input: SI | undefined): Promise<AuthActionResult<U>>
```
This is the only mandatory function, this task is initiated by calling the `signIn` action. The function
is invoked with the latest known auth state `ctx` and with the tipizable `input` that have been provided when
calling `signIn`. This function should return a valid `AuthActionResult` to initiate the authentication or
throw to signal that authentication was not possible.

_This function is guarded and will not be executed more than once at the same time._

### `doRenew`
```ts
function doRenew(ctx: AuthState<U>, input: RF | undefined): Promise<AuthActionResult<U>>
```
This function may be invoked by calling the `renewToken` action, to initiate a manual renewal of the token
but by default if `doSignIn` has returned renewal information this function will be automatically called
upon token expiration (this includes periodic expiration when the user is active on the application and when
the application is loaded and a valid renewal token is available). Failure of this function when manually
executed does not affect the authentication status, but when called upon token expiration the failure will
cause an immediate de-authentication (without calling `doSignOut`).

_This function is guarded and will not be executed more than once at the same time._

### `doSignOut`
```ts
function doSignOut(ctx: AuthState<U>, input: SO | undefined): Promise<void>
```
If provided this function is invoked when calling the `signOut` action. This async function is awaited
for completion before proceeding with the sign-out, but for security reasons the outcome of the promise
is not relevant for the sign-out completion (hence the promise may fail without affecting the sign-out)

_This function is guarded and will not be executed more than once at the same time._

### `onTokenChange`
```ts
function onTokenChange(ctx: AuthState<U>, token: Token | undefined): Promise<void>
```
Called with the latest authentication state whenever the token has changed. This function is designed to
be used to update global authentication systems such are `Cookies` or `axios` instances. Just set the
token when provided and remove it when is `undefined`


#### Development features

| Propery           | Type            | Description                                                           |
|-------------------|-----------------|-----------------------------------------------------------------------|
| `devToken`        | `?string`       | Show content when application is unauthenticated (defaults to `false`) |
| `devSignedIn`     | `?string`       | Show content when application is unauthenticated (defaults to `false`) |

todo

## `<AuthGuard>`

This component provides a simple guard to be used to conditionally render part of a layout.

| Propery      | Type           | Description                                                             |
|--------------|----------------|-------------------------------------------------------------------------|
| `showAuth`   | `?boolean`     | Show content when application is authenticated (defaults to `true`)     |
| `showUnAuth` | `?boolean`     | Show content when application is unauthenticated (defaults to `false`)  |
| `children`   | `ReactNode`    | The content to conditionaly show                                        |

_Example of some authentication guarded routes_
```tsx
<Routes>
    <AuthGuard showAuth={false} showUnAuth={true}>
        <Route path='/login' element={<LoginPage />} />
        <Route path='*' element={<Navigate to={'/login'} replace />} />
    </AuthGuard>
    <AuthGuard>
        <Route path='/' element={<SecureHomePage />} />
    </AuthGuard>
</Routes>
```


## `useAuth`
```ts
function useAuth<U, SI = any, RF = void, SO = void>(): UseAuthReturn<U, SI, RF, SO>
```
Returns an object populated with the current authentication state and functions to manipulate
the authentication. todo


## `useIsAuthenticated`
```ts
function useIsAuthenticated(): boolean
```
Returns a `boolean` value indicating the state of authentication


## `useAuthUser`
```tsx
function useAuthUser<U>(): U | undefined
```
Returns the value (if any) that was returned for the `user` field ny the last `logIn` or 
`renew` action. It will always be `undefined` when not authenticated.


## `useAuthChangeEffect`
```tsx
function useAuthChangeEffect(effect: EffectCallback)
```
An effect callback that will be called whenever the authentication state changes. This
implies that will be called for any `logIn`, `renew` and `logOut` action that is executed
and changes the authentication state.

```tsx
useAuthChangeEffect(() => {
    console.log('Authentication state changed')
})
```


## `useAuthContext`

> ⚠️ Caution, this hook exposes the inner context of the application, use with caution
> improper usage may lead to exposure of the stored token.

We all hate when we want to add that extra bit of customization, and we collide with 
again another non-exposed feature of a library. This hook gives you access to the underlying
`state` of the authentication to be able to freely manipulate its state. But remember, in
doing so, you are on your own.
