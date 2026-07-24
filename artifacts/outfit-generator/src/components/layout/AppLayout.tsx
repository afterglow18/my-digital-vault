import React from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetWardrobeStats } from "@/hooks/useLocalWardrobe";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { data: stats } = useGetWardrobeStats();

  const wardrobeCount = stats?.total ?? undefined;

  const navItems = [
    { href: "/",       label: "Cabinet",   icon: null,       badge: wardrobeCount },
    { href: "/saved",  label: "Saved",     icon: Bookmark },
    { href: "/backup", label: "Account",   icon: UserCircle },
  ];

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden">

      {/* ── Sidebar — iPad / Desktop only (≥ 768 px) ───────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-52 md:flex-shrink-0 bg-[#141414] border-r-2 border-black">
        {/* Branding */}
        <div className="px-5 pt-10 pb-6 border-b border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30 mb-1">My</p>
          <h1
            className="font-black uppercase leading-none text-white"
            style={{ fontSize: 22, letterSpacing: "-0.02em" }}
          >
            Digital<br />Filing<br />Cabinet
          </h1>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150",
                  isActive
                    ? "bg-white/10 shadow-inner"
                    : "hover:bg-white/5 active:scale-[0.98]",
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-full border-2 relative transition-all shrink-0",
                    isActive ? "border-white/40" : "border-transparent",
                  )}
                  style={isActive ? { background: "linear-gradient(to bottom, #8a8a8a, #555)" } : undefined}
                >
                  {Icon ? (
                    <Icon
                      className={cn("w-5 h-5", isActive ? "text-white" : "text-white/40")}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  ) : (
                    <span className="text-lg leading-none select-none">🔐</span>
                  )}
                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-white text-black text-[9px] font-black border border-black w-4 h-4 flex items-center justify-center rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-bold uppercase tracking-wide",
                    isActive ? "text-white" : "text-white/40",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 pb-8">
          <p className="text-[10px] text-white/15 uppercase tracking-wider">My Digital Vault</p>
        </div>
      </aside>

      {/* ── Content + Mobile Bottom Nav ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto pb-[90px] md:pb-0 relative">
          {children}
        </main>

        {/* Bottom Navigation — iPhone only */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t-[3px] border-black p-3 pb-safe z-[40]">
          <ul className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href} className="relative">
                  <Link href={item.href} className="flex flex-col items-center gap-1 group">
                    <div
                      className={cn(
                        "p-2.5 rounded-full border-2 transition-all duration-200 ease-spring relative",
                        isActive
                          ? "border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                          : "bg-transparent border-transparent group-hover:bg-muted group-active:scale-95",
                      )}
                      style={isActive ? { background: "linear-gradient(to bottom, #8a8a8a, #666666)" } : undefined}
                    >
                      {Icon ? (
                        <Icon
                          className={cn("w-6 h-6", isActive ? "text-black" : "text-muted-foreground")}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      ) : (
                        <span className="text-xl leading-none select-none">🔐</span>
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <div className="absolute -top-2 -right-2 bg-secondary text-black text-[10px] font-bold border-2 border-black w-5 h-5 flex items-center justify-center rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          {item.badge > 99 ? "99+" : item.badge}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider transition-colors",
                        isActive ? "text-black" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
