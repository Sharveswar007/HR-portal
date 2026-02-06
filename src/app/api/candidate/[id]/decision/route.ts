import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: candidateId } = await params;

    if (!candidateId) {
        return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { decision, notes, applicationId } = body;

        if (!decision || !["hired", "rejected", "consider"].includes(decision)) {
            return NextResponse.json(
                { error: "Valid decision required: hired, rejected, or consider" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Map decision to database values
        const finalDecision = decision === "hired" ? "hire" : decision === "rejected" ? "no_hire" : "pending";
        const status = decision === "hired" ? "hired" : decision === "rejected" ? "rejected" : "shortlisted";

        // Update the application decision using correct column names
        if (applicationId) {
            const { error: appError } = await supabase
                .from("applications")
                .update({
                    final_decision: finalDecision,
                    decision_rationale: notes || null,
                    status: status,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", applicationId)
                .eq("candidate_id", candidateId);

            if (appError) {
                console.error("Application update error:", appError);
                // Don't fail - application might not exist, continue with session update
            }
        } else {
            // Try to update the most recent application (ignore errors if no application exists)
            const { error: appError } = await supabase
                .from("applications")
                .update({
                    final_decision: finalDecision,
                    decision_rationale: notes || null,
                    status: status,
                    updated_at: new Date().toISOString(),
                })
                .eq("candidate_id", candidateId);

            if (appError) {
                console.error("Application update error (non-fatal):", appError);
                // Continue - candidate might not have an application record
            }
        }

        // Update the assessment session recommendation if exists
        const { error: sessionError } = await supabase
            .from("assessment_sessions")
            .update({
                recommendation: decision === "hired" ? "hire" : decision === "rejected" ? "reject" : "consider",
            })
            .eq("candidate_id", candidateId);

        if (sessionError) {
            console.error("Session update error:", sessionError);
            // Continue even if session update fails
        }

        return NextResponse.json({
            success: true,
            message: `Candidate ${decision === "hired" ? "hired" : decision === "rejected" ? "rejected" : "marked for consideration"} successfully`,
            decision,
        });
    } catch (error: any) {
        console.error("Decision API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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
        // Get the latest application decision using correct column names
        const { data: application, error: appError } = await supabase
            .from("applications")
            .select("final_decision, decision_rationale, status, updated_at")
            .eq("candidate_id", candidateId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (appError) {
            console.error("Application fetch error:", appError);
            return NextResponse.json({ error: appError.message }, { status: 500 });
        }

        // Map database values back to UI values
        let decision = null;
        if (application?.final_decision === "hire") decision = "hired";
        else if (application?.final_decision === "no_hire") decision = "rejected";
        else if (application?.final_decision === "pending") decision = "consider";

        return NextResponse.json({
            decision: decision,
            notes: application?.decision_rationale || null,
            decidedAt: application?.updated_at || null,
            stage: application?.status || null,
        });
    } catch (error: any) {
        console.error("Decision GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
