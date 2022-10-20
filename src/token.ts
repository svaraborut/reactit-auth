
export type Token = string

export interface TokenBundle {
    token: Token
    // stored as UNIX to ease the serialization, if not present the token never expires
    expiresAt?: number
}

export function coerceExpiration(exp: number | Date | undefined): number | undefined {
    if (typeof exp === 'number') {
        return Date.now() + exp * 1000
    } else if (exp instanceof Date) {
        return exp.getTime()
    } else if (exp === undefined) {
        return undefined
    } else {
        throw new Error(`Unknown expiration format ${exp}`)
    }
}

export function isTokenBundleValid(bundle: TokenBundle): boolean {
    return !!bundle.token && (!bundle.expiresAt || bundle.expiresAt >= Date.now())
}
