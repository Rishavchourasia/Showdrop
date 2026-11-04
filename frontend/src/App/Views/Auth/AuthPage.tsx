import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatchOnMount } from '../../Components/CustomHooks/useDispatchOnMount';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import { Button, Card, Stack, Text, TextField, TextLink } from '../../Components/CustomUI';
import { FormError } from '../../Components/FormError/FormError';
import { Logo } from '../../Components/Logo/Logo';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { ROUTE_HOME, ROUTE_LOGIN, ROUTE_SIGNUP } from '../../Constants/RouteConstants';
import { AUTH_ERROR_CLEARED, LOGIN_REQUEST, SIGNUP_REQUEST } from '../../Redux/Actions/AuthConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import styles from './AuthPage.module.scss';

const MIN_PASSWORD = 6; // same rule as the backend's SignupRequest

const ART = [
  { title: 'Starfall', cat: 'Movie', seed: 1, left: '6%', top: '8%', w: 170, rotate: -8 },
  { title: 'Laugh Riot', cat: 'Comedy', seed: 3, left: '52%', top: '4%', w: 150, rotate: 6 },
  { title: 'Neon Monsoon', cat: 'music', seed: 101, left: '30%', top: '38%', w: 160, rotate: -3 },
];

/** Login and signup share one page: same fields, same flow, different action. */
export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  useDocumentTitle(isSignup ? 'Sign up' : 'Log in');
  const dispatch = useDispatch();
  const { user, loading, err } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  useDispatchOnMount([{ type: AUTH_ERROR_CLEARED }], [mode]); // don't show login's error on the signup page

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordError =
    isSignup && password.length > 0 && password.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters` : null;
  const fieldError = (name: string) => err?.fieldErrors.find((f) => f.field === name)?.message ?? null;

  // Where to go after logging in: the page that sent us here, e.g. the seat map.
  const from = (location.state as { from?: string } | null)?.from ?? ROUTE_HOME;
  if (user) return <Navigate to={from} replace />;

  function submit(e: FormEvent) {
    e.preventDefault(); // stop the browser's default full-page form submit
    if (passwordError) return;
    dispatch(
      isSignup
        ? { type: SIGNUP_REQUEST, payload: { email, password, fullName } }
        : { type: LOGIN_REQUEST, payload: { email, password } },
    );
  }

  return (
    <div className={styles.page}>
      {/* Left: floating poster collage + pitch. Purely decorative. */}
      <div className={styles.art} aria-hidden="true">
        {ART.map((a, i) => (
          <motion.div
            key={a.seed}
            className={styles.floater}
            style={{ left: a.left, top: a.top, width: a.w, rotate: a.rotate }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: [0, -12, 0] }}
            transition={{
              opacity: { delay: i * 0.12 },
              y: { duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
            }}
          >
            <PosterArt title={a.title} category={a.cat} seed={a.seed} size="card" />
          </motion.div>
        ))}
        <div className={styles.pitch}>
          <Text variant="display">
            Front row <span className={styles.pitchAccent}>energy.</span>
          </Text>
          <Text tone="secondary">Live seat maps · 5-minute holds · zero booking fees.</Text>
        </div>
      </div>

      <Card as="form" padding="lg" className={styles.card} onSubmit={submit}>
        <Stack gap={5}>
          <Stack gap={2} align="center">
            <Logo size={44} wordmark={false} />
            <Text variant="h1" align="center">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text tone="secondary" align="center">
              {isSignup ? 'Book tickets in a couple of clicks.' : 'Log in to book and see your tickets.'}
            </Text>
          </Stack>

          {isSignup && (
            <TextField
              label="Full name"
              required
              maxLength={100}
              autoComplete="name"
              value={fullName}
              error={fieldError('fullName')}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            error={fieldError('email')}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            required
            minLength={isSignup ? MIN_PASSWORD : undefined}
            maxLength={100}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            error={passwordError ?? fieldError('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <FormError error={err} />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {isSignup ? 'Create account' : 'Log in'}
          </Button>
          <Text variant="small" tone="muted" align="center">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <TextLink to={ROUTE_LOGIN} state={location.state}>
                  Log in
                </TextLink>
              </>
            ) : (
              <>
                New here?{' '}
                <TextLink to={ROUTE_SIGNUP} state={location.state}>
                  Create an account
                </TextLink>
              </>
            )}
          </Text>
          {!isSignup && (
            <Text variant="caption" tone="muted" align="center">
              Demo account: <code>demo@bys.dev</code> / <code>demo1234</code>
            </Text>
          )}
        </Stack>
      </Card>
    </div>
  );
}
