"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Star,
  AlertTriangle,
  Sparkles,
  Target,
  X,
  ChevronDown,
  ChevronUp,
  Link2,
  Github,
  Linkedin,
  MapPin,
  Award,
  FileCheck,
  Eye,
  Gauge,
  Scan,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
}

interface ResumeShortlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  onCandidatesShortlisted?: (candidates: ParsedCandidate[]) => void;
}

export function ResumeShortlistModal({
  open,
  onOpenChange,
  jobs,
  onCandidatesShortlisted,
}: ResumeShortlistModalProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<"select" | "upload" | "processing" | "results">("select");
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

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
      experience: c.experience,
      education: c.education,
      rawText: c.rawText,
      // New detailed fields
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
    const requiredSkills = job.skills_config?.required || job.requirements || [];
    const niceToHaveSkills = job.skills_config?.nice_to_have || [];
    const allJobSkills = [...requiredSkills, ...niceToHaveSkills];

    const candidateSkillsLower = candidate.skills.map((s) => s.toLowerCase());

    // Calculate matched and missing skills
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    requiredSkills.forEach((skill) => {
      const skillLower = skill.toLowerCase();
      if (candidateSkillsLower.some((cs) => cs.includes(skillLower) || skillLower.includes(cs))) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    // Nice-to-have skills boost score but don't penalize
    niceToHaveSkills.forEach((skill) => {
      const skillLower = skill.toLowerCase();
      if (candidateSkillsLower.some((cs) => cs.includes(skillLower) || skillLower.includes(cs))) {
        matchedSkills.push(skill);
      }
    });

    // Calculate score
    const requiredWeight = 0.7;
    const niceToHaveWeight = 0.3;

    const requiredScore = requiredSkills.length > 0
      ? (matchedSkills.filter((s) => requiredSkills.includes(s)).length / requiredSkills.length) * 100
      : 100;

    const niceToHaveMatched = matchedSkills.filter((s) => niceToHaveSkills.includes(s)).length;
    const niceToHaveScore = niceToHaveSkills.length > 0
      ? (niceToHaveMatched / niceToHaveSkills.length) * 100
      : 0;

    const matchScore = Math.round(requiredScore * requiredWeight + niceToHaveScore * niceToHaveWeight);

    // Check eligibility based on cutoff
    const cutoff = job.cutoffs_config?.technical || 60;
    const eligible = matchScore >= cutoff && missingSkills.length < requiredSkills.length * 0.5;

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      eligible,
    };
  };

  // Process all uploaded resumes
  const processResumes = async () => {
    if (!selectedJob || uploadedFiles.length === 0) return;

    setProcessing(true);
    setCurrentStep("processing");
    setProgress(0);

    try {
      // Parse all resumes via API
      setProgress(30);
      const parsedCandidates = await parseResumesViaAPI(uploadedFiles);
      setProgress(70);
      
      // Calculate match scores for each candidate
      const candidates: ParsedCandidate[] = parsedCandidates.map((parsedData) => {
        const matchData = calculateMatchScore(parsedData, selectedJob);
        return {
          ...parsedData,
          ...matchData,
        };
      });
      
      setProgress(90);

      // Sort by match score
      candidates.sort((a, b) => b.matchScore - a.matchScore);

      setParsedCandidates(candidates);
      setCurrentStep("results");
      setProgress(100);

      const eligibleCount = candidates.filter((c) => c.eligible).length;
      toast.success(`Processed ${candidates.length} resumes. ${eligibleCount} candidates eligible.`);

      if (onCandidatesShortlisted) {
        onCandidatesShortlisted(candidates.filter((c) => c.eligible));
      }
    } catch (error) {
      console.error("Error processing resumes:", error);
      toast.error("Failed to process resumes");
      setCurrentStep("upload");
    } finally {
      setProcessing(false);
    }
  };

  const resetModal = () => {
    setSelectedJobId("");
    setUploadedFiles([]);
    setParsedCandidates([]);
    setCurrentStep("select");
    setProgress(0);
    setExpandedCards(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetModal();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Resume Shortlisting
          </DialogTitle>
          <DialogDescription>
            Upload resumes in bulk and let AI match them against job requirements
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Job */}
            {currentStep === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Job Position</label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a job to match resumes against" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.title}</span>
                            <span className="text-muted-foreground">- {job.company_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedJob && (
                  <Card className="p-4 bg-muted/30 border-border">
                    <h4 className="font-medium mb-2">Job Requirements</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(selectedJob.skills_config?.required || selectedJob.requirements || []).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {selectedJob.skills_config?.nice_to_have && selectedJob.skills_config.nice_to_have.length > 0 && (
                      <>
                        <h4 className="font-medium mb-2 text-sm">Nice to Have</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills_config.nice_to_have.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-muted-foreground">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                )}

                <Button
                  onClick={() => setCurrentStep("upload")}
                  disabled={!selectedJobId}
                  className="w-full"
                >
                  Continue to Upload
                  <FileText className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Upload Files */}
            {currentStep === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop PDF resumes here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("select")}>
                    Back
                  </Button>
                  <Button
                    onClick={processResumes}
                    disabled={uploadedFiles.length === 0}
                    className="flex-1"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Process {uploadedFiles.length} Resume{uploadedFiles.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {currentStep === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-2">Processing Resumes...</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Extracting text and matching against job requirements
                </p>
                <Progress value={progress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
              </motion.div>
            )}

            {/* Step 4: Results */}
            {currentStep === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Results</h3>
                    <p className="text-sm text-muted-foreground">
                      {parsedCandidates.filter((c) => c.eligible).length} eligible out of{" "}
                      {parsedCandidates.length} candidates
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {selectedJob?.title}
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {parsedCandidates.map((candidate, index) => {
                    const isExpanded = expandedCards.has(candidate.id);
                    return (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          className={`p-4 ${
                            candidate.eligible
                              ? "border-green-500/30 bg-green-500/5"
                              : "border-border bg-muted/20"
                          }`}
                        >
                          {/* Header Row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  candidate.eligible
                                    ? "bg-green-500/20 text-green-500"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-medium">{candidate.name}</h4>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  {candidate.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {candidate.email}
                                    </span>
                                  )}
                                  {candidate.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {candidate.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`text-2xl font-bold ${
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
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Extraction Info Badges */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                            {candidate.success === false && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Parse Error
                              </Badge>
                            )}
                          </div>

                          {/* Social Links */}
                          {(candidate.linkedin || candidate.github || candidate.website) && (
                            <div className="flex items-center gap-2 mb-3">
                              {candidate.linkedin && (
                                <a
                                  href={candidate.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                  <Linkedin className="h-3 w-3" />
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
                                  <Github className="h-3 w-3" />
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
                                  <Link2 className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          )}

                          {/* Basic Info Grid */}
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {candidate.yearsOfExperience 
                                  ? `${candidate.yearsOfExperience} years`
                                  : "Experience not specified"}
                              </span>
                            </div>
                            {candidate.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{candidate.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 col-span-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">
                                {Array.isArray(candidate.education) && candidate.education.length > 0
                                  ? (typeof candidate.education[0] === "string" 
                                      ? candidate.education[0] 
                                      : `${candidate.education[0].degree}${candidate.education[0].field ? ` in ${candidate.education[0].field}` : ""}${candidate.education[0].institution ? ` - ${candidate.education[0].institution}` : ""}`)
                                  : (typeof candidate.education === "string" ? candidate.education : "Not specified")}
                              </span>
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
                                    <div className="bg-muted/30 rounded-md p-2">
                                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <FileCheck className="h-3 w-3" /> Parsing Details:
                                      </span>
                                      <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
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
                                    <div className="bg-red-500/10 rounded-md p-2">
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
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetModal}>
                    Start Over
                  </Button>
                  <Button onClick={() => onOpenChange(false)} className="flex-1">
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
