import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
    id: number;
    email: string;
    name: string;
    role: 'USER' | 'INDUSTRY' | 'GOVERNMENT';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

const stored = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

const initialState: AuthState = {
    user: stored ? JSON.parse(stored) : null,
    token: storedToken || null,
    isAuthenticated: !!storedToken,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            localStorage.setItem('user', JSON.stringify(action.payload.user));
            localStorage.setItem('token', action.payload.token);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;

export const store = configureStore({
    reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
