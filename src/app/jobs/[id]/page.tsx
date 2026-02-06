"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft,
    MapPin,
    Building2,
    Clock,
    Briefcase,
    Target,
    Brain,
    Shield,
    Pencil,
    Users
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function JobDetailsPage() {
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<any>(null);
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchJob = async () => {
            const { data, error } = await supabase
                .from("job_descriptions")
                .select("*")
                .eq("id", params.id)
                .single();

            if (error) {
                console.error("Error fetching job:", error);
            } else {
                setJob(data);
            }
            setLoading(false);
        };

        if (params.id) {
            fetchJob();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground gap-4">
                <h2 className="text-2xl font-bold">Job Not Found</h2>
                <Link href="/">
                    <Button variant="outline">Back to Dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="hover:bg-accent text-muted-foreground">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{job.title}</h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                {job.company_name} <span className="text-muted-foreground/50">•</span> {job.location}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className={job.status === 'active' ? 'bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white' : 'bg-muted text-muted-foreground'}>
                            {job.status.toUpperCase()}
                        </Badge>
                        <Link href={`/jobs/${job.id}/applications`}>
                            <Button className="bg-primary text-primary-foreground">
                                <Users className="mr-2 h-4 w-4" /> Applications
                            </Button>
                        </Link>
                        <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                            <Pencil className="mr-2 h-4 w-4" /> Edit Job
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 max-w-5xl">
                <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">

                    {/* Main Content: Description & Requirements */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="p-8 bg-card border-border space-y-6 shadow-sm">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                                        <Briefcase className="h-5 w-5" />
                                        Job Description
                                    </h3>
                                    <div className="prose prose-slate max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {job.description}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                                        <Target className="h-5 w-5" />
                                        Requirements
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.requirements?.map((req: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="bg-secondary text-secondary-foreground px-3 py-1">
                                                {req}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Sidebar: Stats & Criteria */}
                    <div className="space-y-6">

                        {/* Applicant Stats */}
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-primary">Applicants</h3>
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-3xl font-bold text-primary mb-1">
                                    0 {/* TODO: Fetch real count */}
                                </div>
                                <p className="text-xs text-muted-foreground">Candidates applied so far</p>
                            </Card>
                        </motion.div>

                        {/* AI Criteria Config */}
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="p-6 bg-card border-border space-y-4 shadow-sm">
                                <h3 className="font-semibold text-foreground mb-4">AI Scoring Config</h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Target className="h-4 w-4 text-[#2E2E2E] dark:text-white" /> Technical Min
                                        </span>
                                        <span className="font-bold text-[#2E2E2E] dark:text-white">{job.criteria?.technical || 0}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-[#2E2E2E] dark:bg-white" style={{ width: `${job.criteria?.technical || 0}%` }} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Brain className="h-4 w-4 text-[#2E2E2E] dark:text-white" /> Culture Fit
                                        </span>
                                        <span className="font-bold text-[#2E2E2E] dark:text-white">{job.criteria?.psychometric || 0}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-[#2E2E2E] dark:bg-white" style={{ width: `${job.criteria?.psychometric || 0}%` }} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-[#2E2E2E] dark:text-white" /> Integrity
                                        </span>
                                        <span className="font-bold text-[#2E2E2E] dark:text-white">{job.criteria?.integrity || 0}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-[#2E2E2E] dark:bg-white" style={{ width: `${job.criteria?.integrity || 0}%` }} />
                                    </div>
                                </div>

                            </Card>
                        </motion.div>

                        {/* Quick Details */}
                        <Card className="p-6 bg-card border-border font-mono text-xs space-y-3 text-muted-foreground shadow-sm">
                            <div className="flex justify-between">
                                <span>Created On</span>
                                <span className="text-foreground">{new Date(job.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Job ID</span>
                                <span className="text-foreground truncate max-w-[120px]" title={job.id}>{job.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Location</span>
                                <span className="text-foreground">{job.location}</span>
                            </div>
                        </Card>

                    </div>
                </div>
            </main>
        </div>
    );
}
