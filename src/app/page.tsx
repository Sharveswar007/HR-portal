"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Plus,
  MapPin,
  Clock,
  Users,
  MoreVertical,
  Building2,
  Loader2,
  TrendingUp,
  Target,
  Brain,
  Code,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Activity,
  Award,
  UserCheck,
  UserX,
  Eye,
  FileUp,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  completedAssessments: number;
  pendingReviews: number;
  hireRecommended: number;
  noHireRecommended: number;
  avgTechnicalScore: number;
  avgPsychometricScore: number;
  avgCodingScore: number;
  avgIntegrityScore: number;
  recentCandidates: any[];
  recentJobs: any[];
  topPerformers: any[];
}

export default function HRDashboard() {
  const [loading, setLoading] = useState(true);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    completedAssessments: 0,
    pendingReviews: 0,
    hireRecommended: 0,
    noHireRecommended: 0,
    avgTechnicalScore: 0,
    avgPsychometricScore: 0,
    avgCodingScore: 0,
    avgIntegrityScore: 0,
    recentCandidates: [],
    recentJobs: [],
    topPerformers: [],
  });
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUserAndLoadDashboard();
  }, []);

  const checkUserAndLoadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "candidate") {
      window.location.href = "http://localhost:3000/candidate/dashboard";
      return;
    }

    setUser(user);

    // Fetch all dashboard data
    const [
      jobsResult,
      sessionsResult,
      decisionsResult,
    ] = await Promise.all([
      supabase
        .from("job_descriptions")
        .select("*, applications(count)")
        .eq("recruiter_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("assessment_sessions")
        .select(`
          *,
          profiles:candidate_id (id, full_name, email, avatar_url),
          job_descriptions:job_id (title, company_name)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("hiring_decisions")
        .select("*"),
    ]);

    const jobs = jobsResult.data || [];
    const sessions = sessionsResult.data || [];
    const decisions = decisionsResult.data || [];
    
    // Store all jobs for the resume shortlist modal
    setAllJobs(jobs);

    // Calculate stats
    const completedSessions = sessions.filter((s: any) => s.status === "completed");
    const pendingSessions = sessions.filter((s: any) => 
      s.status === "completed" && !decisions.find((d: any) => d.session_id === s.id)
    );
    const hireDecisions = decisions.filter((d: any) => d.recommended_action === "hire");
    const noHireDecisions = decisions.filter((d: any) => d.recommended_action === "no_hire");

    // Calculate average scores
    const validScores = completedSessions.filter((s: any) => s.technical_score != null);
    const avgTechnical = validScores.length > 0 
      ? validScores.reduce((sum: number, s: any) => sum + (s.technical_score || 0), 0) / validScores.length 
      : 0;
    const avgPsychometric = validScores.length > 0
      ? validScores.reduce((sum: number, s: any) => sum + (s.psychometric_score || 0), 0) / validScores.length
      : 0;
    const avgCoding = validScores.length > 0
      ? validScores.reduce((sum: number, s: any) => sum + (s.coding_score || 0), 0) / validScores.length
      : 0;
    const avgIntegrity = validScores.length > 0
      ? validScores.reduce((sum: number, s: any) => sum + (s.integrity_score || 0), 0) / validScores.length
      : 0;

    // Get top performers (by total_score)
    const topPerformers = [...completedSessions]
      .filter((s: any) => s.total_score != null)
      .sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 5);

    setStats({
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j: any) => j.status === "active").length,
      totalCandidates: sessions.length,
      completedAssessments: completedSessions.length,
      pendingReviews: pendingSessions.length,
      hireRecommended: hireDecisions.length,
      noHireRecommended: noHireDecisions.length,
      avgTechnicalScore: Math.round(avgTechnical),
      avgPsychometricScore: Math.round(avgPsychometric),
      avgCodingScore: Math.round(avgCoding),
      avgIntegrityScore: Math.round(avgIntegrity),
      recentCandidates: sessions.slice(0, 5),
      recentJobs: jobs.slice(0, 4).map((j: any) => ({
        ...j,
        applicant_count: j.applications?.[0]?.count || 0,
      })),
      topPerformers,
    });

    setLoading(false);
  };

  const statCards = [
    { label: "Total Candidates", value: stats.totalCandidates, icon: Users, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
    { label: "Completed Assessments", value: stats.completedAssessments, icon: CheckCircle2, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
    { label: "Hire Recommended", value: stats.hireRecommended, icon: UserCheck, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
    { label: "Not Recommended", value: stats.noHireRecommended, icon: UserX, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
    { label: "Pending Reviews", value: stats.pendingReviews, icon: AlertTriangle, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
    { label: "Active Jobs", value: stats.activeJobs, icon: Briefcase, color: "text-[#2E2E2E] dark:text-white", bg: "bg-[#2E2E2E]/10 dark:bg-white/10" },
  ];

  const scoreCards = [
    { label: "Avg Technical", value: stats.avgTechnicalScore, icon: Target, color: "text-[#2E2E2E] dark:text-white", progressColor: "bg-[#2E2E2E] dark:bg-white" },
    { label: "Avg Psychometric", value: stats.avgPsychometricScore, icon: Brain, color: "text-[#2E2E2E] dark:text-white", progressColor: "bg-[#2E2E2E] dark:bg-white" },
    { label: "Avg Coding", value: stats.avgCodingScore, icon: Code, color: "text-[#2E2E2E] dark:text-white", progressColor: "bg-[#2E2E2E] dark:bg-white" },
    { label: "Avg Integrity", value: stats.avgIntegrityScore, icon: Shield, color: "text-[#2E2E2E] dark:text-white", progressColor: "bg-[#2E2E2E] dark:bg-white" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">HR Dashboard</h1>
            <p className="text-muted-foreground">Overview of your recruitment pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/resume-shortlist">
              <Button
                variant="outline"
                className="border-[#2E2E2E] text-[#2E2E2E] hover:bg-[#2E2E2E] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#2E2E2E]"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Bulk Resume Upload
              </Button>
            </Link>
            <Link href="/jobs/new">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                <Plus className="mr-2 h-4 w-4" />
                Create New Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 bg-card border-border hover:border-primary/30 transition-all">
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Score Averages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {scoreCards.map((score, index) => (
            <motion.div
              key={score.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <score.icon className={`h-4 w-4 ${score.color}`} />
                    <span className="text-sm font-medium">{score.label}</span>
                  </div>
                  <span className="text-lg font-bold">{score.value}%</span>
                </div>
                <Progress value={score.value} className="h-2" />
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Candidates */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Candidates
                </h2>
                <Link href="/candidates">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              {stats.recentCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No candidates yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentCandidates.map((candidate: any) => (
                    <Link href={`/candidate/${candidate.id}`} key={candidate.id}>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {candidate.profiles?.full_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-medium">{candidate.profiles?.full_name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">
                              {candidate.job_descriptions?.title || "General Assessment"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold">{candidate.total_score || 0}%</div>
                            <div className="text-xs text-muted-foreground">Total Score</div>
                          </div>
                          <Badge className={
                            candidate.status === "completed" 
                              ? "bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white"
                              : candidate.status === "in_progress"
                              ? "bg-[#2E2E2E]/5 dark:bg-white/5 text-[#2E2E2E]/70 dark:text-white/70"
                              : "bg-gray-500/10 text-gray-600"
                          }>
                            {candidate.status || "pending"}
                          </Badge>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-[#2E2E2E] dark:text-white" />
                Top Performers
              </h2>
              
              {stats.topPerformers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No completed assessments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.topPerformers.map((performer: any, index: number) => (
                    <Link href={`/candidate/${performer.id}`} key={performer.id}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]" :
                          index === 1 ? "bg-[#2E2E2E]/70 dark:bg-white/70 text-white dark:text-[#2E2E2E]" :
                          index === 2 ? "bg-[#2E2E2E]/50 dark:bg-white/50 text-white dark:text-[#2E2E2E]" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {performer.profiles?.full_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {performer.job_descriptions?.title || "Assessment"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#2E2E2E] dark:text-white">{performer.total_score}%</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Job Postings Grid */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Active Job Postings
              </h2>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  Manage Jobs <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {stats.recentJobs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No jobs posted yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first job posting</p>
                <Link href="/jobs/new">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Create Job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.recentJobs.map((job: any) => (
                  <Link href={`/jobs/${job.id}`} key={job.id}>
                    <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <Badge className={job.status === "active" 
                          ? "bg-[#2E2E2E]/10 dark:bg-white/10 text-[#2E2E2E] dark:text-white" 
                          : "bg-gray-500/10 text-gray-600"
                        }>
                          {job.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3" />
                        {job.location || "Remote"}
                        <span className="mx-1">•</span>
                        <Clock className="h-3 w-3" />
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{job.applicant_count}</span>
                          <span className="text-muted-foreground">applicants</span>
                        </div>
                        <BarChart3 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
