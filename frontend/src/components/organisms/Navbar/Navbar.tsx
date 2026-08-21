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

  const handleNuovoEvento = () => {
    if (pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("trigger-nuovo-evento"));
    } else {
      router.push("/dashboard?create=true");
    }
  };

  return (
    <nav className={`bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Logo + Separator + Nav Links */}
          <div className="flex items-center gap-4">
            {/* Logo Section */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                Presente! <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-bold px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">v1.0</span>
              </span>
            </div>

            {/* Separator */}
            <div className="h-6 border-l border-gray-200 dark:border-zinc-800" />

            {/* Navigation Links */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleNuovoEvento}
                  className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-750 dark:text-zinc-200 rounded text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                >
                  <PlusCircle className="h-4 w-4" /> Nuovo Evento
                </button>
                <div className="h-6 border-l border-gray-200 dark:border-zinc-800 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{session.user?.name}</span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 leading-tight">{(session.user as any)?.ruolo || 'Membro JEMORE'}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300">
                    <User className="h-4 w-4" />
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Esci"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : status === "loading" ? (
              <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 animate-pulse rounded"></div>
            ) : (
              <button
                onClick={() => signIn("azure-ad")}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" /> Accedi con Microsoft
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
