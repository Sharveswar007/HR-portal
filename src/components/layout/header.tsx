"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Briefcase,
    BarChart3,
    Moon,
    Sun,
    Menu,
    X,
    Home,
    Users,
    LogOut,
    Search,
    Settings,
    MessageSquare,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/candidates", label: "Candidates", icon: Users },
    { href: "https://hirenex-phi.vercel.app/", label: "Group Discussion", icon: MessageSquare, external: true },
];

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (
        pathname?.startsWith("/login") ||
        pathname?.startsWith("/signup")
    ) {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2">
                    <motion.div
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E2E2E] dark:bg-white shadow-lg"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Briefcase className="h-5 w-5 text-white dark:text-[#2E2E2E]" />
                    </motion.div>
                    <div className="hidden sm:block">
                        <span className="font-bold text-xl text-[#2E2E2E] dark:text-white">
                            HIRENEX
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">HR</span>
                    </div>
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {navItems.map((item: any) => {
                        const isActive = !item.external && (pathname === item.href ||
                            (item.href !== "/" && pathname?.startsWith(item.href)));
                        
                        if (item.external) {
                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                            );
                        }
                        
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavHR"
                                        className="absolute inset-0 bg-[#2E2E2E]/10 rounded-lg border border-[#2E2E2E]/20 dark:bg-white/10 dark:border-white/20"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    {mounted && (
                        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    )}

                    {mounted && (
                        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={theme}
                                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </motion.div>
                            </AnimatePresence>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden border-t border-border bg-background"
                    >
                        <nav className="container px-4 py-4 flex flex-col gap-2">
                            {navItems.map((item: any) => {
                                const isActive = !item.external && (pathname === item.href ||
                                    (item.href !== "/" && pathname?.startsWith(item.href)));
                                
                                if (item.external) {
                                    return (
                                        <a
                                            key={item.href}
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span className="font-medium">{item.label}</span>
                                            <ExternalLink className="h-4 w-4 opacity-50 ml-auto" />
                                        </a>
                                    );
                                }
                                
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                            isActive
                                                ? "bg-[#2E2E2E]/10 dark:bg-white/10 text-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
