import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Video, Lock, Sparkles, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <Video className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Vaultly</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Save Videos from Anywhere
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Organize your favorite videos from YouTube, TikTok, Instagram, and more. 
            All in one beautiful, secure place.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start Free
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">One-Tap Save</h3>
            <p className="text-muted-foreground">
              Share from any app or copy a link. Vaultly automatically detects and saves your videos.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">AI Organization</h3>
            <p className="text-muted-foreground">
              Smart suggestions automatically organize your videos into folders with relevant tags.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Private & Secure</h3>
            <p className="text-muted-foreground">
              Your library is encrypted and private. Share only what you want with personalized links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
