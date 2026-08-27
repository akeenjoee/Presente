"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Calendar, ClipboardList, BarChart3, Users, PlusCircle, LogOut, LogIn, User } from "lucide-react";
import { NavbarProps } from "./Navbar.types";

export const Navbar: React.FC<NavbarProps> = ({ className = "" }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  if (pathname.startsWith("/checkin")) {
    return null;
  }

  const navItems = [
    {
      label: "Eventi",
      href: "/",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Analytics Soci",
      href: "/analytics",
      icon: <Users className="h-4 w-4" />,
    },
  ];


  return (
    <nav className={`bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left section: Logo */}
          <div className="flex items-center z-10 relative">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <img src="/blu-verticale.svg" alt="Logo JEMORE" className="h-5 w-auto object-contain" />
              <span className="hidden sm:block text-lg font-bold tracking-tight text-[#1f295c] dark:text-white whitespace-nowrap">
                Presente!
              </span>
            </Link>
            {/* Separator */}
            <div className="hidden sm:block h-6 border-l border-gray-200 dark:border-zinc-800 ml-4" />
          </div>

          {/* Center section: Navigation Links */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1 sm:space-x-2 z-10">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#2b397c] dark:bg-blue-600/20 text-white dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] sm:text-sm font-bold sm:font-semibold leading-none whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center shrink-0 z-10 relative">
            {session ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-sm font-bold text-[#1f295c] dark:text-white leading-tight">{session.user?.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{(session.user as any)?.ruolo || 'Membro JEMORE'}</span>
                  </div>
                  
                  {/* Dark Pill for Logout matching Formazing */}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors rounded-full text-xs font-semibold shrink-0"
                    title="Esci"
                  >
                    <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      <LogOut className="h-3 w-3" />
                    </div>
                    <span className="hidden sm:inline pr-1">Logout</span>
                  </button>
                </div>
              </div>
            ) : status === "loading" ? (
              <div className="flex items-center gap-4">
                <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 animate-pulse rounded"></div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                onClick={() => signIn("azure-ad")}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-semibold transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" /> Accedi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
