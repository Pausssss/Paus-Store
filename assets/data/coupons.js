/**
 * PAUS STORE — COUPON DEMO/FALLBACK
 *
 * Các mã dưới đây chỉ phục vụ chạy local khi Supabase chưa kết nối.
 * Coupon live được lưu trong Supabase và storefront chỉ kiểm tra từng mã qua RPC.
 */
window.COUPONS = {
  DEMO10: { type: "percent", value: 10, label: "Demo giảm 10%" },
  DEMO50: { type: "fixed", value: 50000, label: "Demo giảm 50.000đ" },
  DEMOFREESHIP: {
    type: "shipping",
    value: 0,
    label: "Demo miễn phí vận chuyển",
  },
};
