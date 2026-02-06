// Job Applications Page for HR Portal
// Shows all applications for a specific job with pipeline stages

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Users,
    Search,
    Eye,
    ChevronLeft,
    Loader2,
    CheckCircle,
    Clock,
    FileText,
    Target,
    Brain,
    Briefcase,
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Application {
    id: string;
    candidate_id: string;
    job_id: string;
    status: string;
    current_stage: string;
    resume_uploaded: boolean;
    resume_score: number;
    eligibility_score: number;
    is_eligible: boolean;
    mcq_score: number;
    coding_score: number;
    psychometric_score: number;
    composite_score: number;
    decision: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    } | null;
}

interface Job {
    id: string;
    title: string;
    company_name: string;
}

export default function JobApplicationsPage() {
    const params = useParams();
    const jobId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<Job | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [stageFilter, setStageFilter] = useState<string>("all");

    const supabase = createClient();

    useEffect(() => {
        if (jobId) loadData();
    }, [jobId]);

    const loadData = async () => {
        try {
            // Fetch job details
            const { data: jobData } = await supabase
                .from("job_descriptions")
                .select("id, title, company_name")
                .eq("id", jobId)
                .single();

            if (jobData) setJob(jobData);

            // Fetch applications for this job
            const { data: apps, error: appsError } = await supabase
                .from("applications")
                .select("*")
                .eq("job_id", jobId)
                .order("created_at", { ascending: false });

            if (appsError) {
                console.error("Error loading applications:", appsError);
            }

            if (apps && apps.length > 0) {
                // Fetch profiles
                const candidateIds = Array.from(new Set(apps.map(a => a.candidate_id)));
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, full_name, email")
                    .in("id", candidateIds);

                const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

                const mergedData = apps.map(app => ({
                    ...app,
                    profiles: profilesMap.get(app.candidate_id) || { full_name: "Unknown", email: "No email" }
                }));

                setApplications(mergedData as Application[]);
            } else {
                setApplications([]);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredApplications = applications.filter((app) => {
        const matchesSearch =
            app.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStage = stageFilter === "all" || app.current_stage === stageFilter;

        return matchesSearch && matchesStage;
    });

    const getStageBadge = (stage: string) => {
        const stages: Record<string, { color: string; icon: any; label: string }> = {
            resume: { color: "bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white", icon: FileText, label: "Resume" },
            eligibility: { color: "bg-[#2E2E2E]/20 dark:bg-white/20 text-[#2E2E2E] dark:text-white", icon: Target, label: "Eligibility" },
            assessment: { color: "bg-primary/20 text-primary", icon: Brain, label: "Assessment" },
            decision: { color: "bg-[#2E2E2E]/30 dark:bg-white/30 text-[#2E2E2E] dark:text-white", icon: Briefcase, label: "Decision" },
        };
        const s = stages[stage] || stages.resume;
        const Icon = s.icon;
        return <Badge className={s.color}><Icon className="h-3 w-3 mr-1" />{s.label}</Badge>;
    };

    const getDecisionBadge = (decision: string) => {
        switch (decision) {
            case "approved":
            case "accepted":
                return <Badge className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]"><ThumbsUp className="h-3 w-3 mr-1" />Approved</Badge>;
            case "rejected":
                return <Badge className="bg-[#2E2E2E]/50 dark:bg-white/50 text-white dark:text-[#2E2E2E]"><ThumbsDown className="h-3 w-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
        }
    };

    const handleDecision = async (applicationId: string, decision: "approved" | "rejected") => {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase
            .from("applications")
            .update({
                decision,
                current_stage: "decision",
                decided_by: user?.id,
                decided_at: new Date().toISOString(),
            })
            .eq("id", applicationId);

        loadData();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={`/jobs/${jobId}`}>
                                <Button variant="ghost" size="icon">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Applications</h1>
                                <p className="text-xs text-muted-foreground">{job?.title} • {applications.length} applicants</p>
                            </div>
                        </div>
                        <nav className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Dashboard</Button>
                            </Link>
                            <Link href="/candidates">
                                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">All Candidates</Button>
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: "Total", value: applications.length, color: "from-blue-500 to-cyan-500" },
                            { label: "Resume Stage", value: applications.filter(a => a.current_stage === "resume").length, color: "from-blue-500 to-blue-600" },
                            { label: "Assessment Stage", value: applications.filter(a => a.current_stage === "assessment").length, color: "from-primary to-primary/70" },
                            { label: "Decision Stage", value: applications.filter(a => a.current_stage === "decision").length, color: "from-emerald-500 to-teal-600" },
                        ].map((stat, i) => (
                            <Card key={i} className="p-4 bg-card border-border">
                                <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                    {stat.value}
                                </div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Filters */}
                    <Card className="p-4 bg-card border-border">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-muted border-border"
                                />
                            </div>
                            <div className="flex gap-2">
                                {["all", "resume", "eligibility", "assessment", "decision"].map((stage) => (
                                    <Button
                                        key={stage}
                                        variant={stageFilter === stage ? "default" : "outline"}
                                        onClick={() => setStageFilter(stage)}
                                        size="sm"
                                        className="capitalize"
                                    >
                                        {stage}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Applications Table */}
                    <Card className="bg-card border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-accent">
                                    <TableHead className="text-muted-foreground">Candidate</TableHead>
                                    <TableHead className="text-muted-foreground">Stage</TableHead>
                                    <TableHead className="text-muted-foreground">Resume</TableHead>
                                    <TableHead className="text-muted-foreground">Eligibility</TableHead>
                                    <TableHead className="text-muted-foreground">Assessment</TableHead>
                                    <TableHead className="text-muted-foreground">Decision</TableHead>
                                    <TableHead className="text-muted-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredApplications.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No applications found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredApplications.map((app) => (
                                        <TableRow key={app.id} className="border-border hover:bg-accent">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                                                        {(app.profiles?.full_name || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{app.profiles?.full_name || "Unknown"}</p>
                                                        <p className="text-xs text-muted-foreground">{app.profiles?.email || "No email"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStageBadge(app.current_stage)}</TableCell>
                                            <TableCell>
                                                {app.resume_uploaded ? (
                                                    <span className="text-[#2E2E2E] dark:text-white font-medium">{app.resume_score || 0}%</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Not uploaded</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {app.is_eligible !== null ? (
                                                    app.is_eligible ? (
                                                        <Badge className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]">Eligible</Badge>
                                                    ) : (
                                                        <Badge className="bg-[#2E2E2E]/40 dark:bg-white/40 text-white dark:text-[#2E2E2E]">Not Eligible</Badge>
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {app.composite_score ? (
                                                    <span className="text-primary font-medium">{app.composite_score}%</span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getDecisionBadge(app.decision)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/candidate/${app.candidate_id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                    {app.current_stage === "decision" && app.decision === "pending" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-[#2E2E2E] dark:bg-white hover:bg-[#2E2E2E]/90 dark:hover:bg-white/90 text-white dark:text-[#2E2E2E]"
                                                                onClick={() => handleDecision(app.id, "approved")}
                                                            >
                                                                <ThumbsUp className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleDecision(app.id, "rejected")}
                                                            >
                                                                <ThumbsDown className="h-3 w-3" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}
