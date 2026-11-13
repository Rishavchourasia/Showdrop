import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ROUTE_BOOKINGS, ROUTE_HOME, ROUTE_LOGIN, ROUTE_MUSIC, ROUTE_SIGNUP } from '../../Constants/RouteConstants';
import { LOGOUT } from '../../Redux/Actions/AuthConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { cx } from '../../Utils/cx';
import { EASE_OUT, SPRING_SNAPPY, SPRING_SOFT } from '../../Utils/motion';
import { holdScroll, resetScroll } from '../../Utils/smoothScroll';
import { ChatWidget } from '../ChatWidget/ChatWidget';
import { Badge, ButtonLink, Icon, IconButton, Marquee, Spinner, Text } from '../CustomUI';
import { useIntroDone } from '../Intro/IntroContext';
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
  const introDone = useIntroDone();
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  // The bar turns more solid as you scroll, and past the hero it SHRINKS into a
  // slimmer pill (always reachable, but out of the way of the content).
  const { scrollY } = useScroll();
  const barOpacity = useTransform(scrollY, [0, 120], [0.35, 0.85]);
  useMotionValueEvent(scrollY, 'change', (y) => setCompact(y > 160));

  // A new page starts at the top. (Menu links close the menu themselves.)
  useEffect(() => {
    resetScroll();
  }, [location.pathname]);

  // While the menu is open the page underneath stays still; Escape closes it.
  useEffect(() => {
    holdScroll('menu', menuOpen);
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const navItems = NAV.filter((n) => !n.auth || user);
  const menuItems = [
    ...navItems,
    ...(user
      ? []
      : [
          { to: ROUTE_LOGIN, label: 'Log in', soon: false, end: false, auth: false },
          { to: ROUTE_SIGNUP, label: 'Sign up', soon: false, end: false, auth: false },
        ]),
  ];

  return (
    <div className={styles.app}>
      <SeatProgress />

      <motion.header
        className={styles.topbarWrap}
        initial={{ y: -40, opacity: 0, scale: 0.96 }}
        animate={introDone ? { y: 0, opacity: 1, scale: 1 } : undefined}
        transition={SPRING_SOFT}
      >
        <motion.div
          className={cx(styles.topbar, compact && !menuOpen && styles.compact)}
          style={{ '--bar-alpha': barOpacity } as never}
        >
          <Link to={ROUTE_HOME} className={styles.brand} aria-label="Showdrop home">
            <Logo wordmark={!compact || menuOpen} />
          </Link>

          <LayoutGroup id="nav">
            <nav className={styles.nav} aria-label="Main">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={styles.navLink}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-pill" className={styles.navPill} transition={SPRING_SNAPPY} />
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
                  className={styles.desktopOnly}
                  onClick={() => {
                    dispatch({ type: LOGOUT });
                    navigate(ROUTE_HOME);
                  }}
                />
              </>
            ) : (
              <>
                <ButtonLink to={ROUTE_LOGIN} variant="ghost" size="sm" className={styles.desktopOnly}>
                  Log in
                </ButtonLink>
                <ButtonLink to={ROUTE_SIGNUP} variant="primary" size="sm" shape="pill" className={styles.desktopOnly}>
                  Get started
                </ButtonLink>
              </>
            )}
            {/* Phones: a ticket button opens the menu of ticket stubs. */}
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <motion.span
                animate={{ rotate: menuOpen ? 90 : 0 }}
                transition={SPRING_SNAPPY}
                className={styles.menuIcon}
              >
                <Icon name={menuOpen ? 'close' : 'ticket'} size={18} />
              </motion.span>
            </button>
          </div>
        </motion.div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="site-menu"
            aria-label="Site"
            className={styles.menu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { delay: 0.2 } }}
          >
            {/* Each link is a ticket stub dealt in from the right, slightly tilted. */}
            <ul>
              {menuItems.map((item, i) => (
                <motion.li
                  key={item.to}
                  initial={{ x: '120%', rotate: 14, opacity: 0 }}
                  animate={{ x: '0%', rotate: i % 2 ? 1.5 : -1.5, opacity: 1 }}
                  exit={{ x: '-120%', rotate: -10, opacity: 0, transition: { duration: 0.25, delay: i * 0.03 } }}
                  transition={{ ...SPRING_SOFT, delay: 0.05 + i * 0.07 }}
                >
                  <Link to={item.to} className={styles.stub} onClick={() => setMenuOpen(false)}>
                    <span className={styles.stubLabel}>{item.label}</span>
                    {item.soon && <Badge tone="soon">Soon</Badge>}
                    <span className={styles.stubTear} aria-hidden="true" />
                    <Icon name="arrowRight" size={20} />
                  </Link>
                </motion.li>
              ))}
            </ul>
            {user && (
              <motion.button
                type="button"
                className={styles.menuLogout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.4 } }}
                onClick={() => {
                  setMenuOpen(false);
                  dispatch({ type: LOGOUT });
                  navigate(ROUTE_HOME);
                }}
              >
                Log out {user.email}
              </motion.button>
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Page transitions: the old page slips away, the new one settles in. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          className={styles.content}
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          // transitionEnd: drop the filter/transform afterwards, because ANY filter (even blur(0))
          // breaks position: fixed / sticky children such as the seat dock and the curtain stage.
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.15 } }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
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

const SEATS = 28;

/**
 * Reading progress as a ROW OF SEATS along the top edge: they fill up with
 * lime, one by one, as you scroll down the page (a full house = the end).
 */
function SeatProgress() {
  const { scrollYProgress } = useScroll();
  const [filled, setFilled] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const n = Math.round(v * SEATS);
    setFilled((f) => (f === n ? f : n)); // only re-render when a seat actually changes
  });
  return (
    <div className={styles.seatRow} aria-hidden="true">
      {Array.from({ length: SEATS }, (_, i) => (
        <span key={i} className={cx(styles.seatDot, i < filled && styles.seatFilled)} />
      ))}
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
