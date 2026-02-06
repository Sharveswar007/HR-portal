import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: candidateId } = await params;

    if (!candidateId) {
        return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    try {
        // Get profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", candidateId)
            .single();

        if (profileError) {
            console.error("Profile error:", profileError);
        }

        // Get applications with job details
        const { data: applications, error: appsError } = await supabase
            .from("applications")
            .select("*")
            .eq("candidate_id", candidateId)
            .order("created_at", { ascending: false });

        if (appsError) {
            console.error("Applications error:", appsError);
        }

        // Fetch job details for each application
        const appsWithJobs = await Promise.all(
            (applications || []).map(async (app: any) => {
                if (app.job_id) {
                    const { data: jobData } = await supabase
                        .from("job_descriptions")
                        .select("title, company")
                        .eq("id", app.job_id)
                        .single();
                    return { ...app, job_descriptions: jobData };
                }
                return app;
            })
        );

        // Get latest assessment session
        const { data: session, error: sessionError } = await supabase
            .from("assessment_sessions")
            .select("*")
            .eq("candidate_id", candidateId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (sessionError) {
            console.error("Session error:", sessionError);
        }

        // Get proctoring events (if session exists) - include screenshot_url
        let proctoringEvents: any[] = [];
        let proctoringScreenshots: any[] = [];
        let proctoringSummary: any = null;
        let proctoringRecordings: any[] = [];
        if (session) {
            const { data: events } = await supabase
                .from("proctor_events")
                .select("*")
                .eq("attempt_id", session.id)
                .order("client_timestamp", { ascending: false });
            proctoringEvents = events || [];

            // Get events with screenshots
            proctoringScreenshots = (events || []).filter(
                (e: any) => e.screenshot_url != null
            );

            // Try to get recordings from storage
            try {
                const recordingsPath = `${candidateId}/${session.id}`;
                const { data: recordings } = await supabase.storage
                    .from("proctoring-recordings")
                    .list(recordingsPath, { limit: 100 });
                
                if (recordings && recordings.length > 0) {
                    proctoringRecordings = await Promise.all(
                        recordings.map(async (file) => {
                            const { data } = await supabase.storage
                                .from("proctoring-recordings")
                                .createSignedUrl(`${recordingsPath}/${file.name}`, 60 * 60 * 24);
                            
                            // Determine type from filename (webcam_ or screen_)
                            const isScreen = file.name.toLowerCase().includes('screen');
                            const isWebcam = file.name.toLowerCase().includes('webcam');
                            
                            return {
                                name: file.name,
                                url: data?.signedUrl || "",
                                created_at: file.created_at,
                                type: isScreen ? 'screen' : isWebcam ? 'webcam' : 'unknown',
                            };
                        })
                    );
                }
            } catch (storageError) {
                console.error("Error fetching recordings:", storageError);
            }

            // Try to get integrity score summary
            const { data: integrity } = await supabase
                .from("integrity_scores")
                .select("*")
                .eq("attempt_id", session.id)
                .maybeSingle();
            proctoringSummary = integrity;
        }

        // Get resume file URLs from applications
        const resumeFiles = (applications || [])
            .filter((app: any) => app.resume_file_url)
            .map((app: any) => ({
                applicationId: app.id,
                jobId: app.job_id,
                resumeUrl: app.resume_file_url,
                createdAt: app.created_at,
            }));

        // Get coding submissions
        let codingSubmissions: any[] = [];
        if (session) {
            const { data: coding } = await supabase
                .from("coding_submissions")
                .select("*, challenges:challenge_id(title, difficulty)")
                .eq("session_id", session.id);
            codingSubmissions = coding || [];
        }

        // Get text responses
        let textResponses: any[] = [];
        if (session) {
            const { data: text } = await supabase
                .from("text_responses")
                .select("*, text_questions:question_id(question_text, category)")
                .eq("session_id", session.id);
            textResponses = text || [];
        }

        // Get psychometric profile
        let psychometric = null;
        if (session) {
            const { data: psych } = await supabase
                .from("psychometric_profiles")
                .select("*")
                .eq("session_id", session.id)
                .maybeSingle();
            psychometric = psych;
        }

        // Get detailed resume analyses
        const { data: resumeAnalyses } = await supabase
            .from("resume_analyses")
            .select("*")
            .eq("candidate_id", candidateId)
            .order("created_at", { ascending: false });

        return NextResponse.json({
            profile,
            applications: appsWithJobs,
            session,
            proctoringEvents,
            proctoringScreenshots,
            proctoringRecordings,
            proctoringSummary,
            resumeFiles,
            codingSubmissions,
            textResponses,
            psychometric,
            resumeAnalyses: resumeAnalyses || [],
        });
    } catch (error) {
        console.error("Error fetching candidate data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
