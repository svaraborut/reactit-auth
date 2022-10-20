import { createContext, useContext } from 'react';
import { AuthContext } from './types';

export const _AuthContext = createContext<AuthContext<any, any, any, any> | undefined>(undefined);

export function useAuthContext<U, SI = any, RF = void, SO = void>(): AuthContext<U, SI, RF, SO> {
    const ctx = useContext(_AuthContext)
    if (!ctx) {
        throw new Error(`useAuth() must be used within a AuthProvider`)
    }
    return ctx as unknown as AuthContext<U, SI, RF, SO>
}
