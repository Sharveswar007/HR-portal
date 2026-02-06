"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
    Loader2,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp,
    Target,
    Brain,
    Code,
    Shield,
    UserCheck,
    UserX,
    ArrowUpRight,
    BarChart2,
    ThumbsUp,
    ThumbsDown,
    Undo2,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Candidate {
    id: string;
    candidate_id: string;
    job_id: string | null;
    status: string;
    total_score: number;
    technical_score: number;
    psychometric_score: number;
    coding_score: number;
    integrity_score: number;
    proctoring_flags: number;
    created_at: string;
    completed_at: string | null;
    profiles: {
        full_name: string;
        email: string;
        avatar_url?: string;
    } | null;
    job_descriptions?: {
        title: string;
        company_name: string;
    } | null;
}

interface CandidateStats {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    avgScore: number;
    highRisk: number;
    topScorer: number;
    hired: number;
    rejected: number;
}

export default function CandidatesPage() {
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("date");
    const [decisions, setDecisions] = useState<Record<string, 'hired' | 'rejected' | null>>({});
    const [savingDecision, setSavingDecision] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        try {
            // 1. Fetch sessions with job info
            const { data: sessions, error: sessionsError } = await supabase
                .from("assessment_sessions")
                .select(`
                    *,
                    job_descriptions:job_id (title, company_name)
                `)
                .order("created_at", { ascending: false });

            if (sessionsError) throw sessionsError;

            if (sessions && sessions.length > 0) {
                // 2. Fetch profiles for these sessions
                const candidateIds = Array.from(new Set(sessions.map(s => s.candidate_id)));

                const { data: profiles, error: profilesError } = await supabase
                    .from("profiles")
                    .select("id, full_name, email, avatar_url")
                    .in("id", candidateIds);

                if (profilesError) throw profilesError;

                // 3. Merge data
                const profilesMap = new Map(profiles?.map(p => [p.id, p]));

                const mergedData = sessions.map(session => ({
                    ...session,
                    profiles: profilesMap.get(session.candidate_id) || { full_name: "Unknown", email: "No email" }
                }));

                setCandidates(mergedData as Candidate[]);
            } else {
                setCandidates([]);
            }
        } catch (error) {
            console.error("Error loading candidates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (candidateId: string, sessionId: string, decision: 'hired' | 'rejected') => {
        setSavingDecision(sessionId);
        try {
            // Update decisions state
            setDecisions(prev => ({ ...prev, [sessionId]: decision }));
            
            // Try to update application record if it exists
            const { error } = await supabase
                .from('applications')
                .update({ 
                    final_decision: decision === 'hired' ? 'hire' : 'no_hire',
                    status: decision === 'hired' ? 'hired' : 'rejected',
                    updated_at: new Date().toISOString()
                })
                .eq('candidate_id', candidateId);
            
            if (error) {
                console.log('No application record found, decision saved locally');
            }
        } catch (error) {
            console.error('Error saving decision:', error);
        } finally {
            setSavingDecision(null);
        }
    };

    const handleUndoDecision = (sessionId: string) => {
        setDecisions(prev => ({ ...prev, [sessionId]: null }));
    };

    // Calculate stats
    const stats = useMemo<CandidateStats>(() => {
        const completed = candidates.filter(c => c.status === "completed");
        const completedScores = completed.filter(c => c.total_score != null);
        const avgScore = completedScores.length > 0
            ? Math.round(completedScores.reduce((sum, c) => sum + (c.total_score || 0), 0) / completedScores.length)
            : 0;
        const topScore = completedScores.length > 0
            ? Math.max(...completedScores.map(c => c.total_score || 0))
            : 0;
        const highRisk = candidates.filter(c => (c.proctoring_flags || 0) > 5).length;

        const hired = Object.values(decisions).filter(d => d === 'hired').length;
        const rejected = Object.values(decisions).filter(d => d === 'rejected').length;

        return {
            total: candidates.length,
            completed: completed.length,
            inProgress: candidates.filter(c => c.status === "in_progress").length,
            pending: candidates.filter(c => c.status !== "completed" && c.status !== "in_progress").length,
            avgScore,
            highRisk,
            topScorer: topScore,
            hired,
            rejected,
        };
    }, [candidates, decisions]);

    const filteredCandidates = useMemo(() => {
        let result = candidates.filter((candidate) => {
            const matchesSearch =
                candidate.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                candidate.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                candidate.job_descriptions?.title?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Sort
        if (sortBy === "score") {
            result = result.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
        } else if (sortBy === "date") {
            result = result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return result;
    }, [candidates, searchQuery, statusFilter, sortBy]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white border-[#2E2E2E]/20 dark:border-white/20"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
            case "in_progress":
                return <Badge className="bg-[#2E2E2E]/5 dark:bg-white/5 text-[#2E2E2E]/70 dark:text-white/70 border-[#2E2E2E]/10 dark:border-white/10"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
            default:
                return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
        }
    };

    const getRiskLevel = (flags: number) => {
        if (flags > 5) return <Badge className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E] border-transparent">High Risk</Badge>;
        if (flags > 2) return <Badge className="bg-[#2E2E2E]/60 dark:bg-white/60 text-white dark:text-[#2E2E2E] border-transparent">Medium</Badge>;
        return <Badge className="bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white border-[#2E2E2E]/20 dark:border-white/20">Low</Badge>;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center">
                                <Users className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">All Candidates</h1>
                                <p className="text-sm text-muted-foreground">{candidates.length} total candidates</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
                        {[
                            { label: "Total", value: stats.total, icon: Users, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "Pending", value: stats.pending, icon: AlertTriangle, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "Avg Score", value: `${stats.avgScore}%`, icon: BarChart2, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "High Risk", value: stats.highRisk, icon: Shield, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "Top Score", value: `${stats.topScorer}%`, icon: TrendingUp, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
                            { label: "Hired", value: stats.hired, icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
                            { label: "Rejected", value: stats.rejected, icon: UserX, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
                        ].map((stat, idx) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="p-3 bg-card border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`h-7 w-7 rounded-md ${stat.bg} flex items-center justify-center`}>
                                            <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold">{stat.value}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Filters */}
                    <Card className="p-4 bg-card border-border">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or job title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-muted border-border"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant={statusFilter === "all" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("all")}
                                    size="sm"
                                >
                                    All
                                </Button>
                                <Button
                                    variant={statusFilter === "completed" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("completed")}
                                    size="sm"
                                >
                                    Completed
                                </Button>
                                <Button
                                    variant={statusFilter === "in_progress" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("in_progress")}
                                    size="sm"
                                >
                                    In Progress
                                </Button>
                                <div className="border-l border-border mx-2" />
                                <Button
                                    variant={sortBy === "date" ? "default" : "outline"}
                                    onClick={() => setSortBy("date")}
                                    size="sm"
                                >
                                    Latest
                                </Button>
                                <Button
                                    variant={sortBy === "score" ? "default" : "outline"}
                                    onClick={() => setSortBy("score")}
                                    size="sm"
                                >
                                    Top Scores
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Candidates Table */}
                    <Card className="bg-card border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-muted/50">
                                    <TableHead className="text-muted-foreground">Candidate</TableHead>
                                    <TableHead className="text-muted-foreground">Job Applied</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-muted-foreground">Total Score</TableHead>
                                    <TableHead className="text-muted-foreground">Breakdown</TableHead>
                                    <TableHead className="text-muted-foreground">Integrity</TableHead>
                                    <TableHead className="text-muted-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCandidates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No candidates found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCandidates.map((candidate) => (
                                        <TableRow key={candidate.id} className="border-border hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                                                        {(candidate.profiles?.full_name || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{candidate.profiles?.full_name || "Unknown"}</p>
                                                        <p className="text-xs text-muted-foreground">{candidate.profiles?.email || "No email"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[140px]">
                                                    <p className="font-medium text-sm truncate">
                                                        {candidate.job_descriptions?.title || "General Assessment"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {candidate.job_descriptions?.company_name || "—"}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-lg font-bold ${
                                                        (candidate.total_score || 0) >= 70 ? "text-[#2E2E2E] dark:text-white" :
                                                        (candidate.total_score || 0) >= 50 ? "text-[#2E2E2E]/70 dark:text-white/70" :
                                                        "text-[#2E2E2E]/50 dark:text-white/50"
                                                    }`}>
                                                        {candidate.total_score || 0}%
                                                    </div>
                                                    <div className="w-16">
                                                        <Progress value={candidate.total_score || 0} className="h-1.5" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <div className="flex items-center gap-1" title="Technical">
                                                        <Target className="h-3 w-3 text-[#2E2E2E] dark:text-white" />
                                                        <span>{candidate.technical_score || 0}%</span>
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Psychometric">
                                                        <Brain className="h-3 w-3 text-[#2E2E2E] dark:text-white" />
                                                        <span>{candidate.psychometric_score || 0}%</span>
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Coding">
                                                        <Code className="h-3 w-3 text-[#2E2E2E] dark:text-white" />
                                                        <span>{candidate.coding_score || 0}%</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRiskLevel(candidate.proctoring_flags || 0)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {decisions[candidate.id] ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={decisions[candidate.id] === 'hired' 
                                                                ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' 
                                                                : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                                                            }>
                                                                {decisions[candidate.id] === 'hired' ? (
                                                                    <><UserCheck className="h-3 w-3 mr-1" />Hired</>
                                                                ) : (
                                                                    <><UserX className="h-3 w-3 mr-1" />Rejected</>
                                                                )}
                                                            </Badge>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleUndoDecision(candidate.id)}
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                <Undo2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDecision(candidate.candidate_id, candidate.id, 'hired')}
                                                                disabled={savingDecision === candidate.id}
                                                                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                                            >
                                                                <ThumbsUp className="h-4 w-4 mr-1" />
                                                                Hire
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDecision(candidate.candidate_id, candidate.id, 'rejected')}
                                                                disabled={savingDecision === candidate.id}
                                                                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                                            >
                                                                <ThumbsDown className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Link href={`/candidate/${candidate.candidate_id}`}>
                                                        <Button variant="ghost" size="sm" className="group h-8 px-2">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
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
