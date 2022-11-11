
# Components

## `<AuthProvider>`

Authentication context provider, provides an application wrapper that will handle the all authentication
behavior. To use this library wrap the entire application with this component and define all the methods
required to implement your specific authentication behaviour. To see various authentication behaviour
implementations see [examples](example_axios.md)

Component properties:
- `authStorage` defines the storage that will be used for the authentication data (defaults to `sessionStorage`)
- `authPrefix` the prefix used for variables in `authStorage` (defaults to `auth_`)
- `doSignIn` an async function called to perform the sign in
- `doRenew` an async function called to perform the token renewal
- `doSignOut` an async function to sign out
- `onTokenChange` a function called whenever the authentication toke is updated

During development having to continuously authenticate may be tedious, usually what developers end doing
is commenting out all authentication logics. This approach is working but may lead to poor testing of the
authentication process. For this reason this library provides some development properties, to mock the
default authentication behaviour:
- 👨‍💻 `devToken` defines the token during development
- 👨‍💻 `devUser` defines the user during development
- 👨‍💻 `devSigndIn` defines the authentication state during development

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
is invoked with the latest known auth state `ctx` and with the typizable `input` that have been provided when
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

### 👨‍💻 `devToken`
USE ONLY DURING DEVELOPMENT.
To avoid calling `doSignIn` many times a long-lasting token shall be provided as `devToken`. When provided
upon `signIn` the credentials will be ignored and `doSignIn` will never be called but rather the dev token
will be used and assumed as never expiring. 

### 👨‍💻 `devUser`
USE ONLY DURING DEVELOPMENT. When a `devToken` is provided this will be the user that the auth context will
set as the authenticated user and return from the `useAuthUser` hook.

### 👨‍💻 `devSignedIn`
USE ONLY DURING DEVELOPMENT. When a `devToken` is provided `doSignIn` will not be called, but the application
will still navigate through the authentication process. To skip this step and behave as if the application is
already authenticated set this value to true.


## `<AuthGuard>`

This component provides a simple guard to conditionally render part of a layout.

Component properties:
- `showAuth` to show content when application is authenticated (defaults to `true`)
- `showUnAuth` to show content when application is unauthenticated (defaults to `true`)

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


# Hooks


## `useAuth`
```ts
function useAuth<U, SI = any, RF = void, SO = void>(): UseAuthReturn<U, SI, RF, SO>
```
Returns an object populated with the current authentication state and functions to manipulate
the authentication.

Properties of the returned object:
- `user` the user (if any) that was returned by the last authentication/renew
- `signIn` call to initiate the sign-in
- `renewToken` call to initiate the renewal
- `signOut` call to initiate the sign-out
- `signInAsync` async function to perform the sign-in, will return or fail same as `doSignIn`
- `renewTokenAsync` async function to perform the renewal, will return or fail same as `doRenew`
- `signOutAsync` async function to perform the sign-out, will return or fail same as `doSignOut`
- `setAuth` function to manually set/override the current authentication state
- `isAuthenticated` indicates weather the application is currently authenticated
- `isRenewEnabled` indicates weather the current authentication has a renewal token


## `useIsAuthenticated`
```ts
function useIsAuthenticated(): boolean
```
Returns a `boolean` value indicating the state of authentication


## `useAuthUser`
```tsx
function useAuthUser<U>(): U | undefined
```
Returns the value (if any) that was returned for the `user` field on the last `logIn` or `renew` action.
It will always be `undefined` when not authenticated.


## `useAuthChangeEffect`
```tsx
function useAuthChangeEffect(effect: EffectCallback)
```
An effect callback that will be called whenever the authentication state changes. This implies that will
be called for any `logIn`, `renew` and `logOut` action that is executed and changes the authentication state.

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
