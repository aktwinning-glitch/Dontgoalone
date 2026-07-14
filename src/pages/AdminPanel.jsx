import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Image, FileText, Library, BookOpen, SlidersHorizontal, Menu, Sparkles, ShieldCheck, Play, X, Camera, GitBranch, Wrench } from "lucide-react";
import AIAdminAssistant from "@/components/admin/AIAdminAssistant";
import DialogueEditor from "@/components/admin/DialogueEditor";
import ValidationPanel from "@/components/admin/ValidationPanel";
import RuntimeSimulator from "@/components/admin/RuntimeSimulator";
import GameSettings from "@/components/admin/GameSettings";
import CharacterManager from "@/components/admin/CharacterManager";
import SceneManager from "@/components/admin/SceneManager";
import EventEditor from "@/components/admin/EventEditor";
import AssetLibrary from "@/components/admin/AssetLibrary";
import StoryManager from "@/components/admin/StoryManager";
import SeedEventsPanel from "@/components/admin/SeedEventsPanel";
import BulkImport from "@/components/admin/BulkImport";
import LoadRentalButton from "@/components/admin/LoadRentalButton";
import RentalDebugPanel from "@/components/admin/RentalDebugPanel";
import SnapshotManager from "@/components/admin/SnapshotManager";
import EventGraphVisualizer from "@/components/admin/EventGraphVisualizer";
import StoryTools from "@/components/admin/StoryTools";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState(null);
  const [activeTab, setActiveTab] = useState("stories");
  const qc = useQueryClient();

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
    enabled: authorized,
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.role === "admin") {
        setAuthorized(true);
      } else {
        navigate("/home");
      }
    }).catch(() => navigate("/home"));
  }, [navigate]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold">Admin Panel</h1>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse" style={{ background: "hsl(351 78% 60% / 0.2)", color: "hsl(351 78% 70%)", border: "1px solid hsl(351 78% 60% / 0.4)" }}>ADMIN MODE ACTIVE</span>
            </div>
            <p className="text-xs text-muted-foreground">Game Studio Control Panel</p>
          </div>
        </div>

        {/* Story context selector */}
        {stories.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Active Story:</span>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setActiveStoryId(null)} className="text-[9px] px-2 py-1 rounded-full" style={{ background: !activeStoryId ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 22%)", color: !activeStoryId ? "hsl(271 87% 75%)" : "hsl(252 8% 55%)", border: `1px solid ${!activeStoryId ? "hsl(271 87% 65% / 0.4)" : "hsl(252 10% 26%)"}` }}>ALL</button>
              {stories.map(s => (
                <button key={s.story_id} onClick={() => setActiveStoryId(s.story_id)} className="text-[9px] px-2 py-1 rounded-full" style={{ background: activeStoryId === s.story_id ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 22%)", color: activeStoryId === s.story_id ? "hsl(271 87% 75%)" : "hsl(252 8% 55%)", border: `1px solid ${activeStoryId === s.story_id ? "hsl(271 87% 65% / 0.4)" : "hsl(252 10% 26%)"}` }}>
                  {s.story_id}
                </button>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile: hamburger + bottom sheet */}
          <div className="md:hidden">
            <Button variant="outline" size="icon" onClick={() => setOpenDrawer(true)}><Menu className="w-4 h-4" /></Button>
            {openDrawer && (
              <>
                <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setOpenDrawer(false)} />
                <div className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl" style={{ background: "hsl(252 13% 13%)", border: "1px solid hsl(252 10% 22%)", maxHeight: "80svh", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
                  <div className="shrink-0 px-4 pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground">Select Section</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpenDrawer(false)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="overflow-y-auto px-4 pb-4 space-y-2" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
                    {[
                      {v:"characters",l:"Characters",i:Users},{v:"scenes",l:"Scenes",i:Image},
                      {v:"events",l:"Events",i:FileText},{v:"dialogue",l:"Dialogue",i:FileText},
                      {v:"assets",l:"Assets",i:Library},{v:"stories",l:"Stories",i:BookOpen},
                      {v:"settings",l:"Settings",i:SlidersHorizontal},{v:"ai",l:"AI Assistant",i:Sparkles},
                      {v:"validate",l:"Validate",i:ShieldCheck},{v:"runtime",l:"Runtime",i:Play},
                      {v:"graph",l:"Graph",i:GitBranch},{v:"snapshots",l:"Snapshots",i:Camera},
                      {v:"tools",l:"Story Tools",i:Wrench},
                    ].map(t => (
                      <button key={t.v} onClick={() => { setActiveTab(t.v); setOpenDrawer(false); }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                        style={{ background: activeTab === t.v ? "hsl(271 87% 65% / 0.2)" : "hsl(252 12% 18%)", border: `1px solid ${activeTab === t.v ? "hsl(271 87% 65% / 0.4)" : "hsl(252 10% 24%)"}`, color: activeTab === t.v ? "hsl(271 87% 78%)" : "hsl(40 30% 80%)" }}>
                        <t.i className="w-4 h-4 inline mr-2" />{t.l}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop: scrollable horizontal tab bar — no grid, no overflow issues */}
          <div className="hidden md:block">
            <TabsList className="flex w-full overflow-x-auto gap-0 h-auto p-1 justify-start">
              {[
                {v:"characters",l:"Chars",i:Users,c:null},{v:"scenes",l:"Scenes",i:Image,c:null},
                {v:"events",l:"Events",i:FileText,c:null},{v:"dialogue",l:"Dialogue",i:FileText,c:null},
                {v:"assets",l:"Assets",i:Library,c:null},{v:"stories",l:"Stories",i:BookOpen,c:null},
                {v:"settings",l:"Settings",i:SlidersHorizontal,c:null},{v:"ai",l:"AI",i:Sparkles,c:"hsl(271 87% 70%)"},
                {v:"validate",l:"Validate",i:ShieldCheck,c:null},{v:"runtime",l:"Runtime",i:Play,c:null},
                {v:"graph",l:"Graph",i:GitBranch,c:"hsl(216 70% 68%)"},{v:"snapshots",l:"Snaps",i:Camera,c:"hsl(186 72% 60%)"},
                {v:"tools",l:"Tools",i:Wrench,c:"hsl(40 90% 65%)"},
              ].map(t => (
                <TabsTrigger key={t.v} value={t.v} className="gap-1 text-[10px] shrink-0 px-2.5 py-1.5" style={t.c ? { color: t.c } : {}}>
                  <t.i className="w-3 h-3" />{t.l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="characters">
            <CharacterManager />
          </TabsContent>
          <TabsContent value="scenes">
            <SceneManager />
          </TabsContent>
          <TabsContent value="events">
            <div className="space-y-4">
              <SeedEventsPanel />
              <EventEditor />
            </div>
          </TabsContent>
          <TabsContent value="dialogue">
            <DialogueEditor selectedStoryId={activeStoryId} />
          </TabsContent>
          <TabsContent value="assets">
            <div className="space-y-4">
              <AssetLibrary />
              <div style={{ borderTop: "1px solid hsl(252 10% 20%)", paddingTop: 12 }}>
                <BulkImport onImportComplete={() => qc.invalidateQueries({ queryKey: ["sceneAssets"] })} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="stories">
           <div className="space-y-4">
             <RentalDebugPanel />
             <LoadRentalButton />
             <StoryManager />
           </div>
          </TabsContent>
          <TabsContent value="settings">
            <GameSettings />
          </TabsContent>
          <TabsContent value="ai">
            <div className="min-h-[500px] flex flex-col">
              <AIAdminAssistant selectedStoryId={activeStoryId} />
            </div>
          </TabsContent>
          <TabsContent value="validate">
            <ValidationPanel selectedStoryId={activeStoryId} />
          </TabsContent>
          <TabsContent value="runtime">
            <RuntimeSimulator selectedStoryId={activeStoryId} />
          </TabsContent>
          <TabsContent value="graph">
            <EventGraphVisualizer selectedStoryId={activeStoryId} />
          </TabsContent>
          <TabsContent value="snapshots">
            <SnapshotManager selectedStoryId={activeStoryId} />
          </TabsContent>
          <TabsContent value="tools">
            <StoryTools selectedStoryId={activeStoryId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}