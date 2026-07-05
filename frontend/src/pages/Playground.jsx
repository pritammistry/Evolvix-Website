import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, ExternalLink, Gamepad2, Music2, Play } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";

const PROMPT_PACKS = [
  {
    id: "students",
    title: "For Students",
    description: "AI prompts for studying smarter, writing better assignments, researching faster, and building real academic confidence.",
  },
  {
    id: "parents",
    title: "For Parents",
    description: "Everyday AI prompts to help your family — homework support, activity planning, and simple digital guidance with no jargon.",
  },
  {
    id: "professionals",
    title: "For Professionals & Job Seekers",
    description: "AI prompts for job applications, interview prep, resume writing, productivity, and pushing your career forward.",
  },
  {
    id: "creators",
    title: "For Content Creators",
    description: "Prompts for social media, scripting, caption writing, content ideation, and building a consistent audience with AI.",
  },
];

function MusicCard({ track, index }) {
  return (
    <article className="audio-preview-card" data-testid={`playground-music-card-${index}`}>
      <span data-testid={`playground-music-mood-${index}`}>{track.mood}</span>
      <h3 data-testid={`playground-music-title-${index}`}>{track.title}</h3>
      <p data-testid={`playground-music-desc-${index}`}>{track.description}</p>
      <div className="audio-preview-links" data-testid={`playground-music-links-${index}`}>
        <a className="audio-preview-placeholder" href={track.audio_url} target="_blank" rel="noopener noreferrer" data-testid={`playground-music-youtube-${index}`}>
          <Play size={16} /> Open on YouTube
        </a>
        {track.secondary_url && (
          <a className="audio-preview-placeholder" href={track.secondary_url} target="_blank" rel="noopener noreferrer" data-testid={`playground-music-secondary-${index}`}>
            <ExternalLink size={16} /> {track.secondary_label || "More"}
          </a>
        )}
      </div>
    </article>
  );
}

function PromptPackCard({ pack, onAccess, isLoggedIn }) {
  return (
    <article className="ecosystem-card playground-prompt-card" data-testid={`playground-prompt-card-${pack.id}`}>
      <BookOpen size={28} />
      <h3 data-testid={`playground-prompt-title-${pack.id}`}>{pack.title}</h3>
      <p data-testid={`playground-prompt-desc-${pack.id}`}>{pack.description}</p>
      <button className="primary-btn" onClick={() => onAccess(pack.id)} data-testid={`playground-prompt-btn-${pack.id}`}>
        {isLoggedIn ? "Browse Packs" : "Get Free Access"}
      </button>
    </article>
  );
}

export default function Playground() {
  const { content } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const musicPreviews = (content.music_previews || []).filter((p) => p.visible !== false);

  function handleGetAccess() {
    if (!user) {
      navigate("/login?next=/playground");
    } else {
      navigate("/shop");
    }
  }

  return (
    <section className="section page-section" data-testid="playground-page">
      <SectionHeader
        eyebrow="Evolvix Playground"
        title="Explore. Learn. Play."
        text="Free AI music, prompt packs, and interactive experiences — open to everyone, yours to keep once you sign in."
      />

      {/* AI Music */}
      <div className="playground-block" data-testid="playground-music-section">
        <div className="playground-block-header">
          <Music2 size={22} />
          <h2>AI Music</h2>
        </div>
        <p className="playground-block-sub">Original AI-assisted music from Evolvix creators — follow the channels for new releases.</p>
        <div className="audio-preview-grid">
          {musicPreviews.map((track, i) => (
            <MusicCard key={track.id} track={track} index={i} />
          ))}
        </div>
      </div>

      {/* Free Prompt Books */}
      <div className="playground-block" data-testid="playground-prompts-section">
        <div className="playground-block-header">
          <BookOpen size={22} />
          <h2>Free Prompt Books</h2>
        </div>
        <p className="playground-block-sub">
          {user
            ? "You're signed in — browse all available packs in the store."
            : "Sign in to claim your free pack — no payment needed, just an account."}
        </p>
        <div className="playground-prompts-grid">
          {PROMPT_PACKS.map((pack) => (
            <PromptPackCard key={pack.id} pack={pack} onAccess={handleGetAccess} isLoggedIn={!!user} />
          ))}
        </div>
      </div>

      {/* Fun AI Games */}
      <div className="playground-block" data-testid="playground-games-section">
        <div className="playground-block-header">
          <Gamepad2 size={22} />
          <h2>Fun AI Games</h2>
        </div>
        <div className="playground-coming-soon" data-testid="playground-games-coming-soon">
          <span className="playground-coming-badge">Coming Soon</span>
          <p>Interactive AI-powered experiences are being built here. Check back soon for games, quizzes, and creative tools.</p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="related-panel" data-testid="playground-cta-panel">
        <h2>Want something built specifically for you?</h2>
        <Link to="/contact" className="secondary-btn" data-testid="playground-browse-link">Browse Free Packs</Link>
        <Link to="/contact" className="primary-btn" data-testid="playground-contact-cta">Talk to Us <ArrowRight size={18} /></Link>
      </div>
    </section>
  );
}
