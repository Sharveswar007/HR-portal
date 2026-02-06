"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    User,
    ChevronLeft,
    Loader2,
    Brain,
    Target,
    Code,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    TrendingUp,
    MessageSquare,
    Terminal,
    Activity,
    Layers,
    Award,
    BarChart3,
    Zap,
    ThumbsUp,
    ThumbsDown,
    GraduationCap,
    Briefcase,
    Video,
    Download,
    Star,
    Lightbulb,
    ChevronDown,
    Eye,
    ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    PieChart,
    Pie,
    Legend,
} from "recharts";

interface CandidateProfile {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    location?: string;
    avatar_url?: string;
    college?: string;
    current_education?: string;
    job_title?: string;
    years_experience?: number;
    industry?: string;
    skills?: string[] | null;
    linkedin_url?: string;
    resume_url?: string;
    onboarding_complete?: boolean;
    updated_at?: string;
    // Extended profile fields
    institute_name?: string;
    education_major?: string;
    graduation_year?: string;
    cgpa?: string;
    backlogs?: number;
    tenth_marks?: string;
    twelfth_marks?: string;
    current_company?: string;
    current_designation?: string;
    employment_status?: string;
    notice_period?: string;
    expected_salary?: string;
    current_salary?: string;
    skills_primary?: string[];
    skills_secondary?: string[];
    github_url?: string;
    portfolio_url?: string;
    gender?: string;
    date_of_birth?: string;
    current_city?: string;
    country?: string;
    languages?: string[];
    resume_score?: number;
    resume_summary?: string;
    resume_skills?: string[];
}

interface Application {
    id: string;
    job_id: string;
    candidate_id: string;
    current_stage: string;
    resume_score: number;
    resume_summary: string | null;
    resume_strengths: string[] | null;
    resume_weaknesses: string[] | null;
    resume_skills: string[] | null;
    resume_experience_years: number | null;
    resume_education: string | null;
    composite_score: number | null;
    decision: string | null;
    job_descriptions?: {
        title: string;
        company: string;
    };
}

interface ProctoringEvent {
    id: string;
    event_type: string;
    severity: string;
    description?: string;
    client_timestamp?: string;
    created_at?: string;
    meta?: any;
    screenshot_url?: string;
    details?: any;
}

interface Session {
    id: string;
    status: string;
    total_score: number;
    technical_score: number;
    psychometric_score: number;
    coding_score: number;
    communication_score: number;
    proctoring_flags: number;
    created_at: string;
    completed_at: string | null;
    recommendation: string | null;
    recommendation_rationale: string | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
}

interface CodingSubmission {
    id: string;
    code: string;
    language: string;
    status: string;
    tests_passed: number;
    tests_total: number;
    created_at: string;
    challenges: {
        title: string;
        difficulty: string;
    };
}

interface TextResponse {
    id: string;
    response_text: string;
    total_score: number;
    ai_feedback: string;
    text_questions: {
        question_text: string;
        category: string;
    };
}

interface PsychometricProfile {
    openness_score: number;
    conscientiousness_score: number;
    extraversion_score: number;
    agreeableness_score: number;
    neuroticism_score: number;
    leadership_score: number;
    teamwork_score: number;
    emotional_intelligence_score: number;
    personality_summary: string;
}

export default function CandidateDetailPage() {
    const params = useParams();
    const candidateId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<CandidateProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [events, setEvents] = useState<ProctoringEvent[]>([]);
    const [codingSubmissions, setCodingSubmissions] = useState<CodingSubmission[]>([]);
    const [textResponses, setTextResponses] = useState<TextResponse[]>([]);
    const [psychometric, setPsychometric] = useState<PsychometricProfile | null>(null);
    const [proctoringScreenshots, setProctoringScreenshots] = useState<any[]>([]);
    const [proctoringRecordings, setProctoringRecordings] = useState<any[]>([]);
    const [proctoringSummary, setProcotoringSummary] = useState<any>(null);
    const [resumeFiles, setResumeFiles] = useState<any[]>([]);
    const [resumeAnalyses, setResumeAnalyses] = useState<any[]>([]);
    const [isProcessingDecision, setIsProcessingDecision] = useState(false);
    const [decisionStatus, setDecisionStatus] = useState<string | null>(null);

    // Handle HR decision (hire/reject/consider)
    const handleDecision = async (decision: "hired" | "rejected" | "consider") => {
        setIsProcessingDecision(true);
        try {
            const response = await fetch(`/api/candidate/${candidateId}/decision`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    decision,
                    applicationId: applications[0]?.id,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update decision");
            }

            const result = await response.json();
            setDecisionStatus(decision);
            
            // Update local application state
            setApplications(prev => prev.map(app => ({
                ...app,
                decision: decision,
                current_stage: decision === "hired" ? "hired" : decision === "rejected" ? "rejected" : "decision",
            })));

            // Update session state
            if (session) {
                setSession({
                    ...session,
                    recommendation: decision === "hired" ? "hire" : decision === "rejected" ? "reject" : "consider",
                });
            }

            alert(result.message);
        } catch (error) {
            console.error("Decision error:", error);
            alert("Failed to update candidate decision. Please try again.");
        } finally {
            setIsProcessingDecision(false);
        }
    };

    useEffect(() => {
        if (candidateId) {
            loadCandidateData();
        }
    }, [candidateId]);

    const loadCandidateData = async () => {
        try {
            // Use API route that has admin access to bypass RLS
            const response = await fetch(`/api/candidate/${candidateId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch candidate data");
            }

            const data = await response.json();

            if (data.profile) {
                setProfile(data.profile as CandidateProfile);
            }

            if (data.applications) {
                setApplications(data.applications as Application[]);
            }

            if (data.session) {
                setSession(data.session as Session);
            }

            if (data.proctoringEvents) {
                setEvents(data.proctoringEvents as ProctoringEvent[]);
            }

            if (data.codingSubmissions) {
                setCodingSubmissions(data.codingSubmissions as any[]);
            }

            if (data.textResponses) {
                setTextResponses(data.textResponses as any[]);
            }

            if (data.psychometric) {
                setPsychometric(data.psychometric as PsychometricProfile);
            }

            if (data.proctoringScreenshots) {
                setProctoringScreenshots(data.proctoringScreenshots);
            }

            if (data.proctoringRecordings) {
                setProctoringRecordings(data.proctoringRecordings);
            }

            if (data.proctoringSummary) {
                setProcotoringSummary(data.proctoringSummary);
            }

            if (data.resumeFiles) {
                setResumeFiles(data.resumeFiles);
            }

            if (data.resumeAnalyses) {
                setResumeAnalyses(data.resumeAnalyses);
            }
        } catch (error) {
            console.error("Error loading candidate:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case "critical": return <Badge className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]">Critical</Badge>;
            case "high": return <Badge className="bg-[#2E2E2E]/80 dark:bg-white/80 text-white dark:text-[#2E2E2E]">High</Badge>;
            case "medium": return <Badge className="bg-[#2E2E2E]/60 dark:bg-white/60 text-white dark:text-[#2E2E2E]">Medium</Badge>;
            default: return <Badge className="bg-muted text-muted-foreground">Low</Badge>;
        }
    };

    const getRecommendationBadge = (rec: string | null) => {
        switch (rec) {
            case "hire": return <Badge className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E] text-lg px-4 py-1"><CheckCircle className="h-4 w-4 mr-2" />Recommended to Hire</Badge>;
            case "no_hire": return <Badge className="bg-[#2E2E2E]/50 dark:bg-white/50 text-white dark:text-[#2E2E2E] text-lg px-4 py-1"><XCircle className="h-4 w-4 mr-2" />Not Recommended</Badge>;
            case "further_evaluation": return <Badge className="bg-[#2E2E2E]/70 dark:bg-white/70 text-white dark:text-[#2E2E2E] text-lg px-4 py-1"><Clock className="h-4 w-4 mr-2" />Further Evaluation</Badge>;
            default: return <Badge className="bg-muted text-muted-foreground text-lg px-4 py-1">Pending Review</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) return <div>Candidate Not Found</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
            {/* Header */}
            <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/candidates">
                                <Button variant="ghost" size="icon">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-semibold">
                                {profile.full_name ? profile.full_name[0].toUpperCase() : "?"}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">{profile.full_name}</h1>
                                <p className="text-sm text-muted-foreground">{profile.email} • {profile.phone || "No phone"}</p>
                            </div>
                        </div>
                        <div>
                            {getRecommendationBadge(session?.recommendation || null)}
                        </div>
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
                    {/* Score Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Card className="p-6 bg-[#2E2E2E] border-white/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                            <TrendingUp className="h-8 w-8 text-white mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">{session?.total_score || 0}%</div>
                            <p className="text-sm text-white/60">Total Score</p>
                            <Progress value={session?.total_score || 0} className="mt-3 h-1 bg-white/20" />
                        </Card>
                        <Card className="p-6 bg-[#2E2E2E] border-white/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                            <Target className="h-8 w-8 text-white mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">{session?.technical_score || 0}%</div>
                            <p className="text-sm text-white/60">Technical</p>
                            <Progress value={session?.technical_score || 0} className="mt-3 h-1 bg-white/20" />
                        </Card>
                        <Card className="p-6 bg-[#2E2E2E] border-white/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                            <Brain className="h-8 w-8 text-white mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">{session?.psychometric_score || 0}%</div>
                            <p className="text-sm text-white/60">Psychometric</p>
                            <Progress value={session?.psychometric_score || 0} className="mt-3 h-1 bg-white/20" />
                        </Card>
                        <Card className="p-6 bg-[#2E2E2E] border-white/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                            <Code className="h-8 w-8 text-white mx-auto mb-2" />
                            <div className="text-3xl font-bold text-white">{session?.coding_score || 0}%</div>
                            <p className="text-sm text-white/60">Coding</p>
                            <Progress value={session?.coding_score || 0} className="mt-3 h-1 bg-white/20" />
                        </Card>
                        <Card className="p-6 bg-[#2E2E2E] border-white/10 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                            <Shield className={`h-8 w-8 mx-auto mb-2 ${(session?.proctoring_flags || 0) === 0 ? 'text-white' : 'text-white/60'
                                }`} />
                            <div className={`text-3xl font-bold ${(session?.proctoring_flags || 0) === 0 ? 'text-white' : 'text-white/60'
                                }`}>{session?.proctoring_flags || 0}</div>
                            <p className="text-sm text-white/60">Violations</p>
                            {(session?.proctoring_flags || 0) === 0 && (
                                <p className="text-xs text-white/80 mt-2">✓ Clean Record</p>
                            )}
                        </Card>
                    </div>


                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="bg-card border border-border">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="resume">Resume</TabsTrigger>
                            <TabsTrigger value="coding">Coding ({codingSubmissions.length})</TabsTrigger>
                            <TabsTrigger value="responses">Responses ({textResponses.length})</TabsTrigger>
                            <TabsTrigger value="proctoring">Proctoring ({events.length})</TabsTrigger>
                            <TabsTrigger value="decision">AI Decision</TabsTrigger>
                        </TabsList>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-6">
                            {/* Main Profile Card */}
                            <Card className="p-6 bg-card border-border">
                                <div className="flex items-start gap-6">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt={profile.full_name || "Candidate"}
                                                className="w-24 h-24 rounded-full object-cover border-2 border-border"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center border-2 border-border">
                                                <User className="h-12 w-12 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Basic Info */}
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">{profile?.full_name || "Unknown Candidate"}</h2>
                                            {profile?.job_title && (
                                                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                                    <Briefcase className="h-4 w-4" />
                                                    {profile.job_title}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-foreground">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                    <span>{profile?.email || "No email"}</span>
                                                </div>
                                                {profile?.phone && (
                                                    <div className="flex items-center gap-2 text-foreground">
                                                        <span className="text-muted-foreground">Phone:</span>
                                                        <span>{profile.phone}</span>
                                                    </div>
                                                )}
                                                {profile?.location && (
                                                    <div className="flex items-center gap-2 text-foreground">
                                                        <Target className="h-4 w-4 text-muted-foreground" />
                                                        <span>{profile.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                {profile?.current_education && (
                                                    <div className="flex items-center gap-2 text-foreground">
                                                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                                        <span>{profile.current_education}</span>
                                                    </div>
                                                )}
                                                {profile?.years_experience != null && (
                                                    <div className="flex items-center gap-2 text-foreground">
                                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                        <span>{profile.years_experience} years experience</span>
                                                    </div>
                                                )}
                                                {profile?.industry && (
                                                    <div className="flex items-center gap-2 text-foreground">
                                                        <Layers className="h-4 w-4 text-muted-foreground" />
                                                        <span>{profile.industry}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {profile?.linkedin_url && (
                                            <div className="pt-2">
                                                <a
                                                    href={profile.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-[#2E2E2E] dark:text-white hover:text-[#2E2E2E]/70 dark:hover:text-white/70 transition-colors"
                                                >
                                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                                    </svg>
                                                    LinkedIn Profile
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Skills Section */}
                            {profile?.skills && Array.isArray(profile.skills) && profile.skills.length > 0 && (
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Code className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map((skill: string, i: number) => (
                                            <Badge key={i} className="bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white border border-[#2E2E2E]/20 dark:border-white/20">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Applications Summary */}
                            <Card className="p-6 bg-card border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Applications ({applications.length})
                                </h3>
                                {applications.length === 0 ? (
                                    <p className="text-muted-foreground">No applications submitted</p>
                                ) : (
                                    <div className="space-y-3">
                                        {applications.map((app) => (
                                            <div key={app.id} className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">
                                                        {app.job_descriptions?.title || "Unknown Position"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {app.job_descriptions?.company || ""}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className={`${app.current_stage === 'completed' ? 'bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]' :
                                                        app.current_stage === 'in_progress' ? 'bg-[#2E2E2E]/60 dark:bg-white/60 text-white dark:text-[#2E2E2E]' :
                                                            'bg-muted text-muted-foreground'
                                                        }`}>
                                                        {app.current_stage?.replace(/_/g, " ") || "Applied"}
                                                    </Badge>
                                                    {app.resume_score != null && (
                                                        <div className="text-sm">
                                                            <span className="text-muted-foreground">Resume: </span>
                                                            <span className="font-medium text-primary">{app.resume_score}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* Profile Metadata */}
                            <Card className="p-6 bg-card border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-muted-foreground" />
                                    Account Information
                                </h3>
                                <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Candidate ID</span>
                                        <p className="font-mono text-xs text-muted-foreground mt-1">{profile?.id || candidateId}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Profile Completion</span>
                                        <p className="mt-1">
                                            <Badge className={profile?.onboarding_complete ? 'bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]' : 'bg-[#2E2E2E]/40 dark:bg-white/40 text-white dark:text-[#2E2E2E]'}>
                                                {profile?.onboarding_complete ? 'Complete' : 'Incomplete'}
                                            </Badge>
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Last Updated</span>
                                        <p className="text-muted-foreground mt-1">
                                            {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "Never"}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-6">
                            {/* Score Charts Row */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Score Breakdown Bar Chart */}
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Score Breakdown
                                    </h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart
                                            data={[
                                                { name: "Technical", score: session?.technical_score || 0, fill: "#2E2E2E" },
                                                { name: "Psychometric", score: session?.psychometric_score || 0, fill: "#4a4a4a" },
                                                { name: "Coding", score: session?.coding_score || 0, fill: "#666666" },
                                                { name: "Communication", score: session?.communication_score || 0, fill: "#888888" },
                                            ]}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                                                labelStyle={{ color: "#f1f5f9" }}
                                            />
                                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                                {[
                                                    { fill: "#2E2E2E" },
                                                    { fill: "#4a4a4a" },
                                                    { fill: "#666666" },
                                                    { fill: "#888888" },
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>

                                {/* Competency Radar Chart */}
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Competency Radar
                                    </h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <RadarChart
                                            data={[
                                                { trait: "Leadership", value: psychometric?.leadership_score || 0, fullMark: 100 },
                                                { trait: "Teamwork", value: psychometric?.teamwork_score || 0, fullMark: 100 },
                                                { trait: "Openness", value: psychometric?.openness_score || 0, fullMark: 100 },
                                                { trait: "Emotional IQ", value: psychometric?.emotional_intelligence_score || 0, fullMark: 100 },
                                                { trait: "Conscientiousness", value: psychometric?.conscientiousness_score || 0, fullMark: 100 },
                                                { trait: "Extraversion", value: psychometric?.extraversion_score || 0, fullMark: 100 },
                                            ]}
                                        >
                                            <PolarGrid stroke="#334155" />
                                            <PolarAngleAxis dataKey="trait" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                                            <Radar
                                                name="Score"
                                                dataKey="value"
                                                stroke="#8b5cf6"
                                                fill="#8b5cf6"
                                                fillOpacity={0.4}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </div>

                            {/* Overall Score Gauge */}
                            <Card className="p-6 bg-gradient-to-r from-card/80 to-card/50 border-border">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary/50">
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-primary">{session?.total_score || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Overall</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Candidate Score Summary</h3>
                                            <p className="text-sm text-muted-foreground">Based on comprehensive assessment analysis</p>
                                            <div className="flex gap-2 mt-2">
                                                {(session?.total_score || 0) >= 70 && (
                                                    <Badge className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]">High Performer</Badge>
                                                )}
                                                {(session?.total_score || 0) >= 50 && (session?.total_score || 0) < 70 && (
                                                    <Badge className="bg-[#2E2E2E]/60 dark:bg-white/60 text-white dark:text-[#2E2E2E]">Average</Badge>
                                                )}
                                                {(session?.total_score || 0) < 50 && session && (
                                                    <Badge className="bg-[#2E2E2E]/40 dark:bg-white/40 text-white dark:text-[#2E2E2E]">Below Average</Badge>
                                                )}
                                                {(session?.proctoring_flags || 0) === 0 && (
                                                    <Badge className="bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white">
                                                        <Shield className="h-3 w-3 mr-1" /> No Violations
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex gap-4">
                                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                                            <Target className="h-6 w-6 text-[#2E2E2E] dark:text-white mx-auto mb-1" />
                                            <div className="text-xl font-bold">{session?.technical_score || 0}%</div>
                                            <div className="text-xs text-muted-foreground">Technical</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                                            <Brain className="h-6 w-6 text-[#2E2E2E] dark:text-white mx-auto mb-1" />
                                            <div className="text-xl font-bold">{session?.psychometric_score || 0}%</div>
                                            <div className="text-xs text-muted-foreground">Psychometric</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                                            <Code className="h-6 w-6 text-[#2E2E2E] dark:text-white mx-auto mb-1" />
                                            <div className="text-xl font-bold">{session?.coding_score || 0}%</div>
                                            <div className="text-xs text-muted-foreground">Coding</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Strengths and Weaknesses */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <ThumbsUp className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Key Strengths
                                        {session?.strengths && session.strengths.length > 0 && (
                                            <Badge className="bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white ml-auto">{session.strengths.length}</Badge>
                                        )}
                                    </h3>
                                    <ul className="space-y-3">
                                        {(session?.strengths || []).map((s, i) => (
                                            <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-[#2E2E2E]/5 dark:bg-white/5 border border-[#2E2E2E]/10 dark:border-white/10">
                                                <CheckCircle className="h-5 w-5 text-[#2E2E2E] dark:text-white mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{s}</span>
                                            </li>
                                        ))}
                                        {(!session?.strengths || session.strengths.length === 0) && (
                                            <p className="text-muted-foreground text-sm">Complete assessment to identify strengths</p>
                                        )}
                                    </ul>
                                </Card>

                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <ThumbsDown className="h-5 w-5 text-[#2E2E2E]/70 dark:text-white/70" />
                                        Areas for Development
                                        {session?.weaknesses && session.weaknesses.length > 0 && (
                                            <Badge className="bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E]/70 dark:text-white/70 ml-auto">{session.weaknesses.length}</Badge>
                                        )}
                                    </h3>
                                    <ul className="space-y-3">
                                        {(session?.weaknesses || []).map((w, i) => (
                                            <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-[#2E2E2E]/5 dark:bg-white/5 border border-[#2E2E2E]/10 dark:border-white/10">
                                                <AlertTriangle className="h-5 w-5 text-[#2E2E2E]/70 dark:text-white/70 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{w}</span>
                                            </li>
                                        ))}
                                        {(!session?.weaknesses || session.weaknesses.length === 0) && (
                                            <p className="text-muted-foreground text-sm">Complete assessment to identify improvement areas</p>
                                        )}
                                    </ul>
                                </Card>
                            </div>

                            {psychometric && (
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Psychometric Traits Analysis
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Openness</span>
                                                <span className="text-muted-foreground">{psychometric.openness_score}%</span>
                                            </div>
                                            <Progress value={psychometric.openness_score} className="h-2 bg-muted" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Conscientiousness</span>
                                                <span className="text-muted-foreground">{psychometric.conscientiousness_score}%</span>
                                            </div>
                                            <Progress value={psychometric.conscientiousness_score} className="h-2 bg-muted" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Extraversion</span>
                                                <span className="text-muted-foreground">{psychometric.extraversion_score}%</span>
                                            </div>
                                            <Progress value={psychometric.extraversion_score} className="h-2 bg-muted" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Agreeableness</span>
                                                <span className="text-muted-foreground">{psychometric.agreeableness_score}%</span>
                                            </div>
                                            <Progress value={psychometric.agreeableness_score} className="h-2 bg-muted" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Emotional Intelligence</span>
                                                <span className="text-muted-foreground">{psychometric.emotional_intelligence_score}%</span>
                                            </div>
                                            <Progress value={psychometric.emotional_intelligence_score} className="h-2 bg-muted" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Leadership</span>
                                                <span className="text-muted-foreground">{psychometric.leadership_score}%</span>
                                            </div>
                                            <Progress value={psychometric.leadership_score} className="h-2 bg-muted" />
                                        </div>
                                    </div>
                                    {psychometric.personality_summary && (
                                        <div className="mt-8 bg-[#2E2E2E]/10 dark:bg-white/10 border border-[#2E2E2E]/20 dark:border-white/20 p-4 rounded-lg">
                                            <p className="text-sm text-foreground italic">" {psychometric.personality_summary} "</p>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Extended Profile Details */}
                            <Card className="p-6 bg-card border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                    Education & Background
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Education Level */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Education Level</label>
                                        <p className="font-medium">{profile.current_education || "Not specified"}</p>
                                    </div>
                                    {/* College/University */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">College/University</label>
                                        <p className="font-medium">{profile.institute_name || profile.college || "Not specified"}</p>
                                    </div>
                                    {/* Major/Field */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Major/Field of Study</label>
                                        <p className="font-medium">{profile.education_major || "Not specified"}</p>
                                    </div>
                                    {/* Graduation Year */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Graduation Year</label>
                                        <p className="font-medium">{profile.graduation_year || "Not specified"}</p>
                                    </div>
                                    {/* CGPA */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">CGPA</label>
                                        <p className="font-medium">{profile.cgpa || "Not specified"}</p>
                                    </div>
                                    {/* Backlogs */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Backlogs</label>
                                        <p className="font-medium">{profile.backlogs !== undefined ? profile.backlogs : "Not specified"}</p>
                                    </div>
                                    {/* 10th Marks */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">10th Marks</label>
                                        <p className="font-medium">{profile.tenth_marks || "Not specified"}</p>
                                    </div>
                                    {/* 12th Marks */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">12th Marks</label>
                                        <p className="font-medium">{profile.twelfth_marks || "Not specified"}</p>
                                    </div>
                                    {/* Resume Score from Applications */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Resume Score</label>
                                        <Badge variant="outline" className="ml-2">
                                            {applications.length > 0 ? `${applications[0].resume_score || 0}%` : "N/A"}
                                        </Badge>
                                    </div>
                                </div>
                            </Card>

                            {/* Professional Background */}
                            <Card className="p-6 bg-card border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                    Professional Background
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Employment Status */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Employment Status</label>
                                        <p className="font-medium">{profile.employment_status || "Not specified"}</p>
                                    </div>
                                    {/* Current Company */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Current Company</label>
                                        <p className="font-medium">{profile.current_company || "Not specified"}</p>
                                    </div>
                                    {/* Current Designation */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Current Designation</label>
                                        <p className="font-medium">{profile.current_designation || "Not specified"}</p>
                                    </div>
                                    {/* Years of Experience */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Years of Experience</label>
                                        <p className="font-medium">{profile.years_experience ? `${profile.years_experience} years` : "Not specified"}</p>
                                    </div>
                                    {/* Notice Period */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Notice Period</label>
                                        <p className="font-medium">{profile.notice_period || "Not specified"}</p>
                                    </div>
                                    {/* Expected Salary */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Expected Salary</label>
                                        <p className="font-medium">{profile.expected_salary || "Not specified"}</p>
                                    </div>
                                </div>

                                {/* Skills Section */}
                                {(profile.skills_primary?.length || profile.skills_secondary?.length) && (
                                    <div className="mt-6 pt-6 border-t border-border">
                                        <h4 className="font-medium mb-3">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.skills_primary?.map((skill, i) => (
                                                <Badge key={`primary-${i}`} className="bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]">
                                                    {skill}
                                                </Badge>
                                            ))}
                                            {profile.skills_secondary?.map((skill, i) => (
                                                <Badge key={`secondary-${i}`} variant="outline">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Social Links */}
                                {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
                                    <div className="mt-6 pt-6 border-t border-border">
                                        <h4 className="font-medium mb-3">Links & Portfolio</h4>
                                        <div className="flex flex-wrap gap-4">
                                            {profile.linkedin_url && (
                                                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                                    <ExternalLink className="h-3 w-3" /> LinkedIn
                                                </a>
                                            )}
                                            {profile.github_url && (
                                                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                                    <ExternalLink className="h-3 w-3" /> GitHub
                                                </a>
                                            )}
                                            {profile.portfolio_url && (
                                                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                                    <ExternalLink className="h-3 w-3" /> Portfolio
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Personal Details */}
                            <Card className="p-6 bg-card border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                    Personal Details
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Date of Birth */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Date of Birth</label>
                                        <p className="font-medium">{profile.date_of_birth || "Not specified"}</p>
                                    </div>
                                    {/* Gender */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Gender</label>
                                        <p className="font-medium">{profile.gender || "Not specified"}</p>
                                    </div>
                                    {/* Location */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Location</label>
                                        <p className="font-medium">{profile.current_city || profile.location || "Not specified"}{profile.country ? `, ${profile.country}` : ""}</p>
                                    </div>
                                    {/* Phone */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Phone</label>
                                        <p className="font-medium">{profile.phone || "Not specified"}</p>
                                    </div>
                                    {/* Email */}
                                    <div>
                                        <label className="text-xs text-muted-foreground">Email</label>
                                        <p className="font-medium">{profile.email || "Not specified"}</p>
                                    </div>
                                    {/* Languages */}
                                    {profile.languages && profile.languages.length > 0 && (
                                        <div>
                                            <label className="text-xs text-muted-foreground">Languages</label>
                                            <p className="font-medium">{profile.languages.join(", ")}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Resume Tab */}
                        <TabsContent value="resume">
                            {applications.length > 0 ? (
                                <div className="space-y-6">
                                    {applications.map((app) => (
                                        <Card key={app.id} className="p-6 bg-card border-border">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h3 className="font-semibold flex items-center gap-2">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        {app.job_descriptions?.title || "Job Application"}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">{app.job_descriptions?.company}</p>
                                                </div>
                                                <Badge className="bg-primary/20 text-primary">
                                                    Score: {app.resume_score || 0}%
                                                </Badge>
                                            </div>

                                            {/* Summary */}
                                            {app.resume_summary && (
                                                <div className="mb-6 bg-muted/50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Summary</h4>
                                                    <p className="text-foreground">{app.resume_summary}</p>
                                                </div>
                                            )}

                                            {/* Strengths & Weaknesses Grid */}
                                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                                <div className="bg-[#2E2E2E]/10 dark:bg-white/10 border border-[#2E2E2E]/20 dark:border-white/20 p-4 rounded-lg">
                                                    <h4 className="font-medium text-[#2E2E2E] dark:text-white mb-3 flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4" /> Strengths
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {(app.resume_strengths || []).map((s, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-[#2E2E2E] dark:bg-white mt-2 flex-shrink-0" />
                                                                {s}
                                                            </li>
                                                        ))}
                                                        {(!app.resume_strengths || app.resume_strengths.length === 0) && (
                                                            <p className="text-muted-foreground text-sm">No strengths identified</p>
                                                        )}
                                                    </ul>
                                                </div>
                                                <div className="bg-[#2E2E2E]/10 dark:bg-white/10 border border-[#2E2E2E]/20 dark:border-white/20 p-4 rounded-lg">
                                                    <h4 className="font-medium text-[#2E2E2E]/80 dark:text-white/80 mb-3 flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" /> Weaknesses
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {(app.resume_weaknesses || []).map((w, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-[#2E2E2E]/70 dark:bg-white/70 mt-2 flex-shrink-0" />
                                                                {w}
                                                            </li>
                                                        ))}
                                                        {(!app.resume_weaknesses || app.resume_weaknesses.length === 0) && (
                                                            <p className="text-muted-foreground text-sm">No weaknesses identified</p>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Skills */}
                                            {app.resume_skills && app.resume_skills.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Extracted Skills</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {app.resume_skills.map((skill, i) => (
                                                            <Badge key={i} variant="outline" className="border-primary/30 text-primary">
                                                                {typeof skill === 'string' ? skill : (skill as any)?.name || skill}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Experience & Education */}
                                            <div className="flex gap-4 text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
                                                {app.resume_experience_years && (
                                                    <span>Experience: {app.resume_experience_years} years</span>
                                                )}
                                                {app.resume_education && (
                                                    <span>Education: {app.resume_education}</span>
                                                )}
                                            </div>
                                        </Card>
                                    ))}

                                    {/* Resume File Downloads */}
                                    {resumeFiles.length > 0 && (
                                        <Card className="p-6 bg-card border-border">
                                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                                Resume Files
                                            </h3>
                                            <div className="space-y-3">
                                                {resumeFiles.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                                                        <div className="flex items-center gap-3">
                                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                                            <div>
                                                                <p className="text-sm font-medium">Resume {i + 1}</p>
                                                                <p className="text-xs text-muted-foreground">Uploaded: {new Date(file.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={file.resumeUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-[#2E2E2E] dark:bg-white hover:bg-[#2E2E2E]/90 dark:hover:bg-white/90 text-white dark:text-[#2E2E2E] text-sm rounded-lg transition-colors"
                                                        >
                                                            Download
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* Detailed Resume Analysis from resume_analyses table */}
                                    {resumeAnalyses.length > 0 && (
                                        <div className="space-y-6">
                                            {resumeAnalyses.map((analysis, idx) => (
                                                <Card key={analysis.id || idx} className="p-6 bg-card border-border">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                                            <FileText className="h-5 w-5 text-primary" />
                                                            Detailed Resume Analysis
                                                        </h3>
                                                        {analysis.ats_score && (
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm text-muted-foreground">ATS Score</span>
                                                                <div className="relative w-16 h-16">
                                                                    <svg className="w-16 h-16 transform -rotate-90">
                                                                        <circle cx="32" cy="32" r="28" stroke="#374151" strokeWidth="4" fill="none" />
                                                                        <circle 
                                                                            cx="32" cy="32" r="28" 
                                                                            stroke={analysis.ats_score >= 80 ? "#10b981" : analysis.ats_score >= 60 ? "#f59e0b" : "#ef4444"}
                                                                            strokeWidth="4" 
                                                                            fill="none"
                                                                            strokeDasharray={`${(analysis.ats_score / 100) * 176} 176`}
                                                                            strokeLinecap="round"
                                                                        />
                                                                    </svg>
                                                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                                                        {analysis.ats_score}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Experience Years */}
                                                    {analysis.experience_years && (
                                                        <div className="mb-6 p-4 bg-[#2E2E2E] rounded-lg border border-white/10">
                                                            <div className="flex items-center gap-3">
                                                                <Briefcase className="h-5 w-5 text-primary" />
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">Total Experience</p>
                                                                    <p className="text-xl font-bold text-white">{analysis.experience_years} years</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Skills Extracted */}
                                                    {analysis.skills_extracted && (
                                                        <div className="mb-6">
                                                            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                                <Star className="h-4 w-4" /> Extracted Skills
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(Array.isArray(analysis.skills_extracted) 
                                                                    ? analysis.skills_extracted 
                                                                    : typeof analysis.skills_extracted === 'object' && analysis.skills_extracted !== null
                                                                        ? Object.values(analysis.skills_extracted).flat()
                                                                        : []
                                                                ).map((skill: any, i: number) => (
                                                                    <Badge key={i} className="bg-primary/20 text-primary border-primary/30">
                                                                        {typeof skill === 'string' ? skill : skill?.name || skill?.skill || JSON.stringify(skill)}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Work History */}
                                                    {analysis.work_history && (Array.isArray(analysis.work_history) ? analysis.work_history.length > 0 : Object.keys(analysis.work_history).length > 0) && (
                                                        <div className="mb-6">
                                                            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                                <Briefcase className="h-4 w-4" /> Work History
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(Array.isArray(analysis.work_history) ? analysis.work_history : [analysis.work_history]).map((job: any, i: number) => (
                                                                    <div key={i} className="p-4 bg-[#2E2E2E] rounded-lg border border-white/10">
                                                                        <div className="flex items-start justify-between">
                                                                            <div>
                                                                                <p className="font-medium text-white">{job.title || job.position || job.role || 'Position'}</p>
                                                                                <p className="text-sm text-primary">{job.company || job.organization || 'Company'}</p>
                                                                            </div>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {job.start_date || job.startDate || job.from || ''} - {job.end_date || job.endDate || job.to || 'Present'}
                                                                            </span>
                                                                        </div>
                                                                        {job.description && (
                                                                            <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Education */}
                                                    {analysis.education && (Array.isArray(analysis.education) ? analysis.education.length > 0 : Object.keys(analysis.education).length > 0) && (
                                                        <div className="mb-6">
                                                            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                                <GraduationCap className="h-4 w-4" /> Education
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(Array.isArray(analysis.education) ? analysis.education : [analysis.education]).map((edu: any, i: number) => (
                                                                    <div key={i} className="p-4 bg-[#2E2E2E] rounded-lg border border-white/10">
                                                                        <div className="flex items-start justify-between">
                                                                            <div>
                                                                                <p className="font-medium text-white">{edu.degree || edu.qualification || 'Degree'}</p>
                                                                                <p className="text-sm text-primary">{edu.institution || edu.school || edu.university || 'Institution'}</p>
                                                                                {edu.field && <p className="text-sm text-muted-foreground">{edu.field}</p>}
                                                                            </div>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {edu.year || edu.graduation_year || edu.end_date || ''}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Job Match Scores */}
                                                    {analysis.job_match_scores && Object.keys(analysis.job_match_scores).length > 0 && (
                                                        <div className="mb-6">
                                                            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                                <Target className="h-4 w-4" /> Job Match Analysis
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                {Object.entries(analysis.job_match_scores).map(([key, value]: [string, any]) => (
                                                                    <div key={key} className="p-3 bg-[#2E2E2E] rounded-lg border border-white/10 text-center">
                                                                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                                                                        <p className="text-lg font-bold text-white">{typeof value === 'number' ? `${value}%` : value}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Suggestions */}
                                                    {analysis.suggestions && (Array.isArray(analysis.suggestions) ? analysis.suggestions.length > 0 : analysis.suggestions) && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                                <Lightbulb className="h-4 w-4 text-[#2E2E2E]/80 dark:text-white/80" /> Improvement Suggestions
                                                            </h4>
                                                            <div className="p-4 bg-[#2E2E2E]/10 dark:bg-white/10 border border-[#2E2E2E]/20 dark:border-white/20 rounded-lg">
                                                                <ul className="space-y-2">
                                                                    {(Array.isArray(analysis.suggestions) ? analysis.suggestions : [analysis.suggestions]).map((suggestion: any, i: number) => (
                                                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                                                            <div className="h-1.5 w-1.5 rounded-full bg-[#2E2E2E]/70 dark:bg-white/70 mt-2 flex-shrink-0" />
                                                                            {typeof suggestion === 'string' ? suggestion : suggestion?.text || suggestion?.suggestion || JSON.stringify(suggestion)}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Parsed Data (if available) */}
                                                    {analysis.parsed_data && Object.keys(analysis.parsed_data).length > 0 && (
                                                        <div className="mt-6 pt-6 border-t border-border">
                                                            <details className="group">
                                                                <summary className="cursor-pointer text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                                    <FileText className="h-4 w-4" /> 
                                                                    View Raw Parsed Data
                                                                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                                                                </summary>
                                                                <pre className="mt-3 p-4 bg-background rounded-lg text-xs overflow-auto max-h-64 text-muted-foreground">
                                                                    {JSON.stringify(analysis.parsed_data, null, 2)}
                                                                </pre>
                                                            </details>
                                                        </div>
                                                    )}
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Card className="p-6 bg-card border-border">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Resume Analysis
                                        </h3>
                                        <Badge className="bg-primary/20 text-primary">
                                            Score: {profile.resume_score || 0}%
                                        </Badge>
                                    </div>
                                    {profile.resume_summary && (
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Summary</h4>
                                            <p className="text-foreground">{profile.resume_summary}</p>
                                        </div>
                                    )}
                                    {profile.resume_skills && profile.resume_skills.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {profile.resume_skills.map((skill, i) => (
                                                    <Badge key={i} variant="outline" className="border-border">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )}
                        </TabsContent>

                        {/* Coding Tab */}
                        <TabsContent value="coding">
                            <div className="space-y-6">
                                {codingSubmissions.map((sub) => (
                                    <Card key={sub.id} className="p-6 bg-card border-border">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">{sub.challenges?.title || "Unknown Challenge"}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline">{sub.language}</Badge>
                                                    <Badge className={
                                                        sub.status === "passed" ? "bg-[#2E2E2E]/20 dark:bg-white/20 text-[#2E2E2E] dark:text-white" : "bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E]/60 dark:text-white/60"
                                                    }>
                                                        {sub.tests_passed}/{sub.tests_total} Tests Passed
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="capitalize">{sub.challenges?.difficulty}</Badge>
                                        </div>
                                        <div className="relative rounded-lg overflow-hidden bg-background border border-border p-4 font-mono text-sm max-h-[300px] overflow-y-auto">
                                            <pre className="whitespace-pre-wrap text-foreground">{sub.code}</pre>
                                        </div>
                                    </Card>
                                ))}
                                {codingSubmissions.length === 0 && (
                                    <p className="text-center text-muted-foreground">No coding submissions found.</p>
                                )}
                            </div>
                        </TabsContent>

                        {/* Responses Tab */}
                        <TabsContent value="responses">
                            <div className="space-y-6">
                                {textResponses.map((res) => (
                                    <Card key={res.id} className="p-6 bg-card border-border">
                                        <div className="flex items-center justify-between mb-4">
                                            <Badge variant="outline" className="bg-muted">{res.text_questions?.category}</Badge>
                                            <Badge className="bg-[#2E2E2E]/20 dark:bg-white/20 text-[#2E2E2E] dark:text-white">Score: {res.total_score || 0}/100</Badge>
                                        </div>
                                        <h3 className="font-semibold mb-2">{res.text_questions?.question_text}</h3>
                                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                                            <p className="text-foreground whitespace-pre-wrap">{res.response_text}</p>
                                        </div>
                                        {res.ai_feedback && (
                                            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                                                <div className="flex items-center gap-2 mb-2 text-primary">
                                                    <Brain className="h-4 w-4" />
                                                    <span className="font-medium text-sm">AI Feedback</span>
                                                </div>
                                                <p className="text-sm text-foreground">{res.ai_feedback}</p>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                                {textResponses.length === 0 && (
                                    <p className="text-center text-muted-foreground">No text responses found.</p>
                                )}
                            </div>
                        </TabsContent>

                        {/* Proctoring Tab */}
                        <TabsContent value="proctoring">
                            <div className="space-y-6">
                                {/* Proctoring Summary Card */}
                                {proctoringSummary && (
                                    <Card className={`p-6 border-2 ${
                                        proctoringSummary.risk_level === 'critical' ? 'bg-[#2E2E2E]/20 dark:bg-white/20 border-[#2E2E2E]/40 dark:border-white/40' :
                                        proctoringSummary.risk_level === 'high' ? 'bg-[#2E2E2E]/15 dark:bg-white/15 border-[#2E2E2E]/30 dark:border-white/30' :
                                        proctoringSummary.risk_level === 'medium' ? 'bg-[#2E2E2E]/10 dark:bg-white/10 border-[#2E2E2E]/20 dark:border-white/20' :
                                        'bg-[#2E2E2E]/5 dark:bg-white/5 border-[#2E2E2E]/10 dark:border-white/10'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Shield className={`h-10 w-10 ${
                                                    proctoringSummary.risk_level === 'critical' ? 'text-[#2E2E2E] dark:text-white' :
                                                    proctoringSummary.risk_level === 'high' ? 'text-[#2E2E2E]/80 dark:text-white/80' :
                                                    proctoringSummary.risk_level === 'medium' ? 'text-[#2E2E2E]/60 dark:text-white/60' :
                                                    'text-[#2E2E2E]/40 dark:text-white/40'
                                                }`} />
                                                <div>
                                                    <h3 className="text-xl font-bold">Integrity Score: {proctoringSummary.final_integrity_score}%</h3>
                                                    <p className="text-muted-foreground">Risk Level: {proctoringSummary.risk_level?.toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-center">
                                                <div>
                                                    <div className="text-2xl font-bold text-[#2E2E2E] dark:text-white">{proctoringSummary.critical_violations || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Critical</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-[#2E2E2E]/80 dark:text-white/80">{proctoringSummary.high_violations || 0}</div>
                                                    <div className="text-xs text-muted-foreground">High</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-[#2E2E2E]/60 dark:text-white/60">{proctoringSummary.medium_violations || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Medium</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-muted-foreground">{proctoringSummary.low_violations || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Low</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Violation Screenshots */}
                                {proctoringScreenshots.length > 0 && (
                                    <Card className="p-6 bg-card border-border">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                            Violation Screenshots ({proctoringScreenshots.length})
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {proctoringScreenshots.map((screenshot, i) => (
                                                <div key={i} className="relative group">
                                                    <a 
                                                        href={screenshot.screenshot_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="block"
                                                    >
                                                        <img 
                                                            src={screenshot.screenshot_url} 
                                                            alt={`Violation ${i + 1}`}
                                                            className="w-full h-32 object-cover rounded-lg border-2 border-border hover:border-[#2E2E2E] dark:hover:border-white transition-colors"
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent p-2 rounded-b-lg">
                                                            <Badge className={`text-xs ${
                                                                screenshot.severity === 'critical' ? 'bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]' :
                                                                screenshot.severity === 'high' ? 'bg-[#2E2E2E]/80 dark:bg-white/80 text-white dark:text-[#2E2E2E]' :
                                                                'bg-[#2E2E2E]/60 dark:bg-white/60 text-white dark:text-[#2E2E2E]'
                                                            }`}>
                                                                {screenshot.event_type?.replace(/_/g, ' ')}
                                                            </Badge>
                                                        </div>
                                                    </a>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {new Date(screenshot.client_timestamp || screenshot.created_at).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* Session Recordings - Webcam */}
                                {proctoringRecordings.filter((r: any) => r.type === 'webcam' || r.type === 'unknown').length > 0 && (
                                    <Card className="p-6 bg-card border-border">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Video className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                            Webcam Recordings ({proctoringRecordings.filter((r: any) => r.type === 'webcam' || r.type === 'unknown').length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {proctoringRecordings.filter((r: any) => r.type === 'webcam' || r.type === 'unknown').map((recording: any, i: number) => (
                                                <div key={i} className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                                    <video 
                                                        src={recording.url}
                                                        controls
                                                        className="w-full h-48 object-cover"
                                                        preload="metadata"
                                                    />
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-[#2E2E2E]/20 dark:bg-white/20 text-[#2E2E2E] dark:text-white">Webcam</Badge>
                                                            <span className="text-sm text-muted-foreground">
                                                                Recording {i + 1}
                                                            </span>
                                                        </div>
                                                        <a 
                                                            href={recording.url} 
                                                            download 
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <Download className="h-3 w-3" /> Download
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* Session Recordings - Screen */}
                                {proctoringRecordings.filter((r: any) => r.type === 'screen').length > 0 && (
                                    <Card className="p-6 bg-card border-border">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                            Screen Recordings ({proctoringRecordings.filter((r: any) => r.type === 'screen').length})
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {proctoringRecordings.filter((r: any) => r.type === 'screen').map((recording: any, i: number) => (
                                                <div key={i} className="border border-border rounded-lg overflow-hidden bg-muted/30">
                                                    <video 
                                                        src={recording.url}
                                                        controls
                                                        className="w-full h-64 object-contain bg-black"
                                                        preload="metadata"
                                                    />
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-[#2E2E2E]/20 dark:bg-white/20 text-[#2E2E2E] dark:text-white">Screen</Badge>
                                                            <span className="text-sm text-muted-foreground">
                                                                Recording {i + 1}
                                                            </span>
                                                        </div>
                                                        <a 
                                                            href={recording.url} 
                                                            download 
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <Download className="h-3 w-3" /> Download
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* Event Log */}
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Proctoring Events Log
                                    </h3>

                                    {events.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No proctoring events recorded</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {events.map((event) => {
                                                const timestamp = event.client_timestamp || event.created_at;
                                                const formattedTime = timestamp 
                                                    ? new Date(timestamp).toLocaleString(undefined, {
                                                        dateStyle: 'short',
                                                        timeStyle: 'medium'
                                                    })
                                                    : 'N/A';
                                                
                                                return (
                                                    <div
                                                        key={event.id}
                                                        className="p-4 rounded-lg bg-muted/50 border border-border"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex items-start gap-3 flex-1">
                                                                <AlertTriangle className={`h-5 w-5 mt-0.5 ${event.severity === "critical" ? "text-[#2E2E2E] dark:text-white" :
                                                                    event.severity === "high" ? "text-[#2E2E2E]/80 dark:text-white/80" :
                                                                        event.severity === "medium" ? "text-[#2E2E2E]/60 dark:text-white/60" : "text-muted-foreground"
                                                                    }`} />
                                                                <div className="flex-1">
                                                                    <p className="font-medium">{event.event_type?.replace(/_/g, " ").toUpperCase()}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {event.description || event.details?.description || "Violation detected during assessment"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 shrink-0">
                                                                {getSeverityBadge(event.severity)}
                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                    {formattedTime}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Screenshot Preview */}
                                                        {event.screenshot_url && (
                                                            <div className="mt-3 pt-3 border-t border-border">
                                                                <a 
                                                                    href={event.screenshot_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="block w-fit"
                                                                >
                                                                    <div className="relative group">
                                                                        <img 
                                                                            src={event.screenshot_url} 
                                                                            alt={`Screenshot: ${event.event_type}`}
                                                                            className="w-48 h-28 object-cover rounded-lg border-2 border-border hover:border-[#2E2E2E] dark:hover:border-white transition-colors"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                                            <Eye className="h-6 w-6 text-white" />
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-1">Click to view full screenshot</p>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </TabsContent>

                        {/* AI Decision Tab */}
                        <TabsContent value="decision" className="space-y-6">
                            {/* Main Recommendation Card */}
                            <Card className={`p-8 border-2 ${session?.recommendation === 'hire' ? 'bg-[#2E2E2E]/10 dark:bg-white/10 border-[#2E2E2E]/30 dark:border-white/30' :
                                session?.recommendation === 'reject' ? 'bg-[#2E2E2E]/5 dark:bg-white/5 border-[#2E2E2E]/20 dark:border-white/20' :
                                    session?.recommendation === 'consider' ? 'bg-[#2E2E2E]/8 dark:bg-white/8 border-[#2E2E2E]/25 dark:border-white/25' :
                                        'bg-card border-border'
                                }`}>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-full ${session?.recommendation === 'hire' ? 'bg-[#2E2E2E]/20 dark:bg-white/20' :
                                            session?.recommendation === 'reject' ? 'bg-[#2E2E2E]/10 dark:bg-white/10' :
                                                session?.recommendation === 'consider' ? 'bg-[#2E2E2E]/15 dark:bg-white/15' :
                                                    'bg-muted'
                                            }`}>
                                            {session?.recommendation === 'hire' ? (
                                                <CheckCircle className="h-10 w-10 text-[#2E2E2E] dark:text-white" />
                                            ) : session?.recommendation === 'reject' ? (
                                                <XCircle className="h-10 w-10 text-[#2E2E2E]/60 dark:text-white/60" />
                                            ) : session?.recommendation === 'consider' ? (
                                                <Clock className="h-10 w-10 text-[#2E2E2E]/80 dark:text-white/80" />
                                            ) : (
                                                <Brain className="h-10 w-10 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold">
                                                {session?.recommendation === 'hire' ? 'Recommended to Hire' :
                                                    session?.recommendation === 'reject' ? 'Not Recommended' :
                                                        session?.recommendation === 'consider' ? 'Further Consideration' :
                                                            'Pending Assessment'}
                                            </h3>
                                            <p className="text-muted-foreground mt-1">
                                                {session?.recommendation === 'hire' ? 'Strong candidate match based on assessment results' :
                                                    session?.recommendation === 'reject' ? 'Candidate does not meet minimum requirements' :
                                                        session?.recommendation === 'consider' ? 'Additional evaluation recommended' :
                                                            'Complete assessment to generate AI recommendation'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-primary">{session?.total_score || 0}%</div>
                                        <div className="text-sm text-muted-foreground">Overall Score</div>
                                    </div>
                                </div>
                            </Card>

                            {/* Score Distribution */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Score Distribution
                                    </h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Technical', value: session?.technical_score || 0, fill: '#2E2E2E' },
                                                    { name: 'Psychometric', value: session?.psychometric_score || 0, fill: '#4a4a4a' },
                                                    { name: 'Coding', value: session?.coding_score || 0, fill: '#666666' },
                                                    { name: 'Communication', value: session?.communication_score || 0, fill: '#888888' },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#2E2E2E" />
                                                <Cell fill="#4a4a4a" />
                                                <Cell fill="#666666" />
                                                <Cell fill="#888888" />
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>

                                {/* Decision Factors */}
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Award className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                        Decision Factors
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Technical Competency</span>
                                            <div className="flex items-center gap-2">
                                                <Progress value={session?.technical_score || 0} className="w-24 h-2" />
                                                <span className="text-sm font-medium w-10">{session?.technical_score || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Personality Fit</span>
                                            <div className="flex items-center gap-2">
                                                <Progress value={session?.psychometric_score || 0} className="w-24 h-2" />
                                                <span className="text-sm font-medium w-10">{session?.psychometric_score || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Problem Solving</span>
                                            <div className="flex items-center gap-2">
                                                <Progress value={session?.coding_score || 0} className="w-24 h-2" />
                                                <span className="text-sm font-medium w-10">{session?.coding_score || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Communication</span>
                                            <div className="flex items-center gap-2">
                                                <Progress value={session?.communication_score || 0} className="w-24 h-2" />
                                                <span className="text-sm font-medium w-10">{session?.communication_score || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                                            <span className="text-sm text-muted-foreground">Proctoring Flags</span>
                                            <Badge className={session?.proctoring_flags === 0 ? "bg-[#2E2E2E]/20 dark:bg-white/20 text-[#2E2E2E] dark:text-white" : "bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E]/60 dark:text-white/60"}>
                                                {session?.proctoring_flags || 0} violations
                                            </Badge>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Detailed Rationale */}
                            {session?.recommendation_rationale && (
                                <Card className="p-6 bg-card border-border">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-primary" />
                                        AI Analysis & Rationale
                                    </h3>
                                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                        <p className="text-foreground whitespace-pre-line leading-relaxed">{session.recommendation_rationale}</p>
                                    </div>
                                </Card>
                            )}

                            {/* HR Action Buttons */}
                            <Card className="p-6 bg-card border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                                    HR Actions
                                </h3>
                                
                                {/* Current Decision Status */}
                                {(decisionStatus || applications[0]?.decision) && (
                                    <div className="mb-4 p-3 rounded-lg bg-muted/50">
                                        <p className="text-sm text-muted-foreground">Current Decision:</p>
                                        <Badge className={`mt-1 ${
                                            (decisionStatus || applications[0]?.decision) === "hired" 
                                                ? "bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]" 
                                                : (decisionStatus || applications[0]?.decision) === "rejected"
                                                    ? "bg-[#2E2E2E]/60 dark:bg-white/60 text-white dark:text-[#2E2E2E]"
                                                    : "bg-[#2E2E2E]/40 dark:bg-white/40 text-white dark:text-[#2E2E2E]"
                                        }`}>
                                            {(decisionStatus || applications[0]?.decision) === "hired" ? "✓ Hired" 
                                                : (decisionStatus || applications[0]?.decision) === "rejected" ? "✗ Rejected" 
                                                : "⏳ Under Consideration"}
                                        </Badge>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-4">
                                    <Button 
                                        className="bg-[#2E2E2E] dark:bg-white hover:bg-[#2E2E2E]/90 dark:hover:bg-white/90 text-white dark:text-[#2E2E2E]"
                                        onClick={() => handleDecision("hired")}
                                        disabled={isProcessingDecision || decisionStatus === "hired" || applications[0]?.decision === "hired"}
                                    >
                                        {isProcessingDecision ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        )}
                                        Hire Candidate
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="border-[#2E2E2E]/30 dark:border-white/30 text-[#2E2E2E]/80 dark:text-white/80 hover:bg-[#2E2E2E]/10 dark:hover:bg-white/10"
                                        onClick={() => handleDecision("consider")}
                                        disabled={isProcessingDecision || decisionStatus === "consider" || applications[0]?.decision === "consider"}
                                    >
                                        {isProcessingDecision ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Clock className="h-4 w-4 mr-2" />
                                        )}
                                        Mark for Consideration
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="border-[#2E2E2E]/30 dark:border-white/30 text-[#2E2E2E]/60 dark:text-white/60 hover:bg-[#2E2E2E]/10 dark:hover:bg-white/10"
                                        onClick={() => handleDecision("rejected")}
                                        disabled={isProcessingDecision || decisionStatus === "rejected" || applications[0]?.decision === "rejected"}
                                    >
                                        {isProcessingDecision ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <XCircle className="h-4 w-4 mr-2" />
                                        )}
                                        Reject Candidate
                                    </Button>
                                </div>
                            </Card>
                        </TabsContent>

                    </Tabs>
                </motion.div>
            </main>
        </div>
    );
}
