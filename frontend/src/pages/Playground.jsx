import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";
import { ArrowRight, BookOpen, Download, ExternalLink, Gamepad2, Music2, Play } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { fetchPlayground, trackAnalyticsEvent } from "../api";

const MUSIC_MAX = 10;
const FREEBIE_MAX = 6;
const GAME_MAX = 4;

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

function MusicTrackRow({ item, index, onDownload }) {
  return (
    <div className="playground-track-row" data-testid={`playground-track-${item.id}`}>
      <span className="playground-track-num">{index + 1}</span>
      {item.thumbnail
        ? <img src={item.thumbnail} alt={item.title} className="playground-track-thumb" data-testid={`playground-track-thumb-${item.id}`} />
        : <span className="playground-track-icon"><Music2 size={18} /></span>
      }
      <div className="playground-track-info">
        <strong data-testid={`playground-track-title-${item.id}`}>{item.title}</strong>
        {item.description && <span data-testid={`playground-track-desc-${item.id}`}>{item.description}</span>}
      </div>
      <button className="playground-track-btn" onClick={() => onDownload(item)} data-testid={`playground-track-btn-${item.id}`}>
        <Download size={14} /> Download Free
      </button>
    </div>
  );
}

function ThumbnailCard({ item, onDownload, btnLabel = "Download Free" }) {
  return (
    <article className="playground-thumb-card" data-testid={`playground-item-${item.id}`}>
      {item.thumbnail
        ? <img src={item.thumbnail} alt={item.title} className="playground-thumb-img" data-testid={`playground-item-thumb-${item.id}`} />
        : <div className="playground-thumb-placeholder" data-testid={`playground-item-placeholder-${item.id}`}>
            {item.category === "freebie" ? <BookOpen size={32} /> : <Gamepad2 size={32} />}
          </div>
      }
      <div className="playground-thumb-body">
        <h3 data-testid={`playground-item-title-${item.id}`}>{item.title}</h3>
        <p data-testid={`playground-item-desc-${item.id}`}>{item.description}</p>
        <button className="primary-btn" onClick={() => onDownload(item)} data-testid={`playground-item-btn-${item.id}`}>
          <Download size={14} /> {btnLabel}
        </button>
      </div>
    </article>
  );
}

export default function Playground() {
  useSEO({ title: "Evolvix Playground — Creative Experiments & AI Tools", description: "Explore interactive AI experiments, tools, and creative prototypes from the Evolvix product lab.", path: "/playground" });
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

  const musicItems = items.filter((i) => i.category === "music").slice(0, MUSIC_MAX);
  const freebieItems = items.filter((i) => i.category === "freebie").slice(0, FREEBIE_MAX);
  const gameItems = items.filter((i) => i.category === "game").slice(0, GAME_MAX);

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
        <p className="playground-block-sub">Original AI-assisted music from Evolvix creators — follow the channels for new releases, or sign in to download individual tracks below.</p>

        {musicPreviews.length > 0 && (
          <div className="audio-preview-grid" data-testid="playground-artist-grid">
            {musicPreviews.map((track, i) => <ArtistCard key={track.id} track={track} index={i} />)}
          </div>
        )}

        {musicItems.length > 0 ? (
          <div className="playground-tracklist" data-testid="playground-tracklist">
            <div className="playground-tracklist-header">
              <span>Tracks available to download</span>
              <span>{musicItems.length} / {MUSIC_MAX}</span>
            </div>
            {musicItems.map((item, i) => (
              <MusicTrackRow key={item.id} item={item} index={i} onDownload={handleDownload} />
            ))}
          </div>
        ) : (
          <div className="playground-coming-soon" style={{ marginTop: 24 }} data-testid="playground-music-empty">
            <span className="playground-coming-badge">Tracks Coming Soon</span>
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
          <div className="playground-thumb-grid" data-testid="playground-freebies-grid">
            {freebieItems.map((item) => <ThumbnailCard key={item.id} item={item} onDownload={handleDownload} />)}
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
            <div className="playground-thumb-grid playground-thumb-grid--games" data-testid="playground-games-grid">
              {gameItems.map((item) => <ThumbnailCard key={item.id} item={item} onDownload={handleDownload} btnLabel="Play Now" />)}
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
