
/**
 *
 * Tests:
 *
 *  - auth succeed does login and stores values
 *  - auth fails does not login
 *
 *  - renew succeed does update token and remain authed
 *  - renew fails does kick out
 *
 *  - auth expires on timeout and gets renewed
 *  - renew expires on timeout and kicks out
 *
 *  - reload with auth present keeps auth
 *  - reload without auth but renew performs a renew
 *  - reload without auth is logged out
 *
 *  - logout works
 *
 *  todo : if user ise deleted from the store, the query is not ran as long as another authentication is performed
 *
 */

it('Nothing to test', () => {

})
