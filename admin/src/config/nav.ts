export type NavItem = {
  title: string;
  href: string;
  icon: string;
  /** Permission gate — null means visible to all authenticated users; array = any match */
  permission: string | string[] | null;
  /** Optional role gate (e.g. teacher-only links) */
  role?: string | null;
  /** Hide from teacher-only accounts (keeps item for admin/staff) */
  hideForTeacherOnly?: boolean;
  /** Show only for teacher-only accounts (not admin) */
  showForTeacherOnly?: boolean;
};

export type NavGroup = {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
};

/** رابط مستقل أعلى القائمة — بدون فئة */
export const NAV_HOME: NavItem = {
  title: 'الرئيسية',
  href: '/dashboard',
  icon: 'fa-solid fa-gauge-high',
  permission: null,
};

export const NAV_MY_PORTAL: NavItem = {
  title: 'بوابتي',
  href: '/dashboard/my-portal',
  icon: 'fa-solid fa-id-badge',
  permission: 'teacher-portal.view',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'academic',
    title: 'الشؤون الأكاديمية',
    icon: 'fa-solid fa-graduation-cap',
    items: [
      { title: 'الفروع', href: '/dashboard/branches', icon: 'fa-solid fa-building', permission: 'branches.view' },
      { title: 'القاعات', href: '/dashboard/halls', icon: 'fa-solid fa-door-open', permission: 'halls.view' },
      { title: 'المواد', href: '/dashboard/subjects', icon: 'fa-solid fa-book', permission: 'subjects.view' },
      { title: 'إدارة المراحل والجداول', href: '/dashboard/academic-structure', icon: 'fa-solid fa-sitemap', permission: 'stages.view' },
      { title: 'الجدول الدراسي', href: '/dashboard/schedule-bulk-import', icon: 'fa-solid fa-table-cells', permission: 'course-groups.manage' },
      { title: 'عرض الجدول', href: '/dashboard/schedule-grid', icon: 'fa-solid fa-table', permission: 'course-groups.view' },
      { title: 'الفترات الدراسية', href: '/dashboard/academic-periods', icon: 'fa-solid fa-calendar', permission: 'periods.view' },
      {
        title: 'الباقات والعروض',
        href: '/dashboard/catalog',
        icon: 'fa-solid fa-boxes-stacked',
        permission: ['product-types.view', 'plans.view', 'durations.view', 'course-groups.view'],
        hideForTeacherOnly: true,
      },
      {
        title: 'صفوفي',
        href: '/dashboard/my-classes',
        icon: 'fa-solid fa-chalkboard-user',
        permission: 'teacher-portal.classes',
      },
    ],
  },
  {
    id: 'students',
    title: 'شؤون الطلاب',
    icon: 'fa-solid fa-user-graduate',
    items: [
      { title: 'ملفات الطلاب', href: '/dashboard/student-files', icon: 'fa-solid fa-folder-open', permission: 'students.view' },
      { title: 'التسجيلات', href: '/dashboard/enrollments', icon: 'fa-solid fa-file-signature', permission: 'enrollments.view' },
      { title: 'تسجيل الحضور', href: '/dashboard/attendance', icon: 'fa-solid fa-clipboard-user', permission: 'attendance.view' },
      { title: 'تنبيهات الغياب', href: '/dashboard/absence-alerts', icon: 'fa-solid fa-bell', permission: 'attendance.view' },
      { title: 'تنبيه الغياب', href: '/dashboard/absence-thresholds', icon: 'fa-solid fa-sliders', permission: 'absence-alerts.manage' },
      { title: 'المواد التعليمية', href: '/dashboard/educational-materials', icon: 'fa-solid fa-file-pdf', permission: 'materials.view' },
      {
        title: 'الاختبارات',
        href: '/dashboard/exams',
        icon: 'fa-solid fa-file-circle-check',
        permission: 'exams.view',
        hideForTeacherOnly: true,
      },
      {
        title: 'نتائج أعمال الطلبة',
        href: '/dashboard/exams',
        icon: 'fa-solid fa-file-circle-check',
        permission: 'exams.view',
        showForTeacherOnly: true,
      },
    ],
  },
  {
    id: 'finance',
    title: 'الشؤون المالية',
    icon: 'fa-solid fa-coins',
    items: [
      { title: 'الفواتير', href: '/dashboard/invoices', icon: 'fa-solid fa-file-invoice-dollar', permission: 'invoices.view' },
      { title: 'خطط التقسيط', href: '/dashboard/installment-templates', icon: 'fa-solid fa-calendar-week', permission: 'installments.view' },
      { title: 'الدفعات المتأخرة', href: '/dashboard/overdue-installments', icon: 'fa-solid fa-clock-rotate-left', permission: 'invoices.view' },
      { title: 'الكوبونات', href: '/dashboard/coupons', icon: 'fa-solid fa-ticket', permission: 'coupons.view' },
      { title: 'الخصم العائلي', href: '/dashboard/family-discount-rules', icon: 'fa-solid fa-people-roof', permission: 'family-discounts.view' },
      { title: 'التقارير المالية', href: '/dashboard/reports', icon: 'fa-solid fa-chart-line', permission: 'reports.view' },
    ],
  },
  {
    id: 'store',
    title: 'المتجر',
    icon: 'fa-solid fa-store',
    items: [
      { title: 'المنتجات', href: '/dashboard/products', icon: 'fa-solid fa-book-open', permission: 'products.view' },
      { title: 'مناطق التوصيل', href: '/dashboard/delivery-zones', icon: 'fa-solid fa-truck', permission: 'delivery-zones.view' },
      { title: 'الطلبات', href: '/dashboard/orders', icon: 'fa-solid fa-bag-shopping', permission: 'orders.view' },
    ],
  },
  {
    id: 'private-lessons',
    title: 'الحصص الخاصة',
    icon: 'fa-solid fa-chalkboard',
    items: [
      { title: 'الحصص الخاصة', href: '/dashboard/private-lessons', icon: 'fa-solid fa-user-graduate', permission: 'private-lessons.view' },
      { title: 'طلبات الحصص الخاصة', href: '/dashboard/private-lesson-inquiries', icon: 'fa-solid fa-inbox', permission: 'private-lessons.view' },
      { title: 'حجوزات الحصص الخاصة', href: '/dashboard/private-lesson-bookings', icon: 'fa-solid fa-calendar-check', permission: 'private-lessons.view' },
    ],
  },
  {
    id: 'staff',
    title: 'شؤون الموظفين',
    icon: 'fa-solid fa-people-group',
    items: [
      { title: 'المعلمون', href: '/dashboard/teachers', icon: 'fa-solid fa-chalkboard-user', permission: 'teachers.view' },
      { title: 'دوام الموظفين', href: '/dashboard/staff-attendance', icon: 'fa-solid fa-user-clock', permission: 'staff-attendance.view' },
      { title: 'طلبات الإجازة', href: '/dashboard/leave-requests', icon: 'fa-solid fa-plane-departure', permission: 'leaves.view' },
      { title: 'أنواع الإجازات', href: '/dashboard/leave-types', icon: 'fa-solid fa-list-check', permission: 'leaves.manage' },
      { title: 'الرواتب', href: '/dashboard/payroll', icon: 'fa-solid fa-money-check-dollar', permission: 'payroll.view' },
      { title: 'راتبي', href: '/dashboard/my-payroll', icon: 'fa-solid fa-wallet', permission: 'teacher-portal.payroll' },
      { title: 'إجازاتي', href: '/dashboard/my-leaves', icon: 'fa-solid fa-plane', permission: 'teacher-portal.leaves' },
    ],
  },
  {
    id: 'comms',
    title: 'التواصل',
    icon: 'fa-solid fa-headset',
    items: [
      { title: 'رسائل الموقع', href: '/dashboard/contact-messages', icon: 'fa-solid fa-envelope-open-text', permission: 'support-tickets.view' },
      { title: 'التواصل', href: '/dashboard/support-tickets', icon: 'fa-solid fa-headset', permission: 'support-tickets.view' },
    ],
  },
  {
    id: 'system',
    title: 'إعدادات النظام',
    icon: 'fa-solid fa-gears',
    items: [
      { title: 'المستخدمون', href: '/dashboard/users', icon: 'fa-solid fa-user-shield', permission: 'users.view' },
      { title: 'الأدوار والصلاحيات', href: '/dashboard/roles', icon: 'fa-solid fa-key', permission: 'roles.view' },
      { title: 'إعدادات المعهد', href: '/dashboard/settings', icon: 'fa-solid fa-gear', permission: 'settings.manage' },
      { title: 'استديو الوسائط', href: '/dashboard/media', icon: 'fa-solid fa-photo-film', permission: 'settings.manage' },
      { title: 'محتوى الموقع', href: '/dashboard/marketing', icon: 'fa-solid fa-pen-nib', permission: 'marketing.manage' },
      { title: 'قوالب الإشعارات', href: '/dashboard/notification-templates', icon: 'fa-solid fa-envelope-open-text', permission: 'notifications.manage' },
      { title: 'سجل التدقيق', href: '/dashboard/audit-logs', icon: 'fa-solid fa-clipboard-list', permission: 'audit-logs.view' },
    ],
  },
];

/** قائمة مسطّحة للتوافق — نفس الروابط والصلاحيات */
export const NAV_ITEMS: NavItem[] = [
  NAV_HOME,
  ...NAV_GROUPS.flatMap((g) => g.items),
];

export function isNavItemVisible(
  item: NavItem,
  permissions: string[],
  roles: string[],
): boolean {
  const teacherOnly = roles.includes('teacher') && !roles.includes('admin');
  if (item.hideForTeacherOnly && teacherOnly) return false;
  if (item.showForTeacherOnly && !teacherOnly) return false;

  if (item.role) {
    return roles.includes(item.role);
  }
  if (item.permission === null) return true;
  if (Array.isArray(item.permission)) {
    return item.permission.some((p) => permissions.includes(p));
  }
  return permissions.includes(item.permission);
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const pathOnly = (href.split('#')[0] || href).split('?')[0] || href;

  if (pathOnly === '/dashboard' || pathOnly === '/dashboard/my-portal') {
    // Sub-links into the portal (section=… / #…) should not steal "بوابتي" active state
    if (href.includes('#') || href.includes('?')) return false;
    return pathname === pathOnly;
  }
  if (pathOnly === '/dashboard/attendance') {
    return (
      pathname.startsWith('/dashboard/attendance') ||
      (pathname.includes('/sessions/') && pathname.endsWith('/attendance'))
    );
  }
  if (pathOnly === '/dashboard/payroll') {
    return pathname.startsWith('/dashboard/payroll');
  }
  if (pathOnly === '/dashboard/academic-structure') {
    return (
      pathname.startsWith('/dashboard/academic-structure') ||
      pathname.startsWith('/dashboard/stages') ||
      pathname.startsWith('/dashboard/grades')
    );
  }
  if (pathOnly === '/dashboard/catalog') {
    return (
      pathname.startsWith('/dashboard/catalog') ||
      pathname.startsWith('/dashboard/product-types') ||
      pathname.startsWith('/dashboard/plans') ||
      pathname.startsWith('/dashboard/plan-durations') ||
      (pathname.startsWith('/dashboard/class-offerings') && !pathname.match(/\/class-offerings\/\d+/))
    );
  }
  return pathname.startsWith(pathOnly);
}
