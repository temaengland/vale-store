"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export default function CartIcon({ onClick }: { onClick?: () => void }) {
  const { items } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onClick}
      aria-label="View cart"
      className="relative flex h-10 w-10 items-center justify-center text-ink"
    >
      <BagIcon />
      {items.length > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium text-white">
          {items.length}
        </span>
      )}
    </Link>
  );
}
