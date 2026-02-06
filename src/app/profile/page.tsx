"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building, Globe, User, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function HRProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        company_name: "",
        company_domain: "",
        company_website: "",
        designation: "",
        official_id: "",
        is_authorized_recruiter: false
    });

    const supabase = createClient();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (data) {
            setFormData({
                full_name: data.full_name || "",
                email: data.email || user.email || "",
                company_name: data.company_name || "",
                company_domain: data.company_domain || "",
                company_website: data.company_website || "",
                designation: data.designation || "",
                official_id: data.official_id || "",
                is_authorized_recruiter: data.is_authorized_recruiter || false
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    company_domain: formData.company_domain,
                    company_website: formData.company_website,
                    designation: formData.designation,
                    official_id: formData.official_id,
                    updated_at: new Date().toISOString()
                })
                .eq("id", userId);

            if (error) throw error;
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Header */}
            <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-semibold">Recruiter Profile</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 max-w-4xl">
                <div className="grid gap-8">
                    {/* Authorization Status */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${formData.is_authorized_recruiter ? "bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white" : "bg-[#2E2E2E]/5 dark:bg-white/5 text-[#2E2E2E]/60 dark:text-white/60"}`}>
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Verification Status</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {formData.is_authorized_recruiter
                                            ? "You are a verifiable recruiter for your organization."
                                            : "Pending verification. Limited access to some features."}
                                    </p>
                                </div>
                            </div>
                            {formData.is_authorized_recruiter && (
                                <span className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E] text-xs px-3 py-1 rounded-full font-medium">Verified</span>
                            )}
                        </div>
                    </Card>

                    {/* Personal Info */}
                    <Card className="p-8 bg-card border-border space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-border">
                            <User className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold">Personal Details</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-foreground">Full Name</Label>
                                <Input
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="bg-muted border-border focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Work Email</Label>
                                <Input
                                    value={formData.email}
                                    disabled
                                    className="bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Job Designation</Label>
                                <Input
                                    value={formData.designation}
                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                    placeholder="e.g. Senior Recruiter"
                                    className="bg-muted border-border focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Employee ID</Label>
                                <Input
                                    value={formData.official_id}
                                    onChange={e => setFormData({ ...formData, official_id: e.target.value })}
                                    placeholder="Optional"
                                    className="bg-muted border-border focus:border-primary"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Company Info */}
                    <Card className="p-8 bg-card border-border space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-border">
                            <Building className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold">Company Information</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-foreground">Company Name</Label>
                                <Input
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                    className="bg-muted border-border focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Website</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={formData.company_website}
                                        onChange={e => setFormData({ ...formData, company_website: e.target.value })}
                                        className="pl-9 bg-muted border-border focus:border-primary"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-foreground">Official Domain (for verification)</Label>
                                <Input
                                    value={formData.company_domain}
                                    onChange={e => setFormData({ ...formData, company_domain: e.target.value })}
                                    placeholder="example.com"
                                    className="bg-muted border-border focus:border-primary"
                                />
                                <p className="text-xs text-muted-foreground">Only emails from this domain will be auto-verified.</p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 min-w-[120px]"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
