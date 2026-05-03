"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  Bitcoin,
  Receipt,
  Settings,
  Building2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "Vue d'ensemble", icon: Home },
  { href: "/accounts", label: "Comptes", icon: Wallet },
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/crypto", label: "Crypto", icon: Bitcoin },
  { href: "/liabilities", label: "Dettes", icon: Receipt },
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">
            Patrimoine
          </span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => {
            const Icon = l.icon;
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
      <nav className="container flex items-center gap-1 overflow-x-auto pb-2 pt-1 md:hidden">
        {links.map((l) => {
          const Icon = l.icon;
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
