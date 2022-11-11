
# 🔒 @reactit/auth

Ultimate token authentication solution for your React project.

This library aims to be the less opinionated and more versatile React authentication solution. The solution
autonomously handles the tokens, their storage and expiration, user should provide any behavioural logic to
retrieve/generate the tokens and insert them in their intended usage configuration (todo Cookies).

# Api

The API documentation is available [here](./docs/api.md)

# Examples

We suggest getting familiar with the library API as the examples cannot cover all the possible scenarios,
but here are covered the more common use cases for this handy React library. In this example `axios` is
used as the `HTTP` client for any [AJAX](https://stackoverflow.com/questions/12067185) requests but nothing
prevents you from using any client you may think of (also exotic connections suc `WebSockets` can work)

- [Bearer token](./docs/example_axios.md)
- [Cookie]()
- [Custom LogIn flow]()
- [Redirects]()
- [During development]()
- [Renew token and replay axios request on 401]()

# Alternatives

- [react-use-auth](https://www.npmjs.com/package/react-use-auth)
- [next-auth](https://www.npmjs.com/package/next-auth)
- [react-native-axios-jwt](https://www.npmjs.com/package/react-native-axios-jwt)
- [react-jwt](https://www.npmjs.com/package/react-jwt)
- [react-auth-kit](https://www.npmjs.com/package/react-auth-kit)
- [react-token-auth](https://www.npmjs.com/package/react-token-auth)
- [supertokens-auth-react](https://www.npmjs.com/package/supertokens-auth-react)
- [@auth0/auth0-react](https://www.npmjs.com/package/@auth0/auth0-react)


# Requested features

- ✔️ Fix first cycle bug
- Add redirect on logout
- Add redirect after login
- Add more examples
- Create preconfigured AuthProviders

