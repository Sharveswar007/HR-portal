"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, X, Sparkles, Building2, Target, Shield, Code2, Briefcase, MapPin, Clock, Zap, Video, ChevronRight, Loader2, UserCheck, UserCog } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
};

export default function CreateJobPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState(0);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        company_name: "",
        location: "Remote",
        work_mode: "remote",
        employment_type: "full-time",
        seniority_level: "mid",
        experience_range: "3-5 Years",
        role_focus: "Full Stack",
        description: "",

        required_skills: [] as string[],
        nice_to_have_skills: [] as string[],
        newRequiredSkill: "",
        newNiceSkill: "",

        weights: {
            problem_solving: 25,
            coding: 25,
            system_design: 25,
            communication: 25
        },

        cutoffs: {
            technical: 70,
            psychometric: 60,
            integrity: 80
        },

        assessment: {
            difficulty: "Medium",
            languages: [] as string[],
            duration_m: 60,
            webcam: true,
            auto_hire: false
        }
    });

    const addSkill = (type: 'required' | 'nice') => {
        if (type === 'required' && formData.newRequiredSkill.trim()) {
            setFormData(p => ({
                ...p,
                required_skills: [...p.required_skills, p.newRequiredSkill.trim()],
                newRequiredSkill: ""
            }));
        }
        if (type === 'nice' && formData.newNiceSkill.trim()) {
            setFormData(p => ({
                ...p,
                nice_to_have_skills: [...p.nice_to_have_skills, p.newNiceSkill.trim()],
                newNiceSkill: ""
            }));
        }
    };

    const removeSkill = (type: 'required' | 'nice', idx: number) => {
        if (type === 'required') {
            setFormData(p => ({ ...p, required_skills: p.required_skills.filter((_, i) => i !== idx) }));
        } else {
            setFormData(p => ({ ...p, nice_to_have_skills: p.nice_to_have_skills.filter((_, i) => i !== idx) }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.company_name || !formData.description) {
            toast.error("Please fill in all required fields (Title, Company, Description)");
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("job_descriptions")
                .insert({
                    recruiter_id: user.id,
                    title: formData.title,
                    company_name: formData.company_name,
                    location: formData.location,
                    description: formData.description,
                    work_mode: formData.work_mode,
                    employment_type: formData.employment_type,
                    seniority_level: formData.seniority_level,
                    experience_range: formData.experience_range,
                    role_focus: formData.role_focus,
                    skills_config: {
                        required: formData.required_skills,
                        nice_to_have: formData.nice_to_have_skills
                    },
                    weights_config: formData.weights,
                    cutoffs_config: formData.cutoffs,
                    assessment_config: formData.assessment,
                    requirements: formData.required_skills,
                    criteria: formData.cutoffs,
                    status: "active"
                });

            if (error) throw error;

            toast.success("Job Published Successfully!");
            router.push("/");
        } catch (error: any) {
            console.error("Error creating job:", error);
            toast.error(error.message || "Failed to create job");
        } finally {
            setLoading(false);
        }
    };

    const totalWeight = Object.values(formData.weights).reduce((a, b) => a + b, 0);

    return (
        <div className="min-h-screen bg-background">
            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                Create New Position
                            </h1>
                            <p className="text-sm text-muted-foreground">Configure assessment criteria and hiring rules</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline">
                            Save Draft
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Publish Job
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-6 py-8 max-w-6xl relative z-10">
                {/* Progress Indicator */}
                <motion.div
                    className="mb-8 flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {["Job Details", "Skills", "AI Config", "Assessment"].map((step, i) => (
                        <div key={step} className="flex items-center">
                            <button
                                onClick={() => setActiveSection(i)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeSection === i
                                        ? "bg-primary text-primary-foreground shadow-lg"
                                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                            >
                                {step}
                            </button>
                            {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                        </div>
                    ))}
                </motion.div>

                <div className="space-y-8">
                    {/* Section 1: Job Details */}
                    <motion.div {...fadeInUp}>
                        <Card className="p-8 bg-card border-border backdrop-blur-sm shadow-lg">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                                    <Building2 className="h-6 w-6 text-primary-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Job Details</h2>
                                    <p className="text-sm text-muted-foreground">Basic information about the position</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Job Title <span className="text-destructive">*</span></Label>
                                    <Input
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Senior Software Engineer"
                                        className="bg-muted border-border h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        value={formData.company_name}
                                        onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                        placeholder="e.g. TechCorp Inc."
                                        className="bg-muted border-border h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" /> Work Mode
                                    </Label>
                                    <Select value={formData.work_mode} onValueChange={v => setFormData({ ...formData, work_mode: v })}>
                                        <SelectTrigger className="bg-muted border-border h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="remote">Remote</SelectItem>
                                            <SelectItem value="onsite">Onsite</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground" /> Employment Type
                                    </Label>
                                    <Select value={formData.employment_type} onValueChange={v => setFormData({ ...formData, employment_type: v })}>
                                        <SelectTrigger className="bg-muted border-border h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="full-time">Full-time</SelectItem>
                                            <SelectItem value="contract">Contract</SelectItem>
                                            <SelectItem value="internship">Internship</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Seniority Level</Label>
                                    <Select value={formData.seniority_level} onValueChange={v => setFormData({ ...formData, seniority_level: v })}>
                                        <SelectTrigger className="bg-muted border-border h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="intern">Intern</SelectItem>
                                            <SelectItem value="junior">Junior</SelectItem>
                                            <SelectItem value="mid">Mid-Level</SelectItem>
                                            <SelectItem value="senior">Senior</SelectItem>
                                            <SelectItem value="lead">Lead</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="director">Director</SelectItem>
                                            <SelectItem value="executive">Executive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Role Focus</Label>
                                    <Select value={formData.role_focus} onValueChange={v => setFormData({ ...formData, role_focus: v })}>
                                        <SelectTrigger className="bg-muted border-border h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Frontend">Frontend</SelectItem>
                                            <SelectItem value="Backend">Backend</SelectItem>
                                            <SelectItem value="Full Stack">Full Stack</SelectItem>
                                            <SelectItem value="DevOps">DevOps</SelectItem>
                                            <SelectItem value="Data Science">Data Science</SelectItem>
                                            <SelectItem value="Mobile">Mobile</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" /> Experience Range
                                    </Label>
                                    <Input
                                        value={formData.experience_range}
                                        onChange={e => setFormData({ ...formData, experience_range: e.target.value })}
                                        placeholder="e.g. 3-5 Years"
                                        className="bg-muted border-border h-12"
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label>Job Description <span className="text-destructive">*</span></Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-muted border-border min-h-[140px] resize-none"
                                        placeholder="Describe the role responsibilities, expectations, and what makes this opportunity exciting..."
                                    />
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Section 2: Skills */}
                    <motion.div {...fadeInUp} transition={{ delay: 0.1 }}>
                        <Card className="p-8 bg-card border-border backdrop-blur-sm shadow-lg">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                                    <Code2 className="h-6 w-6 text-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Skills & Requirements</h2>
                                    <p className="text-sm text-muted-foreground">Define the technical skills needed for this role</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label className="text-foreground text-base font-medium">Required Skills</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.newRequiredSkill}
                                            onChange={e => setFormData({ ...formData, newRequiredSkill: e.target.value })}
                                            placeholder="e.g. React, TypeScript"
                                            onKeyDown={e => e.key === 'Enter' && addSkill('required')}
                                            className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11"
                                        />
                                        <Button
                                            onClick={() => addSkill('required')}
                                            className="bg-primary hover:bg-primary/90 h-11 px-4"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[80px] p-4 rounded-xl bg-muted/30 border border-border/50">
                                        <AnimatePresence>
                                            {formData.required_skills.map((s, i) => (
                                                <motion.span
                                                    key={s}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                    className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                                                >
                                                    {s}
                                                    <X className="h-3.5 w-3.5 cursor-pointer hover:text-foreground transition-colors" onClick={() => removeSkill('required', i)} />
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                        {formData.required_skills.length === 0 && (
                                            <span className="text-muted-foreground text-sm">Add skills by typing and pressing Enter</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-foreground text-base font-medium">Nice-to-Have Skills</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.newNiceSkill}
                                            onChange={e => setFormData({ ...formData, newNiceSkill: e.target.value })}
                                            placeholder="e.g. Docker, AWS"
                                            onKeyDown={e => e.key === 'Enter' && addSkill('nice')}
                                            className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => addSkill('nice')}
                                            className="border-border text-foreground hover:bg-muted h-11 px-4"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[80px] p-4 rounded-xl bg-muted/30 border border-border/50">
                                        <AnimatePresence>
                                            {formData.nice_to_have_skills.map((s, i) => (
                                                <motion.span
                                                    key={s}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                    className="bg-muted/50 text-foreground border border-border/50 px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                                                >
                                                    {s}
                                                    <X className="h-3.5 w-3.5 cursor-pointer hover:text-foreground transition-colors" onClick={() => removeSkill('nice', i)} />
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                        {formData.nice_to_have_skills.length === 0 && (
                                            <span className="text-muted-foreground text-sm">Optional skills that would be a plus</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Section 3: AI Config */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
                            <Card className="p-8 bg-card/50 border-border/50 backdrop-blur-sm shadow-2xl h-full">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="h-12 w-12 rounded-2xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center shadow-lg">
                                        <Target className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">Competency Weights</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Total: <span className={totalWeight === 100 ? "text-[#2E2E2E] dark:text-white font-bold" : "text-[#2E2E2E]/60 dark:text-white/60"}>{totalWeight}%</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { k: 'problem_solving', l: 'Problem Solving', color: 'emerald' },
                                        { k: 'coding', l: 'Coding Skills', color: 'blue' },
                                        { k: 'system_design', l: 'System Design', color: 'violet' },
                                        { k: 'communication', l: 'Communication', color: 'amber' }
                                    ].map((w) => (
                                        <div key={w.k} className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-foreground">
                                                    {w.l}
                                                </Label>
                                                <span className={`font-bold text-${w.color}-400 bg-${w.color}-500/10 px-2 py-0.5 rounded-md text-sm`}>
                                                    {(formData.weights as any)[w.k]}%
                                                </span>
                                            </div>
                                            <Slider
                                                value={[(formData.weights as any)[w.k]]}
                                                onValueChange={([val]) => setFormData(p => ({ ...p, weights: { ...p.weights, [w.k]: val } }))}
                                                max={100}
                                                step={5}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div {...fadeInUp} transition={{ delay: 0.3 }}>
                            <Card className="p-8 bg-card/50 border-border/50 backdrop-blur-sm shadow-2xl h-full">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="h-12 w-12 rounded-2xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center shadow-lg shadow-[#2E2E2E]/20 dark:shadow-white/20">
                                        <Shield className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">Assessment Config</h2>
                                        <p className="text-sm text-muted-foreground">Proctoring and difficulty settings</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-foreground">Min. Technical Score</Label>
                                            <span className="font-bold text-[#2E2E2E] dark:text-white bg-[#2E2E2E]/10 dark:bg-white/10 px-2 py-0.5 rounded-md text-sm">
                                                {formData.cutoffs.technical}%
                                            </span>
                                        </div>
                                        <Slider
                                            value={[formData.cutoffs.technical]}
                                            onValueChange={([val]) => setFormData(p => ({ ...p, cutoffs: { ...p.cutoffs, technical: val } }))}
                                            max={100}
                                            step={5}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Difficulty</Label>
                                            <Select value={formData.assessment.difficulty} onValueChange={v => setFormData(p => ({ ...p, assessment: { ...p.assessment, difficulty: v } }))}>
                                                <SelectTrigger className="bg-muted border-border text-foreground h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-muted border-border">
                                                    <SelectItem value="Easy" className="text-foreground hover:bg-muted">Easy</SelectItem>
                                                    <SelectItem value="Medium" className="text-foreground hover:bg-muted">Medium</SelectItem>
                                                    <SelectItem value="Hard" className="text-foreground hover:bg-muted">Hard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Duration</Label>
                                            <Input
                                                type="number"
                                                value={formData.assessment.duration_m}
                                                onChange={e => setFormData(p => ({ ...p, assessment: { ...p.assessment, duration_m: parseInt(e.target.value) } }))}
                                                className="bg-muted border-border text-foreground h-11"
                                            />
                                        </div>
                                    </div>

                                    {/* Webcam Toggle - Enhanced */}
                                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${formData.assessment.webcam ? 'bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]' : 'bg-muted/50 text-muted-foreground'}`}>
                                                <Video className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <Label className="text-foreground font-medium">Webcam Proctoring</Label>
                                                <p className="text-xs text-muted-foreground mt-0.5">AI-powered monitoring during assessment</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.assessment.webcam}
                                            onCheckedChange={c => setFormData(p => ({ ...p, assessment: { ...p.assessment, webcam: c } }))}
                                            className="data-[state=checked]:bg-[#2E2E2E] dark:data-[state=checked]:bg-white"
                                        />
                                    </div>

                                    {/* Auto Hire Toggle */}
                                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${formData.assessment.auto_hire ? 'bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E]' : 'bg-muted/50 text-muted-foreground'}`}>
                                                {formData.assessment.auto_hire ? <UserCheck className="h-5 w-5" /> : <UserCog className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <Label className="text-foreground font-medium">
                                                    {formData.assessment.auto_hire ? 'Auto Hire' : 'Manual Hire'}
                                                </Label>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formData.assessment.auto_hire 
                                                        ? 'Automatically hire/reject based on scores meeting requirements' 
                                                        : 'Manually review and decide on each candidate'}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.assessment.auto_hire}
                                            onCheckedChange={c => setFormData(p => ({ ...p, assessment: { ...p.assessment, auto_hire: c } }))}
                                            className="data-[state=checked]:bg-[#2E2E2E] dark:data-[state=checked]:bg-white"
                                        />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <motion.div
                    className="mt-12 p-6 bg-[#2E2E2E]/10 dark:bg-white/10 rounded-2xl border border-[#2E2E2E]/20 dark:border-white/20 flex items-center justify-between"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#2E2E2E] dark:bg-white flex items-center justify-center">
                            <Zap className="h-6 w-6 text-white dark:text-[#2E2E2E]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Ready to find your next hire?</h3>
                            <p className="text-sm text-muted-foreground">AI-powered assessments will automatically evaluate candidates.</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        size="lg"
                        className="bg-[#2E2E2E] dark:bg-white hover:bg-[#2E2E2E]/90 dark:hover:bg-white/90 text-white dark:text-[#2E2E2E] px-8 shadow-lg shadow-[#2E2E2E]/20 dark:shadow-white/20"
                    >
                        <Sparkles className="h-5 w-5 mr-2" />
                        Publish Job
                    </Button>
                </motion.div>
            </main>
        </div>
    );
}
