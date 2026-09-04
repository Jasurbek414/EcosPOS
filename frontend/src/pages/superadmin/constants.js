// Superadmin sahifalari o'rtasida ulashiladigan kichik konstantalar — alohida faylda,
// chunki komponent fayllaridan konstanta eksport qilish react-refresh/only-export-components
// qoidasini buzadi (Fast Refresh faqat komponent eksport qiladigan fayllarda ishlaydi).
export const STATUS_BADGE = {
  ACTIVE: 'badge badge-green',
  BLOCKED: 'badge badge-slate',
  SUSPENDED_UNPAID: 'badge badge-amber',
};
