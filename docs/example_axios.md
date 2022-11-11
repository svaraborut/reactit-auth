
# Axios Example

Assuming you have a login api at `api.example.com/v1/login` that expects some `credentials`
to be sent in exchange for a `jwt` `token`. This api will return the token and an additional
fields `authExpiresIn` that will inform the client for how many seconds the token will be valid.

In out example the response looks like
```json5
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibm...",
  authExpiresIn: 900,
}
```

> Note that `tokenExpiration` returned from `doSignIn` may be a `number` in which case is
> interpreted as seconds of validity left, or a `Date` object in which case it is interpreted
> as the instant of expiration. It is also possible to omit this field in which case the token
> will not be expired automatically.

## Simple application

The simplest example uses an `AppRoutes` component which is responsible to change the routing
structure according to the authentication status
```tsx
function AppRoutes() {
    const isAuth = useIsAuthenticated();
    
    return (
        <Routes>
            <Route path='/open' element={<PublicPage />} />
            {!isAuth ? (
                <>
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='*' element={<Navigate to={'/login'} replace />} />
                </>
            ) : (
                <>
                    <Route path='/' element={<HomePage />} />
                    <Route path='*' element={<Navigate to={'/'} replace />} />
                </>
            )}
        </Routes>
    )
}
```

Then the easiest solution is to wrap the application with `AuthProvider` and configure it
properly. In our case we provide `doSignIn` which is an `async` function responsible to
exchange credentials with our server, and `onTokenChange` function which will update the
`Authorization` header used by `axios`.

> `onTokenChange` is a handy function, as it will be called on log-in, log-out, renew, after
> token expiration and on application load (if a valid token has been retrieved from the
> storage), therefore all the setup that needs to be done with the token shall be done here.
```tsx
const AUTH_URL = `api.example.com/v1`

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider
                
                doSignIn={async (ctx, credentials) => {
                    const res = (await axios.post(`${AUTH_URL}/login`, credentials))
                    return {
                        token: res.authToken,
                        tokenExpiration: res.authExpiresIn,
                    }
                }}
                
                onTokenChange={(ctx, token) => {
                    if (token) {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
                    } else {
                        delete axios.defaults.headers.common['Authorization']
                    }
                }}
                
            >
                <AppRoutes/>
            </AuthProvider>
        </BrowserRouter>
    )
}
```

If your system also expects a log-out procedure to be called it can be done by providing
`doSignOut`.

> Please note that this function fill only be called when the respective `signOut` function
> is called on the `useAuth` hook and not when a token expires or is deleted from the storage
> by any other mean. This function can be used to request a premature expiration of the
> session but should not in any case replace an automated session expiration on the server.

```tsx
export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider
                
                ...
            
                doSignOut={async (ctx) => {
                    // Call the server if a log-out api exists
                    await axios.post(`${AUTH_URL}/logout`)
                }}
                
            >
                <AppRoutes/>
            </AuthProvider>
        </BrowserRouter>
    )
}
```

If your system supports token renewal a slight modification to `doSignIn` should be made
and `doRenew` `async` function should be implemented. Whenever `doSignIn` returns a renewal 
token, this will be stored and upon `token` expiration the system will call `doRenew` to
attempt to renew the token.

```tsx
export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider

                doSignIn={async (ctx, credentials) => {
                    const res = (await axios.post(`${AUTH_URL}/login`, credentials))
                    return {
                        token: res.authToken,
                        tokenExpiration: res.authExpiresIn,
                        renew: res.renewToken,
                        renewExpiration: res.renewExpiresIn,
                    }
                }}

                doRenew={async (ctx) => {
                    const res = (await axios.post(`${AUTH_URL}/renew`, { token: ctx.renew?.token }))
                    return {
                        token: res.authToken,
                        tokenExpiration: res.authExpiresIn,
                    }
                }}
                
            >
                <AppRoutes/>
            </AuthProvider>
        </BrowserRouter>
    )
}
```

Once setup you can initiate a login from anywhere in your application by mean of `useAuth()`
hook.
```tsx
export function LoginPage() {
    const { signIn } = useAuth()
    
    function doLogin(event) {
        signIn({
            username: event.target.username.value,
            password: event.target.password.value,
        }) // This will be sent to doSignIn as the second parameter
    }
    
    return (
        <form onSubmit={doLogin}>
            ...
        </form>
    )
}
```

And to log out just
```tsx
export function LogOutButton() {
    const { signOut } = useAuth()
    return (
        <button onClick={signOut}>Log Me Out</button>
    )
}
```
