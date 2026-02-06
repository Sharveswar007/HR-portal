"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SignupPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        companyName: ""
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Sign Up
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: "recruiter", // Force role
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                toast.success("Account created successfully!");
                router.push("/");
            }
        } catch (error: any) {
            toast.error(error.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-background text-foreground">
            {/* Visual Side */}
            <div className="hidden md:flex flex-col items-center justify-center p-10 bg-card text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                <div className="relative z-10 max-w-md space-y-6">
                    <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-2xl shadow-primary/20">
                        <Briefcase className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <h1 className="text-4xl font-bold">Join TalentPulse</h1>
                    <p className="text-lg text-muted-foreground">
                        Start hiring the best talent with our AI-powered recruitment platform.
                    </p>
                </div>
            </div>

            {/* Signup Form Side */}
            <div className="flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm space-y-8"
                >
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold tracking-tight">Create HR Account</h2>
                        <p className="text-muted-foreground text-sm mt-2">
                            Register your organization
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                placeholder="John Doe"
                                className="bg-muted border-border"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                                placeholder="Acme Inc"
                                className="bg-muted border-border"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                placeholder="recruiter@company.com"
                                className="bg-muted border-border"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                className="bg-muted border-border"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Create Account
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline font-medium">
                            Sign In
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
