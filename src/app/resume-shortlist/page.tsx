"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Github,
  Linkedin,
  Link2,
  MapPin,
  Award,
  FileCheck,
  Gauge,
  Scan,
  ArrowLeft,
  Sparkles,
  X,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  UserMinus,
  Check,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Job {
  id: string;
  title: string;
  company_name: string;
  description: string;
  skills_config?: {
    required?: string[];
    nice_to_have?: string[];
  };
  requirements?: string[];
  cutoffs_config?: {
    technical?: number;
  };
}

interface ParsedCandidate {
  id: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
  website?: string;
  location?: string;
  skills: string[];
  skillsByCategory?: { [category: string]: string[] };
  yearsOfExperience?: string;
  education: { degree: string; field: string; institution: string }[] | string;
  certifications?: string[];
  workHistory?: { company: string; role: string; duration: string }[];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  eligible: boolean;
  rawText: string;
  textLength?: number;
  confidenceScore?: number;
  extractionMethod?: string;
  parsingDetails?: {
    extractedEmail: boolean;
    extractedPhone: boolean;
    extractedName: boolean;
    extractedSkills: number;
    extractedEducation: number;
    extractedCertifications: number;
  };
  success?: boolean;
  error?: string;
  decision?: "accepted" | "rejected" | "pending";
}

export default function ResumeShortlistPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<"select" | "upload" | "processing" | "results">("select");
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [candidateDecisions, setCandidateDecisions] = useState<Record<string, "accepted" | "rejected" | "pending">>({});
  const [savingDecision, setSavingDecision] = useState<string | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  // Handle candidate decision (accept/reject)
  const handleDecision = async (candidateId: string, decision: "accepted" | "rejected") => {
    setSavingDecision(candidateId);
    
    // Update local state
    setCandidateDecisions((prev) => ({
      ...prev,
      [candidateId]: decision,
    }));

    // Update the candidate in the list
    setParsedCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, decision } : c
      )
    );

    toast.success(
      decision === "accepted" 
        ? "Candidate accepted!" 
        : "Candidate rejected"
    );
    
    setSavingDecision(null);
  };

  // Bulk actions
  const handleAcceptAll = () => {
    const eligible = parsedCandidates.filter((c) => c.eligible && !candidateDecisions[c.id]);
    const newDecisions: Record<string, "accepted" | "rejected" | "pending"> = {};
    eligible.forEach((c) => {
      newDecisions[c.id] = "accepted";
    });
    setCandidateDecisions((prev) => ({ ...prev, ...newDecisions }));
    setParsedCandidates((prev) =>
      prev.map((c) =>
        c.eligible && !candidateDecisions[c.id] ? { ...c, decision: "accepted" } : c
      )
    );
    toast.success(`Accepted ${eligible.length} eligible candidates`);
  };

  const handleRejectAll = () => {
    const notEligible = parsedCandidates.filter((c) => !c.eligible && !candidateDecisions[c.id]);
    const newDecisions: Record<string, "accepted" | "rejected" | "pending"> = {};
    notEligible.forEach((c) => {
      newDecisions[c.id] = "rejected";
    });
    setCandidateDecisions((prev) => ({ ...prev, ...newDecisions }));
    setParsedCandidates((prev) =>
      prev.map((c) =>
        !c.eligible && !candidateDecisions[c.id] ? { ...c, decision: "rejected" } : c
      )
    );
    toast.success(`Rejected ${notEligible.length} non-eligible candidates`);
  };

  // Load jobs on mount
  useEffect(() => {
    async function loadJobs() {
      try {
        const supabase = createClient();
        
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        
        const { data, error } = await supabase
          .from("job_descriptions")
          .select("*")
          .eq("recruiter_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error("Error loading jobs:", error);
        toast.error("Failed to load jobs");
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, [router]);

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle file drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
    } else {
      toast.error("Please upload PDF files only");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );
      setUploadedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Parse resumes via API
  const parseResumesViaAPI = async (files: File[]): Promise<Omit<ParsedCandidate, "matchScore" | "matchedSkills" | "missingSkills" | "eligible">[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    
    const response = await fetch("/api/parse-resume", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error("Failed to parse resumes");
    }
    
    const data = await response.json();
    return data.candidates.map((c: any) => ({
      id: c.id,
      fileName: c.fileName,
      name: c.name,
      email: c.email,
      phone: c.phone,
      skills: c.skills || [],
      education: c.education,
      rawText: c.rawText,
      linkedin: c.linkedin,
      github: c.github,
      website: c.website,
      location: c.location,
      skillsByCategory: c.skillsByCategory,
      yearsOfExperience: c.yearsOfExperience,
      certifications: c.certifications || [],
      workHistory: c.workHistory || [],
      textLength: c.textLength,
      confidenceScore: c.confidenceScore,
      extractionMethod: c.extractionMethod,
      parsingDetails: c.parsingDetails,
      success: c.success,
      error: c.error,
    }));
  };

  // Calculate match score based on job requirements
  const calculateMatchScore = (
    candidate: Omit<ParsedCandidate, "matchScore" | "matchedSkills" | "missingSkills" | "eligible">,
    job: Job
  ): Pick<ParsedCandidate, "matchScore" | "matchedSkills" | "missingSkills" | "eligible"> => {
    const requiredSkills = job.skills_config?.required || [];
    const niceToHaveSkills = job.skills_config?.nice_to_have || [];
    const allJobSkills = [...requiredSkills, ...niceToHaveSkills];

    const candidateSkillsLower = candidate.skills.map((s) => s.toLowerCase());
    
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of requiredSkills) {
      if (candidateSkillsLower.some((cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    for (const skill of niceToHaveSkills) {
      if (candidateSkillsLower.some((cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))) {
        if (!matchedSkills.includes(skill)) {
          matchedSkills.push(skill);
        }
      }
    }

    const requiredMatched = matchedSkills.filter((s) => requiredSkills.includes(s)).length;
    const requiredTotal = requiredSkills.length || 1;
    const niceMatched = matchedSkills.filter((s) => niceToHaveSkills.includes(s)).length;
    const niceTotal = niceToHaveSkills.length || 1;

    const matchScore = Math.round(
      (requiredMatched / requiredTotal) * 70 + (niceMatched / niceTotal) * 30
    );

    const cutoff = job.cutoffs_config?.technical || 50;
    const eligible = matchScore >= cutoff;

    return { matchScore, matchedSkills, missingSkills, eligible };
  };

  // Process resumes
  const processResumes = async () => {
    if (!selectedJob || uploadedFiles.length === 0) return;

    setProcessing(true);
    setCurrentStep("processing");
    setProgress(0);

    try {
      // Parse resumes
      setProgress(20);
      const parsed = await parseResumesViaAPI(uploadedFiles);
      setProgress(60);

      // Calculate match scores
      const withScores: ParsedCandidate[] = parsed.map((candidate) => {
        const scores = calculateMatchScore(candidate, selectedJob);
        return { ...candidate, ...scores };
      });

      setProgress(80);

      // Sort by match score
      withScores.sort((a, b) => b.matchScore - a.matchScore);

      setParsedCandidates(withScores);
      setProgress(100);

      setTimeout(() => {
        setCurrentStep("results");
        setProcessing(false);
      }, 500);

      toast.success(`Processed ${withScores.length} resumes`);
    } catch (error) {
      console.error("Error processing resumes:", error);
      toast.error("Failed to process resumes");
      setProcessing(false);
      setCurrentStep("upload");
    }
  };

  const resetPage = () => {
    setSelectedJobId("");
    setUploadedFiles([]);
    setParsedCandidates([]);
    setCurrentStep("select");
    setProgress(0);
    setExpandedCards(new Set());
    setCandidateDecisions({});
  };

  const formatEducation = (edu: ParsedCandidate["education"]) => {
    if (typeof edu === "string") return edu || "Not specified";
    if (Array.isArray(edu) && edu.length > 0) {
      const first = edu[0];
      return typeof first === "string" 
        ? first 
        : `${first.degree}${first.field ? ` in ${first.field}` : ""}${first.institution ? ` - ${first.institution}` : ""}`;
    }
    return "Not specified";
  };

  if (loadingJobs) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AI Resume Shortlisting
              </h1>
              <p className="text-muted-foreground">
                Upload resumes in bulk and let AI match them against job requirements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {["select", "upload", "processing", "results"].map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep === step
                    ? "bg-primary text-primary-foreground"
                    : ["select", "upload", "processing", "results"].indexOf(currentStep) > index
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["select", "upload", "processing", "results"].indexOf(currentStep) > index ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-sm font-medium capitalize hidden sm:inline">{step === "select" ? "Select Job" : step}</span>
              {index < 3 && <div className="w-8 h-0.5 bg-muted hidden sm:block" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Job */}
          {currentStep === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="p-8">
                <h2 className="text-xl font-semibold mb-2">Select a Job Position</h2>
                <p className="text-muted-foreground mb-6">
                  Choose the job to match resumes against its requirements
                </p>

                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="w-full h-14">
                    <SelectValue placeholder="Select a job position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{job.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {job.company_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedJob && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills_config?.required?.map((skill, i) => (
                        <Badge key={i} variant="secondary">
                          {skill}
                        </Badge>
                      )) || <span className="text-muted-foreground text-sm">No specific skills required</span>}
                    </div>
                    {selectedJob.skills_config?.nice_to_have && selectedJob.skills_config.nice_to_have.length > 0 && (
                      <>
                        <h3 className="font-medium mt-4 mb-2">Nice to Have</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills_config.nice_to_have.map((skill, i) => (
                            <Badge key={i} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button
                  className="w-full mt-6"
                  size="lg"
                  disabled={!selectedJobId}
                  onClick={() => setCurrentStep("upload")}
                >
                  Continue to Upload
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Upload Files */}
          {currentStep === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Upload Resumes</h2>
                    <p className="text-muted-foreground">
                      Drag and drop PDF files or click to browse
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {selectedJob?.title}
                  </Badge>
                </div>

                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop PDF files here</p>
                  <p className="text-sm text-muted-foreground mb-4">or</p>
                  <label>
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <Button variant="outline" asChild>
                      <span className="cursor-pointer">Browse Files</span>
                    </Button>
                  </label>
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">
                      Uploaded Files ({uploadedFiles.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                        >
                          <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep("select")}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    disabled={uploadedFiles.length === 0}
                    onClick={processResumes}
                  >
                    Process {uploadedFiles.length} Resume{uploadedFiles.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Processing */}
          {currentStep === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-lg mx-auto"
            >
              <Card className="p-12 text-center">
                <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" />
                <h3 className="text-xl font-medium mb-2">Processing Resumes...</h3>
                <p className="text-muted-foreground mb-6">
                  Extracting text with OCR and matching against job requirements
                </p>
                <Progress value={progress} className="w-full max-w-md mx-auto h-3" />
                <p className="text-sm text-muted-foreground mt-3">{progress}% complete</p>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {currentStep === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Summary Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Results</h2>
                  <p className="text-muted-foreground">
                    {parsedCandidates.filter((c) => c.eligible).length} eligible out of{" "}
                    {parsedCandidates.length} candidates
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/10 text-primary text-sm py-1 px-3">
                    {selectedJob?.title}
                  </Badge>
                  <Button variant="outline" onClick={resetPage}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{parsedCandidates.length}</div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-500">
                    {parsedCandidates.filter((c) => c.eligible).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Eligible</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {parsedCandidates.filter((c) => c.decision === "accepted").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Accepted</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-red-500">
                    {parsedCandidates.filter((c) => c.decision === "rejected").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Rejected</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-500">
                    {parsedCandidates.filter((c) => !c.decision || c.decision === "pending").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-purple-500">
                    {Math.round(
                      parsedCandidates.reduce((sum, c) => sum + c.matchScore, 0) /
                        Math.max(1, parsedCandidates.length)
                    )}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Match</div>
                </Card>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Button 
                  variant="outline" 
                  onClick={handleAcceptAll}
                  className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Accept All Eligible ({parsedCandidates.filter((c) => c.eligible && !candidateDecisions[c.id]).length})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRejectAll}
                  className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Reject Non-Eligible ({parsedCandidates.filter((c) => !c.eligible && !candidateDecisions[c.id]).length})
                </Button>
              </div>

              {/* Candidates Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {parsedCandidates.map((candidate, index) => {
                  const isExpanded = expandedCards.has(candidate.id);
                  const decision = candidate.decision || candidateDecisions[candidate.id];
                  return (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card
                        className={`p-5 relative overflow-hidden ${
                          decision === "accepted"
                            ? "border-green-500 bg-green-500/10"
                            : decision === "rejected"
                            ? "border-red-500/50 bg-red-500/5 opacity-75"
                            : candidate.eligible
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        {/* Decision Banner */}
                        {decision && (
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            decision === "accepted" ? "bg-green-500" : "bg-red-500"
                          }`} />
                        )}

                        {/* Header Row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                                decision === "accepted"
                                  ? "bg-green-500/20 text-green-500"
                                  : decision === "rejected"
                                  ? "bg-red-500/20 text-red-500"
                                  : candidate.eligible
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {decision === "accepted" ? (
                                <Check className="h-6 w-6" />
                              ) : decision === "rejected" ? (
                                <Ban className="h-6 w-6" />
                              ) : (
                                <User className="h-6 w-6" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{candidate.name}</h4>
                                {decision && (
                                  <Badge className={`text-xs ${
                                    decision === "accepted" 
                                      ? "bg-green-500 text-white" 
                                      : "bg-red-500 text-white"
                                  }`}>
                                    {decision === "accepted" ? "Accepted" : "Rejected"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {candidate.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {candidate.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`text-3xl font-bold ${
                                candidate.matchScore >= 70
                                  ? "text-green-500"
                                  : candidate.matchScore >= 50
                                  ? "text-yellow-500"
                                  : "text-red-500"
                              }`}
                            >
                              {candidate.matchScore}%
                            </div>
                            {candidate.eligible ? (
                              <CheckCircle2 className="h-6 w-6 text-green-500" />
                            ) : (
                              <XCircle className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Contact & Extraction Info */}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          {candidate.phone && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {candidate.phone}
                            </span>
                          )}
                          {candidate.extractionMethod && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                              <Scan className="h-3 w-3 mr-1" />
                              {candidate.extractionMethod === "ocr" ? "OCR Extracted" : "Text Extracted"}
                            </Badge>
                          )}
                          {candidate.confidenceScore !== undefined && (
                            <Badge variant="outline" className={`text-xs ${
                              candidate.confidenceScore >= 80 ? "bg-green-500/10 text-green-500 border-green-500/30" :
                              candidate.confidenceScore >= 50 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                              "bg-red-500/10 text-red-500 border-red-500/30"
                            }`}>
                              <Gauge className="h-3 w-3 mr-1" />
                              {candidate.confidenceScore}% confidence
                            </Badge>
                          )}
                        </div>

                        {/* Social Links */}
                        {(candidate.linkedin || candidate.github || candidate.website) && (
                          <div className="flex items-center gap-3 mb-3">
                            {candidate.linkedin && (
                              <a
                                href={candidate.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                              >
                                <Linkedin className="h-4 w-4" />
                                LinkedIn
                              </a>
                            )}
                            {candidate.github && (
                              <a
                                href={candidate.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <Github className="h-4 w-4" />
                                GitHub
                              </a>
                            )}
                            {candidate.website && (
                              <a
                                href={candidate.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 transition-colors"
                              >
                                <Link2 className="h-4 w-4" />
                                Website
                              </a>
                            )}
                          </div>
                        )}

                        {/* Basic Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span>{candidate.yearsOfExperience || "Not specified"} years</span>
                          </div>
                          {candidate.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{candidate.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 col-span-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{formatEducation(candidate.education)}</span>
                          </div>
                        </div>

                        {/* Skills */}
                        <div className="space-y-2">
                          {candidate.matchedSkills.length > 0 && (
                            <div>
                              <span className="text-xs text-muted-foreground">Matched Skills:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.matchedSkills.slice(0, isExpanded ? undefined : 5).map((skill, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="bg-green-500/10 text-green-600 text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {!isExpanded && candidate.matchedSkills.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{candidate.matchedSkills.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          {candidate.missingSkills.length > 0 && (
                            <div>
                              <span className="text-xs text-muted-foreground">Missing Skills:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {candidate.missingSkills.slice(0, isExpanded ? undefined : 3).map((skill, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-red-500 border-red-500/30 text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {!isExpanded && candidate.missingSkills.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{candidate.missingSkills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Expandable Detailed Section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-border space-y-3">
                                {/* Skills by Category */}
                                {candidate.skillsByCategory && Object.keys(candidate.skillsByCategory).length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Skills by Category:</span>
                                    <div className="mt-2 space-y-2">
                                      {Object.entries(candidate.skillsByCategory).map(([category, skills]) => (
                                        <div key={category}>
                                          <span className="text-xs text-muted-foreground capitalize">{category}:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {(skills as string[]).map((skill, i) => (
                                              <Badge key={i} variant="outline" className="text-xs">
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Education List */}
                                {Array.isArray(candidate.education) && candidate.education.length > 1 && (
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <GraduationCap className="h-3 w-3" /> All Education:
                                    </span>
                                    <ul className="mt-1 text-sm space-y-1">
                                      {candidate.education.map((edu, i) => (
                                        <li key={i} className="text-muted-foreground">
                                          • {typeof edu === "string" 
                                              ? edu 
                                              : `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}${edu.institution ? ` - ${edu.institution}` : ""}`}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Certifications */}
                                {candidate.certifications && candidate.certifications.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <Award className="h-3 w-3" /> Certifications:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {candidate.certifications.map((cert, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">
                                          {cert}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Parsing Details */}
                                {candidate.parsingDetails && (
                                  <div className="bg-muted/30 rounded-md p-3">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                      <FileCheck className="h-3 w-3" /> Parsing Details:
                                    </span>
                                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                                      <div>Skills: {candidate.parsingDetails.extractedSkills}</div>
                                      <div>Education: {candidate.parsingDetails.extractedEducation}</div>
                                      <div>Certs: {candidate.parsingDetails.extractedCertifications}</div>
                                    </div>
                                    {candidate.textLength && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Text length: {candidate.textLength.toLocaleString()} chars
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Error Info */}
                                {candidate.error && (
                                  <div className="bg-red-500/10 rounded-md p-3">
                                    <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Error:
                                    </span>
                                    <p className="text-xs text-red-400 mt-1">{candidate.error}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Expand/Collapse Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCardExpand(candidate.id)}
                          className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show Details
                            </>
                          )}
                        </Button>

                        {/* Accept/Reject Buttons */}
                        {!decision && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecision(candidate.id, "accepted")}
                              disabled={savingDecision === candidate.id}
                              className="flex-1 border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                            >
                              {savingDecision === candidate.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecision(candidate.id, "rejected")}
                              disabled={savingDecision === candidate.id}
                              className="flex-1 border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                            >
                              {savingDecision === candidate.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ThumbsDown className="h-4 w-4 mr-2" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Undo Decision */}
                        {decision && (
                          <div className="flex justify-center mt-3 pt-3 border-t border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCandidateDecisions((prev) => {
                                  const newDecisions = { ...prev };
                                  delete newDecisions[candidate.id];
                                  return newDecisions;
                                });
                                setParsedCandidates((prev) =>
                                  prev.map((c) =>
                                    c.id === candidate.id ? { ...c, decision: undefined } : c
                                  )
                                );
                                toast.info("Decision undone");
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Undo Decision
                            </Button>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
