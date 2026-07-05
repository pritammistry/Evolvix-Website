import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Download, ExternalLink, Gamepad2, Music2, Play } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { fetchPlayground, trackAnalyticsEvent } from "../api";

function ArtistCard({ track, index }) {
  return (
    <article className="audio-preview-card" data-testid={`playground-artist-card-${index}`}>
      <span data-testid={`playground-artist-mood-${index}`}>{track.mood}</span>
      <h3 data-testid={`playground-artist-title-${index}`}>{track.title}</h3>
      <p data-testid={`playground-artist-desc-${index}`}>{track.description}</p>
      <div className="audio-preview-links" data-testid={`playground-artist-links-${index}`}>
        <a className="audio-preview-placeholder" href={track.audio_url} target="_blank" rel="noopener noreferrer" data-testid={`playground-artist-youtube-${index}`}>
          <Play size={16} /> Open on YouTube
        </a>
        {track.secondary_url && (
          <a className="audio-preview-placeholder" href={track.secondary_url} target="_blank" rel="noopener noreferrer" data-testid={`playground-artist-secondary-${index}`}>
            <ExternalLink size={16} /> {track.secondary_label || "More"}
          </a>
        )}
      </div>
    </article>
  );
}

function DownloadCard({ item, onDownload }) {
  return (
    <article className="ecosystem-card playground-prompt-card" data-testid={`playground-item-${item.id}`}>
      {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="playground-item-thumb" data-testid={`playground-item-thumb-${item.id}`} />}
      {item.category === "music" && <Music2 size={26} />}
      {item.category === "freebie" && <BookOpen size={26} />}
      {item.category === "game" && <Gamepad2 size={26} />}
      <h3 data-testid={`playground-item-title-${item.id}`}>{item.title}</h3>
      <p data-testid={`playground-item-desc-${item.id}`}>{item.description}</p>
      <button className="primary-btn" onClick={() => onDownload(item)} data-testid={`playground-item-btn-${item.id}`}>
        <Download size={15} /> Download Free
      </button>
    </article>
  );
}

export default function Playground() {
  const { content } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  const musicPreviews = (content.music_previews || []).filter((p) => p.visible !== false);

  const load = useCallback(async () => {
    try {
      const { data } = await fetchPlayground();
      setItems(data.items || []);
    } catch {
      // silently fail — page still renders with artist cards
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const musicItems = items.filter((i) => i.category === "music");
  const freebieItems = items.filter((i) => i.category === "freebie");
  const gameItems = items.filter((i) => i.category === "game");

  function handleDownload(item) {
    if (!user) {
      navigate("/login?next=/playground");
      return;
    }
    trackAnalyticsEvent({ event_type: "playground_download", label: item.title, section_id: item.category, product_id: item.id }).catch(() => {});
    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="section page-section" data-testid="playground-page">
      <SectionHeader
        eyebrow="Evolvix Playground"
        title="Explore. Learn. Play."
        text="Free AI music, prompt books, and interactive experiences — open to everyone, yours to keep once you sign in."
      />

      {/* AI Music */}
      <div className="playground-block" data-testid="playground-music-section">
        <div className="playground-block-header">
          <Music2 size={22} />
          <h2>AI Music</h2>
        </div>
        <p className="playground-block-sub">Original AI-assisted music from Evolvix creators — follow the channels for new releases.</p>
        {musicPreviews.length > 0 && (
          <div className="audio-preview-grid" data-testid="playground-artist-grid">
            {musicPreviews.map((track, i) => <ArtistCard key={track.id} track={track} index={i} />)}
          </div>
        )}
        {musicItems.length > 0 ? (
          <>
            <p className="playground-block-sub" style={{ marginTop: 8 }}>
              {user ? "You're signed in — click Download Free to get a track." : "Sign in to download these tracks for free."}
            </p>
            <div className="playground-prompts-grid" data-testid="playground-music-downloads">
              {musicItems.map((item) => <DownloadCard key={item.id} item={item} onDownload={handleDownload} />)}
            </div>
          </>
        ) : (
          <div className="playground-coming-soon" data-testid="playground-music-empty">
            <span className="playground-coming-badge">Coming Soon</span>
            <p>Downloadable music tracks are being added here — check back soon.</p>
          </div>
        )}
      </div>

      {/* Freebie Books */}
      <div className="playground-block" data-testid="playground-freebies-section">
        <div className="playground-block-header">
          <BookOpen size={22} />
          <h2>Free Prompt Books</h2>
        </div>
        <p className="playground-block-sub">
          {user ? "You're signed in — click Download Free to get your pack." : "Sign in to claim your free pack — no payment needed, just an account."}
        </p>
        {freebieItems.length > 0 ? (
          <div className="playground-prompts-grid" data-testid="playground-freebies-grid">
            {freebieItems.map((item) => <DownloadCard key={item.id} item={item} onDownload={handleDownload} />)}
          </div>
        ) : (
          <div className="playground-coming-soon" data-testid="playground-freebies-empty">
            <span className="playground-coming-badge">Coming Soon</span>
            <p>Free prompt books and resources are being added here — check back soon.</p>
          </div>
        )}
      </div>

      {/* Fun AI Games */}
      <div className="playground-block" data-testid="playground-games-section">
        <div className="playground-block-header">
          <Gamepad2 size={22} />
          <h2>Fun AI Games</h2>
        </div>
        {gameItems.length > 0 ? (
          <>
            <p className="playground-block-sub">
              {user ? "You're signed in — click to launch." : "Sign in to access these interactive experiences."}
            </p>
            <div className="playground-prompts-grid" data-testid="playground-games-grid">
              {gameItems.map((item) => <DownloadCard key={item.id} item={item} onDownload={handleDownload} />)}
            </div>
          </>
        ) : (
          <div className="playground-coming-soon" data-testid="playground-games-coming-soon">
            <span className="playground-coming-badge">Coming Soon</span>
            <p>Interactive AI-powered experiences are being built here. Check back soon for games, quizzes, and creative tools.</p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="related-panel" data-testid="playground-cta-panel">
        <h2>Want something built specifically for you?</h2>
        <Link to="/shop" className="secondary-btn" data-testid="playground-shop-link">Browse Store</Link>
        <Link to="/contact" className="primary-btn" data-testid="playground-contact-cta">Talk to Us <ArrowRight size={18} /></Link>
      </div>
    </section>
  );
}
