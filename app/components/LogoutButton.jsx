"use client";
import { signOut } from 'next-auth/react';

export default function LogoutButton({ className = "btn", label = "Logout" }) {
  return (
    <button className={className} onClick={() => signOut({ callbackUrl: '/' })}>
      {label}
    </button>
  );
}
