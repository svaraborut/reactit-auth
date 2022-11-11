
# Interesting tutorials
To better foster your curiosity of how authentication system works, here are some interesting articles that
will guide you step by step into how to develop and integrate authentication into React. But keep in mind
that this library solves all of these problems and brings additional features.

- [Auth0 Tutorial](https://auth0.com/blog/complete-guide-to-react-user-authentication/)
- [DigitalOcean Tutorial](https://www.digitalocean.com/community/tutorials/how-to-add-login-authentication-to-react-applications)
- [CodeX Tutorial](https://medium.com/codex/json-web-token-authentication-on-react-redux-982e5f003422)

# Authentication patterns

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
