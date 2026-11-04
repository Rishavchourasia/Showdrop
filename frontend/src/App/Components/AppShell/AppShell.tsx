import { AnimatePresence, LayoutGroup, motion, useScroll, useTransform } from 'motion/react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { Suspense, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ROUTE_BOOKINGS, ROUTE_HOME, ROUTE_LOGIN, ROUTE_MUSIC, ROUTE_SIGNUP } from '../../Constants/RouteConstants';
import { LOGOUT } from '../../Redux/Actions/AuthConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { cx } from '../../Utils/cx';
import { ChatWidget } from '../ChatWidget/ChatWidget';
import { Badge, ButtonLink, Icon, IconButton, Marquee, Spinner, Text } from '../CustomUI';
import { Logo } from '../Logo/Logo';
import styles from './Layout.module.scss';

const NAV = [
  { to: ROUTE_HOME, label: 'Discover', end: true, auth: false, soon: false },
  { to: ROUTE_MUSIC, label: 'Music', end: false, auth: false, soon: true },
  { to: ROUTE_BOOKINGS, label: 'My tickets', end: false, auth: true, soon: false },
];

/** Freeze the outgoing page while it animates out, so it doesn't re-render as the new page. */
function FrozenOutlet() {
  const [outlet] = useState(useOutlet());
  return outlet;
}

/** Top bar + animated page area + chat. Every page renders inside it. */
export function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();

  // The bar becomes more solid as you scroll down.
  const { scrollY } = useScroll();
  const barOpacity = useTransform(scrollY, [0, 120], [0.35, 0.85]);

  return (
    <div className={styles.app}>
      <header className={styles.topbarWrap}>
        <motion.div className={styles.topbar} style={{ '--bar-alpha': barOpacity } as never}>
          <Link to={ROUTE_HOME} className={styles.brand} aria-label="Showdrop home">
            <Logo />
          </Link>

          <LayoutGroup id="nav">
            <nav className={styles.nav} aria-label="Main">
              {NAV.filter((n) => !n.auth || user).map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={styles.navLink}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className={styles.navPill}
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className={cx(styles.navLabel, isActive && styles.navActive)}>
                        {item.label}
                        {item.soon && <Badge tone="soon">Soon</Badge>}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </LayoutGroup>

          <div className={styles.topbarRight}>
            {user ? (
              <>
                <span className={styles.user} title={user.email}>
                  <span className={styles.avatar}>{user.fullName.charAt(0).toUpperCase()}</span>
                  {user.fullName.split(' ')[0]}
                </span>
                <IconButton
                  icon="logout"
                  label="Log out"
                  title={`Log out ${user.email}`}
                  onClick={() => {
                    dispatch({ type: LOGOUT });
                    navigate(ROUTE_HOME);
                  }}
                />
              </>
            ) : (
              <>
                <ButtonLink to={ROUTE_LOGIN} variant="ghost" size="sm">
                  Log in
                </ButtonLink>
                <ButtonLink to={ROUTE_SIGNUP} variant="primary" size="sm" shape="pill">
                  Get started
                </ButtonLink>
              </>
            )}
          </div>
        </motion.div>
      </header>

      {/* Page transitions: the old page fades/slides out, then the new one in. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          className={styles.content}
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 140, damping: 22 }}
        >
          <Suspense
            fallback={
              <div className={styles.pageLoading}>
                <Spinner size={28} />
              </div>
            }
          >
            <FrozenOutlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <Footer />
      <ChatWidget />
    </div>
  );
}

function Footer() {
  const words = ['Movies', 'Live music', 'Stand-up', 'Theatre', 'Festivals', 'Gigs', 'Premieres'];
  return (
    <footer className={styles.footer}>
      <Marquee speed={36}>
        {words.map((w) => (
          <span key={w} className={styles.footerWord}>
            {w} <Icon name="zap" size={20} />
          </span>
        ))}
      </Marquee>
      <div className={styles.footerBottom}>
        <Text variant="small" tone="muted">
          © {new Date().getFullYear()} Showdrop · Catch the drop.
        </Text>
        <Text variant="small" tone="muted">
          No booking fees. Ever.
        </Text>
      </div>
    </footer>
  );
}

/*
 * Guards pages that need login. Not logged in -> go to /login, remembering where
 * the user wanted to go so the login page can send them back.
 * This is only for user experience; real security is on the backend (SecurityConfig).
 */
export function RequireAuth() {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  if (!user) return <Navigate to={ROUTE_LOGIN} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
