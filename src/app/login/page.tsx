"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Lock, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", data.user.id)
                    .single();

                if (profile?.role === "candidate") {
                    await supabase.auth.signOut();
                    toast.error("Access Denied: You are logged in as a Candidate.", {
                        description: "Please use the Candidate Portal.",
                        action: {
                            label: "Go to Candidate Portal",
                            onClick: () => window.location.href = "http://localhost:3000"
                        }
                    });
                    return;
                }

                toast.success("Welcome back!");
                router.push("/");
            }
        } catch (error: any) {
            toast.error(error.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-background text-foreground">
            <div className="hidden md:flex flex-col items-center justify-center p-10 bg-muted text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2E2E2E]/5 to-[#4a4a4a]/5 dark:from-white/5 dark:to-white/10" />
                <div className="relative z-10 max-w-md space-y-6">
                    <div className="h-20 w-20 rounded-2xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center mx-auto shadow-2xl">
                        <Briefcase className="h-10 w-10 text-white dark:text-[#2E2E2E]" />
                    </div>
                    <h1 className="text-4xl font-bold">HIRENEX HR</h1>
                    <p className="text-lg text-muted-foreground">
                        Streamline your hiring process with AI-driven insights and automated workflows.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm space-y-8"
                >
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold tracking-tight">Recruiter Login</h2>
                        <p className="text-muted-foreground text-sm mt-2">
                            Enter your credentials to access the dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                placeholder="recruiter@company.com"
                                className="bg-muted border-border"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                className="bg-muted border-border"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                            Sign In
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-primary hover:underline font-medium">
                            Register Organization
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
