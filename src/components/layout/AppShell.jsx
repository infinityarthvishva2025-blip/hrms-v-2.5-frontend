import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Clock, Users, LogOut, ChevronRight,
  User, Bell, Search, CalendarDays,
  ChevronDown, Calendar, DollarSign, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import theme from '../../theme';
import { getUnreadCount } from '../../api/announcement.api';
import logo from '../../assets/infinity logo.png';

// ==================== Constants ====================
const MOBILE_BREAKPOINT = 1024;
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 280;

// ==================== Navigation Configuration ====================
const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
      { icon: User, label: 'My Profile', path: '/profile', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
    ]
  },
  {
    label: 'Team Management',
    items: [
      {
        icon: CalendarDays,
        label: 'Team Management',
        roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'],
        children: [
          { label: 'Leave Approvals', path: '/leave-approvals', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'] },
          { label: 'Reports', path: '/attendance/reports', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'] },
          { label: 'Team Attendance', path: '/attendance/admin', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'] },
          { label: 'Corrections Requests', path: '/attendance/corrections', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM'] },
        ]
      },
    ]
  },
  {
    label: 'HR Operations',
    items: [
      { icon: Users, label: 'Attendance Management', path: '/attendance/employee/attendance', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM'] },
      { icon: DollarSign, label: 'Payroll', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'], children: [] },
      { icon: Users, label: 'Employees', path: '/employees', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM'] },
      { icon: Users, label: 'Payroll Admin', path: '/payroll', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM'] },
      { icon: Calendar, label: 'Announcements', path: '/announcements', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
      { icon: Calendar, label: 'Holiday Calendar', path: '/holidays', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
      { icon: Calendar, label: 'My Leaves', path: '/leaves', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
      { icon: Calendar, label: 'Leave Dashboard', path: '/leave-dashboard', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM'] },
      { icon: Calendar, label: 'My Pay Slips', path: '/payroll/my', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
      { icon: Calendar, label: 'Gurukul', path: '/gurukul', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
    ]
  },
];

// ==================== Styles ====================
const styles = {
  // Layout
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    background: '#FAFAFA',
    fontFamily: "'Inter', sans-serif",
  },
  mainContent: (marginLeft, isMobile) => ({
    flex: 1,
    marginLeft: isMobile ? 0 : marginLeft,
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    minWidth: 0,
    position: 'relative',
  }),

  // Sidebar
  sidebar: (width, isMobile, mobileMenuOpen) => ({
    width: isMobile ? '280px' : `${width}px`,
    background: theme.colors.surface,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'fixed',
    top: 0,
    left: isMobile ? (mobileMenuOpen ? 0 : '-280px') : 0,
    height: '100vh',
    zIndex: 1100,
    borderRight: '1px solid rgba(226, 232, 240, 0.6)',
    boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
  }),
  brandingContainer: {
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    justifyContent: 'center',
    borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
    background: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  logoWrapper: (collapsed) => ({
    padding: collapsed ? '6px' : '0',
    borderRadius: collapsed ? '12px' : '0',
    background: collapsed ? '#fff' : 'transparent',
    boxShadow: collapsed ? '0 8px 24px rgba(0,0,0,0.06)' : 'none',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: collapsed ? '1px solid var(--color-border)' : 'none',
  }),
  nav: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
  },
  groupContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  groupLabel: (collapsed) => ({
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '0 12px 8px 12px',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }),

  // NavItem
  navItemBase: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative',
    textDecoration: 'none',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    outline: 'none',
  },
  navItemIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    flexShrink: 0,
    marginLeft: '4px',
  },
  navItemLabel: (collapsed) => ({
    fontSize: '0.9rem',
    flex: 1,
    opacity: collapsed ? 0 : 1,
    transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  }),
  chevron: (collapsed, isExpanded) => ({
    opacity: collapsed ? 0 : 1,
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    marginRight: '4px',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
  }),
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    height: '60%',
    width: '4px',
    background: '#2076C7',
    borderRadius: '0 4px 4px 0',
    animation: 'slideInY 0.2s',
  },
  tooltip: {
    position: 'absolute',
    left: 'calc(100% + 12px)',
    top: '50%',
    transform: 'translateY(-50%) translateX(-10px)',
    background: '#111827',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 200,
  },
  tooltipArrow: {
    content: '""',
    position: 'absolute',
    left: '-4px',
    top: '50%',
    transform: 'translateY(-50%)',
    borderWidth: '5px 5px 5px 0',
    borderStyle: 'solid',
    borderColor: 'transparent #111827 transparent transparent',
  },

  // Children menu
  childrenContainer: (isExpanded, collapsed, childCount) => ({
    maxHeight: (isExpanded && !collapsed) ? `${childCount * 50}px` : '0px',
    opacity: (isExpanded && !collapsed) ? 1 : 0,
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginLeft: '26px',
    marginTop: (isExpanded && !collapsed) ? '4px' : '0',
    borderLeft: '1px solid #E2E8F0',
    paddingLeft: '12px',
  }),
  childLink: (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '0.85rem',
    color: isActive ? '#2076C7' : '#64748B',
    background: isActive ? 'rgba(32,118,199,0.05)' : 'transparent',
    fontWeight: isActive ? 700 : 500,
    transition: 'all 0.2s',
  }),
  childDot: (isActive) => ({
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: isActive ? '#2076C7' : '#CBD5E1',
  }),

  // User Card
  userCardContainer: {
    padding: '24px 16px',
    borderTop: '1px solid rgba(226, 232, 240, 0.6)',
  },
  userCard: (collapsed) => ({
    background: collapsed ? 'transparent' : 'linear-gradient(145deg, #ffffff, #f8fafc)',
    border: collapsed ? 'none' : '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: collapsed ? '0' : '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: collapsed ? 'none' : '0 4px 12px rgba(0,0,0,0.02)',
  }),
  avatar: (collapsed) => ({
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    flexShrink: 0,
    background: '#E0E7FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px solid #fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    margin: collapsed ? '0 auto' : '0',
  }),
  userInfo: (collapsed) => ({
    flex: 1,
    overflow: 'hidden',
    opacity: collapsed ? 0 : 1,
    width: collapsed ? 0 : 'auto',
    transition: 'all 0.3s ease',
  }),
  logoutBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: '#FEF2F2',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#EF4444',
    transition: 'all 0.2s',
  },

  // Header
  header: (scrolled, isMobile) => ({
    height: '75px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '0 16px' : '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: scrolled ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid transparent',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    width: '100%',
  }),
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.6)',
    padding: '8px 16px',
    borderRadius: '12px',
    color: '#64748B',
    fontSize: '0.9rem',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s',
    width: '280px',
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#F8FAFC',
    border: '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  unreadBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '9px',
    height: '9px',
    background: '#EF4444',
    borderRadius: '50%',
    border: '2px solid #fff',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
  },
  profileHeader: (isMobile) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    padding: '4px 4px 4px 12px',
    borderRadius: '14px',
    transition: 'all 0.2s',
    border: isMobile ? 'none' : '1px solid transparent',
  }),
  profileAvatarWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'var(--gradient-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '2px',
    boxShadow: '0 4px 12px rgba(32, 118, 199, 0.2)',
  },

  // Collapse Toggle
  collapseToggle: {
    position: 'absolute',
    top: '34px',
    right: '-14px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#fff',
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    color: '#64748B',
    zIndex: 10,
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Main
  main: (isMobile) => ({
    flex: 1,
    padding: isMobile ? '16px' : '32px 40px',
    maxWidth: '1600px',
    margin: '0 auto',
    width: '100%',
    overflowX: 'hidden',
  }),
};

// ==================== Sub-Components ====================

// Role Badge Component
const RoleBadge = ({ role }) => {
  const color = theme.roleColors[role] || theme.roleColors.Employee;
  return (
    <span style={{
      background: color.bg,
      color: color.text,
      fontSize: '0.65rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      padding: '4px 10px',
      borderRadius: '99px',
      letterSpacing: '0.04em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: `0 2px 8px ${color.bg}80`
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color.dot }} />
      {role}
    </span>
  );
};

// Navigation Item Component
const NavItem = ({ item, collapsed, expanded, toggleMenu, location }) => {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const isExpanded = expanded[item.label];
  const isActive = hasChildren
    ? item.children.some(child => location.pathname.startsWith(child.path))
    : location.pathname.startsWith(item.path);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleMenu(item.label);
    }
  };

  if (hasChildren) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          className="nav-item"
          onClick={() => toggleMenu(item.label)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-expanded={isExpanded}
          aria-label={`${item.label} menu`}
          style={{
            ...styles.navItemBase,
            background: isActive && !isExpanded && collapsed ? 'rgba(32, 118, 199, 0.08)' : 'transparent',
            color: isActive && !isExpanded && collapsed ? '#2076C7' : '#64748B',
            fontWeight: isActive && !isExpanded && collapsed ? 700 : 600,
          }}
        >
          <div style={styles.navItemIcon}>
            <Icon size={20} strokeWidth={2} style={{
              transition: 'transform 0.2s',
              transform: (isActive && !isExpanded && collapsed) ? 'scale(1.1)' : 'scale(1)'
            }} />
          </div>
          <span style={styles.navItemLabel(collapsed)}>{item.label}</span>
          <div style={styles.chevron(collapsed, isExpanded)}>
            <ChevronDown size={14} />
          </div>
          {collapsed && (
            <div className="tooltip" role="tooltip">
              {item.label}
              <span style={styles.tooltipArrow} />
            </div>
          )}
        </div>

        <div style={styles.childrenContainer(isExpanded, collapsed, item.children.length)}>
          {item.children.map(child => {
            const isChildActive = location.pathname.startsWith(child.path);
            return (
              <NavLink
                key={child.path}
                to={child.path}
                className="nav-child"
                style={({ isActive }) => styles.childLink(isActive)}
                aria-current={isChildActive ? 'page' : undefined}
              >
                <span style={styles.childDot(isChildActive)} />
                {child.label}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className="nav-item"
      style={({ isActive: linkActive }) => ({
        ...styles.navItemBase,
        background: linkActive ? 'rgba(32, 118, 199, 0.08)' : 'transparent',
        color: linkActive ? '#2076C7' : '#64748B',
        fontWeight: linkActive ? 700 : 600,
      })}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && <div style={styles.activeIndicator} />}
      <div style={styles.navItemIcon}>
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} style={{
          transition: 'transform 0.2s',
          transform: isActive ? 'scale(1.1)' : 'scale(1)'
        }} />
      </div>
      <span style={styles.navItemLabel(collapsed)}>{item.label}</span>
      {collapsed && (
        <div className="tooltip" role="tooltip">
          {item.label}
          <span style={styles.tooltipArrow} />
        </div>
      )}
    </NavLink>
  );
};

// User Card Component
const UserCard = ({ user, collapsed, onLogout }) => {
  return (
    <div style={styles.userCardContainer}>
      <div style={styles.userCard(collapsed)}>
        <div style={styles.avatar(collapsed)}>
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={20} color="#4F46E5" strokeWidth={2.5} />
          )}
        </div>

        <div style={styles.userInfo(collapsed)}>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name}
          </div>
          <div style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '2px' }}>
            {user.employeeCode}
          </div>
        </div>

        {!collapsed && (
          <button
            onClick={onLogout}
            className="logout-btn"
            aria-label="Sign out"
            style={styles.logoutBtn}
          >
            <LogOut size={16} strokeWidth={2.5} style={{ marginLeft: '2px' }} />
          </button>
        )}
      </div>

      {collapsed && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
            aria-label="Sign out"
          >
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

// Sidebar Component
const Sidebar = ({
  isMobile,
  mobileMenuOpen,
  setMobileMenuOpen,
  collapsed,
  setCollapsed,
  filteredNavGroups,
  expandedMenus,
  toggleMenu,
  location,
  user,
  onLogout,
}) => {
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <aside
      style={styles.sidebar(sidebarWidth, isMobile, mobileMenuOpen)}
      aria-label="Main navigation"
    >
      {/* Branding */}
      <div style={styles.brandingContainer}>
        <motion.div
          initial={false}
          animate={{
            width: collapsed ? '44px' : '100%',
            height: collapsed ? '44px' : '85px'
          }}
          style={styles.logoWrapper(collapsed)}
        >
          <img src={logo} alt="Infinity Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </motion.div>

        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="icon-btn"
            style={{ position: 'absolute', right: '10px', top: '10px', width: '36px', height: '36px', background: 'var(--color-surface-alt)', zIndex: 10 }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {filteredNavGroups.map((group, groupIndex) => (
          <div key={groupIndex} style={styles.groupContainer}>
            <div style={styles.groupLabel(collapsed)}>{group.label}</div>
            {group.items.map(item => (
              <NavItem
                key={item.label}
                item={item}
                collapsed={collapsed}
                expanded={expandedMenus}
                toggleMenu={toggleMenu}
                location={location}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User Card */}
      <UserCard user={user} collapsed={collapsed} onLogout={onLogout} />

      {/* Desktop collapse toggle */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={styles.collapseToggle}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#111827';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <ChevronRight
            size={16}
            strokeWidth={2.5}
            style={{
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </button>
      )}
    </aside>
  );
};

// Header Component
const Header = ({
  isMobile,
  scrolled,
  setMobileMenuOpen,
  searchQuery,
  onSearchChange,
  unreadCount,
  user,
  navigate,
}) => {
  return (
    <header style={styles.header(scrolled, isMobile)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="icon-btn"
            style={{ ...styles.iconBtn, width: '42px', height: '42px', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}
            aria-label="Open menu"
          >
            <Menu size={22} color="#111827" />
          </button>
        )}

        {!isMobile && (
          <div style={styles.searchContainer} className="header-search">
            <Search size={18} style={{ opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={onSearchChange}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}
              aria-label="Search"
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/announcements')}
            title="Announcements"
            className="icon-btn header-action-btn"
            style={{ ...styles.iconBtn, position: 'relative' }}
            aria-label={`Announcements ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          >
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && <span style={styles.unreadBadge} />}
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(226, 232, 240, 0.8)', display: isMobile ? 'none' : 'block' }} />

        <div
          style={styles.profileHeader(isMobile)}
          className="user-profile-header"
          onClick={() => navigate('/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/profile')}
          aria-label="View profile"
        >
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#111827', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>
                {user.name}
              </div>
              <div style={{ marginTop: '2px' }}>
                <RoleBadge role={user.role} />
              </div>
            </div>
          )}

          <div style={styles.profileAvatarWrapper}>
            <div style={{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-alt)', color: 'var(--color-primary)' }}>
                  <User size={20} strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ==================== Main AppShell Component ====================
const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const abortControllerRef = useRef(null);

  // Fetch unread announcements count with abort handling
  const fetchUnread = useCallback(async () => {
    if (!user) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const { data } = await getUnreadCount({ signal: abortControllerRef.current.signal });
      setUnreadCount(data.data.unreadCount);
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Silently fail – not critical
      }
    }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const handleAnnouncementsRead = () => fetchUnread();
    window.addEventListener('announcementsRead', handleAnnouncementsRead);
    return () => {
      window.removeEventListener('announcementsRead', handleAnnouncementsRead);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUnread]);

  // Scroll & resize handlers
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-expand menus based on current route
  useEffect(() => {
    const newExpanded = { ...expandedMenus };
    navGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.children) {
          const isChildActive = item.children.some(child => location.pathname.startsWith(child.path));
          if (isChildActive) {
            newExpanded[item.label] = true;
          }
        }
      });
    });
    setExpandedMenus(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close mobile menu on navigation
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Keyboard handling for mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success('Signed out successfully', { icon: '👋' });
    navigate('/login');
  }, [logout, navigate]);

  const toggleMenu = useCallback((label) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedMenus(prev => ({ ...prev, [label]: true }));
    } else {
      setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    }
  }, [collapsed]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Placeholder for search implementation
  };

  // Memoized filtered navigation items based on user role
  const filteredNavGroups = useMemo(() => {
    if (!user?.role) return [];

    return navGroups.map(group => {
      const visibleItems = group.items
        .map(item => {
          if (!item.roles.includes(user.role)) return null;
          if (item.children) {
            const visibleChildren = item.children.filter(child => child.roles.includes(user.role));
            return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null;
          }
          return item;
        })
        .filter(Boolean);

      return visibleItems.length > 0 ? { ...group, items: visibleItems } : null;
    }).filter(Boolean);
  }, [user?.role]);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  // If user is not yet loaded, render a minimal shell (prevents flash of incorrect UI)
  if (!user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAFA', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        filteredNavGroups={filteredNavGroups}
        expandedMenus={expandedMenus}
        toggleMenu={toggleMenu}
        location={location}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div style={styles.mainContent(sidebarWidth, isMobile)}>
        <Header
          isMobile={isMobile}
          scrolled={scrolled}
          setMobileMenuOpen={setMobileMenuOpen}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          unreadCount={unreadCount}
          user={user}
          navigate={navigate}
        />

        <main style={styles.main(isMobile)}>
          {children}
        </main>
      </div>

      {/* Global Styles */}
      <style>{`
        .nav-item:hover, .nav-child:hover {
          background: rgba(241, 245, 249, 0.8) !important;
        }
        .nav-item:focus-visible, .nav-child:focus-visible {
          outline: 2px solid #2076C7;
          outline-offset: 2px;
        }
        .nav-item:hover .tooltip, .nav-item:focus .tooltip {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .icon-btn:hover {
          background: #F1F5F9;
          color: #111827;
          border-color: #E2E8F0;
          transform: translateY(-1px);
        }
        .logout-btn:hover {
          background: #FEE2E2 !important;
          color: #DC2626 !important;
        }
        @keyframes slideInY {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        
        @media (max-width: 1024px) {
          header h1 {
            font-size: 1.8rem !important;
          }
          .data-table {
            font-size: 0.85rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AppShell;