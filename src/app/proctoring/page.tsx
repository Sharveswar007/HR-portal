"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
    Shield,
    AlertTriangle,
    ChevronLeft,
    Loader2,
    Monitor,
    User,
    Wifi,
    WifiOff,
    Clock,
    XCircle,
    CheckCircle2,
    Eye,
    Video,
    Camera,
    Play,
    Image as ImageIcon,
    Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Types matching DB
interface ProctorSession {
    id: string;
    attempt_id: string; // Foreign key used for events
    candidate_id: string;
    status: 'active' | 'completed' | 'terminated';
    webcam_enabled: boolean;
    last_heartbeat: string;
    integrity_score?: number; // Fetched from joined table or separate query
    candidate?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

interface ProctorEvent {
    id: string;
    attempt_id: string;
    event_type: string;
    event_category: string;
    severity: string;
    description: string;
    created_at: string;
    client_timestamp: string;
    screenshot_url?: string;
}

interface MediaItem {
    name: string;
    url: string;
    created_at: string;
    event_type?: string;
}

interface SessionMedia {
    recordings: MediaItem[];
    screenshots: MediaItem[];
    events: ProctorEvent[];
}

export default function ProctoringPage() {
    const [loading, setLoading] = useState(true);
    const [activeSessions, setActiveSessions] = useState<ProctorSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [liveEvents, setLiveEvents] = useState<ProctorEvent[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [sessionMedia, setSessionMedia] = useState<SessionMedia | null>(null);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
    const supabase = createClient();
    const eventSubscriptionRef = useRef<any>(null);

    // Initial Load
    useEffect(() => {
        fetchActiveSessions();
        fetchAuditLogs();

        // Subscribe to NEW active sessions
        const sessionSub = supabase
            .channel('proctor-sessions-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'proctor_sessions' }, () => {
                fetchActiveSessions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sessionSub);
        };
    }, []);

    // Load active sessions
    const fetchActiveSessions = async () => {
        const { data, error } = await supabase
            .from('proctor_sessions')
            .select(`
                *,
                candidate:candidate_id(full_name, email, avatar_url)
            `)
            .eq('status', 'active')
            .order('last_heartbeat', { ascending: false });

        if (!error && data) {
            // Check for stale sessions (no heartbeat > 2 min) and mark them visually? 
            // For now just set state.
            setActiveSessions(data as any[]);
            if (!selectedSessionId && data.length > 0) {
                setSelectedSessionId(data[0].attempt_id);
            }
        }
        setLoading(false);
    };

    // Load audit logs (historical)
    const fetchAuditLogs = async () => {
        const { data } = await supabase
            .from('proctor_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setAuditLogs(data);
    };

    // Listen to events for SELECTED session (or global alerts)
    useEffect(() => {
        // Clean up previous subscription
        if (eventSubscriptionRef.current) {
            supabase.removeChannel(eventSubscriptionRef.current);
        }

        // Global Alert Listener (for critical events across ALL sessions)
        const globalSub = supabase
            .channel('global-alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proctor_events' }, (payload) => {
                const newEvent = payload.new as ProctorEvent;

                // Toast Critical Alerts
                if (newEvent.severity === 'critical') {
                    toast.error(`CRITICAL VIOLATION: ${newEvent.event_type}`, {
                        description: `Session: ${newEvent.attempt_id.slice(0, 8)}...`,
                    });
                }

                // If this event belongs to current view, add to live list
                if (selectedSessionId && newEvent.attempt_id === selectedSessionId) {
                    setLiveEvents(prev => [newEvent, ...prev]);
                }
            })
            .subscribe();

        eventSubscriptionRef.current = globalSub;

        return () => {
            supabase.removeChannel(globalSub);
        };
    }, [selectedSessionId]);

    // Load logs for selected session
    useEffect(() => {
        if (!selectedSessionId) return;

        const loadSessionData = async () => {
            // Load events
            const { data: eventsData } = await supabase
                .from('proctor_events')
                .select('*')
                .eq('attempt_id', selectedSessionId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (eventsData) setLiveEvents(eventsData);

            // Load media (recordings and screenshots)
            setLoadingMedia(true);
            try {
                // Get candidate ID from session
                const session = activeSessions.find(s => s.attempt_id === selectedSessionId);
                if (!session) {
                    setLoadingMedia(false);
                    return;
                }

                // List recordings from storage
                const recordingsPath = `${session.candidate_id}/${selectedSessionId}`;
                
                const { data: recordings } = await supabase.storage
                    .from("proctoring-recordings")
                    .list(recordingsPath, {
                        limit: 100,
                        sortBy: { column: "created_at", order: "asc" },
                    });

                const { data: screenshots } = await supabase.storage
                    .from("proctoring-screenshots")
                    .list(recordingsPath, {
                        limit: 100,
                        sortBy: { column: "created_at", order: "asc" },
                    });

                // Generate signed URLs
                const recordingUrls = await Promise.all(
                    (recordings || []).map(async (file) => {
                        const { data } = await supabase.storage
                            .from("proctoring-recordings")
                            .createSignedUrl(`${recordingsPath}/${file.name}`, 60 * 60 * 24);
                        return {
                            name: file.name,
                            url: data?.signedUrl || "",
                            created_at: file.created_at || "",
                        };
                    })
                );

                const screenshotUrls = await Promise.all(
                    (screenshots || []).map(async (file) => {
                        const { data } = await supabase.storage
                            .from("proctoring-screenshots")
                            .createSignedUrl(`${recordingsPath}/${file.name}`, 60 * 60 * 24);
                        return {
                            name: file.name,
                            url: data?.signedUrl || "",
                            created_at: file.created_at || "",
                            event_type: file.name.includes("_") ? file.name.split("_")[1] : undefined,
                        };
                    })
                );

                // Also get events with screenshots
                const { data: eventsWithScreenshots } = await supabase
                    .from("proctor_events")
                    .select("id, attempt_id, event_type, event_category, severity, description, created_at, client_timestamp, screenshot_url")
                    .eq("attempt_id", selectedSessionId)
                    .not("screenshot_url", "is", null)
                    .order("client_timestamp", { ascending: false });

                setSessionMedia({
                    recordings: recordingUrls.filter(r => r.url),
                    screenshots: screenshotUrls.filter(s => s.url),
                    events: eventsWithScreenshots || [],
                });
            } catch (error) {
                console.error("Error loading media:", error);
            }
            setLoadingMedia(false);
        };

        loadSessionData();
    }, [selectedSessionId]);


    const isOnline = (isoDate: string) => {
        const diff = Date.now() - new Date(isoDate).getTime();
        return diff < 60000; // 1 minute
    };

    const selectedSession = activeSessions.find(s => s.attempt_id === selectedSessionId);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Shield className="h-6 w-6 text-[#2E2E2E] dark:text-white" />
                        <div>
                            <h1 className="text-lg font-bold">Proctoring Control Center</h1>
                            <p className="text-xs text-muted-foreground">Time: {new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="border-[#2E2E2E]/50 dark:border-white/50 text-[#2E2E2E] dark:text-white bg-[#2E2E2E]/10 dark:bg-white/10">
                            <Wifi className="h-3 w-3 mr-1" /> System Online
                        </Badge>
                        <Badge variant="outline" className="border-[#2E2E2E]/30 dark:border-white/30 text-[#2E2E2E]/80 dark:text-white/80 bg-[#2E2E2E]/5 dark:bg-white/5">
                            {activeSessions.length} Active Sessions
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex">
                {/* Sidebar: Active Candidates */}
                <aside className="w-80 border-r border-border bg-card/30 flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Monitoring</h2>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {activeSessions.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Monitor className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No active sessions</p>
                                </div>
                            ) : (
                                activeSessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => setSelectedSessionId(session.attempt_id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${session.attempt_id === selectedSessionId
                                                ? "bg-accent border-border ring-1 ring-border"
                                                : "border-transparent hover:bg-accent/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                    {session.candidate?.avatar_url ? (
                                                        <img src={session.candidate.avatar_url} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${isOnline(session.last_heartbeat) ? "bg-[#2E2E2E] dark:bg-white" : "bg-[#2E2E2E]/50 dark:bg-white/50"
                                                    }`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm truncate">{session.candidate?.full_name || "Unknown Candidate"}</p>
                                                <p className="text-xs text-muted-foreground truncate">{session.candidate?.email}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main View */}
                {selectedSession ? (
                    <div className="flex-1 flex flex-col bg-background">
                        {/* Monitor Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedSession.candidate?.full_name}</h2>
                                <p className="text-muted-foreground text-sm font-mono">{selectedSession.candidate?.email}</p>
                            </div>
                            <div className="flex gap-4">
                                <Card className="bg-card border-border p-3 flex gap-3 items-center">
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Status</p>
                                        <p className={`font-bold ${isOnline(selectedSession.last_heartbeat) ? 'text-[#2E2E2E] dark:text-white' : 'text-[#2E2E2E]/50 dark:text-white/50'}`}>
                                            {isOnline(selectedSession.last_heartbeat) ? 'LIVE' : 'UNSTABLE'}
                                        </p>
                                    </div>
                                    <div className={`h-2 w-2 rounded-full ${isOnline(selectedSession.last_heartbeat) ? 'bg-[#2E2E2E] dark:bg-white animate-pulse' : 'bg-[#2E2E2E]/40 dark:bg-white/40'}`} />
                                </Card>
                            </div>
                        </div>

                        {/* Monitor Content */}
                        <div className="flex-1 grid grid-cols-3 gap-6 p-6 overflow-hidden">
                            {/* Recording & Screenshots Section */}
                            <div className="col-span-2 flex flex-col gap-6">
                                {/* Recording Player */}
                                <Card className="bg-black border-border relative overflow-hidden">
                                    {loadingMedia ? (
                                        <div className="aspect-video flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : sessionMedia && sessionMedia.recordings.length > 0 ? (
                                        <div className="aspect-video">
                                            <video
                                                controls
                                                className="w-full h-full"
                                                src={sessionMedia.recordings[sessionMedia.recordings.length - 1]?.url}
                                            >
                                                Your browser does not support video playback.
                                            </video>
                                            <div className="absolute top-4 left-4 bg-[#2E2E2E] dark:bg-white px-2 py-1 flex items-center gap-2 rounded text-xs font-bold text-white dark:text-[#2E2E2E]">
                                                <Video className="h-3 w-3" /> RECORDING
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Video className="h-12 w-12 opacity-50" />
                                            <p>No recording available yet</p>
                                            <p className="text-xs opacity-50">Recording will appear once uploaded</p>
                                        </div>
                                    )}
                                </Card>

                                {/* Screenshots Grid */}
                                <Card className="flex-1 bg-card/50 border-border p-4 overflow-hidden">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-muted-foreground" /> 
                                        Violation Screenshots 
                                        {sessionMedia && (
                                            <Badge variant="outline" className="ml-2">
                                                {sessionMedia.screenshots.length}
                                            </Badge>
                                        )}
                                    </h3>
                                    {loadingMedia ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : sessionMedia && sessionMedia.screenshots.length > 0 ? (
                                        <ScrollArea className="h-48">
                                            <div className="grid grid-cols-4 gap-2">
                                                {sessionMedia.screenshots.map((screenshot, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedScreenshot(screenshot.url)}
                                                        className="relative aspect-video rounded-lg overflow-hidden border border-border hover:border-foreground transition-colors group"
                                                    >
                                                        <img 
                                                            src={screenshot.url} 
                                                            alt={`Violation ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {screenshot.event_type && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                                                                <p className="text-[10px] text-white truncate">
                                                                    {screenshot.event_type.replace(/_/g, " ")}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Eye className="h-5 w-5 text-white" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                            <ImageIcon className="h-8 w-8 opacity-50 mb-2" />
                                            <p className="text-sm">No violation screenshots captured</p>
                                        </div>
                                    )}
                                </Card>

                                {/* Recording Chunks List */}
                                {sessionMedia && sessionMedia.recordings.length > 1 && (
                                    <Card className="bg-card/50 border-border p-4">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" /> 
                                            Recording Segments
                                            <Badge variant="outline" className="ml-2">
                                                {sessionMedia.recordings.length}
                                            </Badge>
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {sessionMedia.recordings.map((recording, idx) => (
                                                <a
                                                    key={idx}
                                                    href={recording.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-accent transition-colors text-sm"
                                                >
                                                    <Play className="h-3 w-3" />
                                                    Segment {idx + 1}
                                                    <Download className="h-3 w-3 opacity-50" />
                                                </a>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* Live Logs */}
                            <Card className="bg-card/50 border-border flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-border bg-card">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-[#2E2E2E] dark:text-white" /> Live Violations
                                    </h3>
                                </div>
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-3">
                                        <AnimatePresence initial={false}>
                                            {liveEvents.map((event) => (
                                                <motion.div
                                                    key={event.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={`p-3 rounded-lg border text-sm ${event.severity === 'critical' ? 'bg-[#2E2E2E] dark:bg-white text-white dark:text-[#2E2E2E] border-[#2E2E2E] dark:border-white' :
                                                            event.severity === 'high' ? 'bg-[#2E2E2E]/70 dark:bg-white/70 text-white dark:text-[#2E2E2E] border-[#2E2E2E]/70 dark:border-white/70' :
                                                                'bg-accent/50 border-border text-foreground'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-xs uppercase tracking-wider">{event.event_type.replace(/_/g, " ")}</span>
                                                        <span className="text-xs opacity-50">{new Date(event.created_at).toLocaleTimeString()}</span>
                                                    </div>
                                                    {event.description && <p className="opacity-80 text-xs">{event.description}</p>}
                                                    {event.screenshot_url && (
                                                        <button
                                                            onClick={() => setSelectedScreenshot(event.screenshot_url!)}
                                                            className="mt-2 w-full aspect-video rounded overflow-hidden border border-border/50 hover:border-foreground transition-colors"
                                                        >
                                                            <img 
                                                                src={event.screenshot_url} 
                                                                alt="Violation screenshot"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    )}
                                                </motion.div>
                                            ))}
                                            {liveEvents.length === 0 && (
                                                <p className="text-center text-muted-foreground py-8 text-sm">No events detected yet.</p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                        <Shield className="h-16 w-16 opacity-20" />
                        <p>Select an active session to begin monitoring</p>
                    </div>
                )}
            </main>

            {/* Screenshot Modal */}
            <AnimatePresence>
                {selectedScreenshot && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
                        onClick={() => setSelectedScreenshot(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="relative max-w-4xl max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img 
                                src={selectedScreenshot} 
                                alt="Violation Screenshot"
                                className="max-w-full max-h-[80vh] rounded-lg border border-border"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                                onClick={() => setSelectedScreenshot(null)}
                            >
                                <XCircle className="h-5 w-5" />
                            </Button>
                            <a
                                href={selectedScreenshot}
                                download
                                className="absolute bottom-2 right-2 flex items-center gap-2 px-3 py-2 rounded bg-black/50 hover:bg-black/70 text-white text-sm"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </a>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
